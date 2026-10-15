#!/usr/bin/env bash
# Local Supabase in Docker for development. Usage: pnpm local <start|stop|reset|env|owner|status>.
# Never touches the hosted project. Never prints keys or the contents of .env files.
set -euo pipefail

cd "$(dirname "$0")/.."

# Services the apps do not use; leaving them out saves about 600 MB of memory.
SKIP="edge-runtime,logflare,vector,imgproxy,supavisor"
DB_CONTAINER="supabase_db_smart-app-ph"
APPS="storefront dashboard"

sb() { pnpm exec supabase "$@"; }

status_value() {
  # Reads one value (e.g. API_URL) from the running local stack.
  sb status -o env 2>/dev/null | grep "^$1=" | head -n 1 | cut -d= -f2- | tr -d '"'
}

sql() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"
}

env_local() {
  local url key
  url="$(status_value API_URL)"
  key="$(status_value PUBLISHABLE_KEY)"
  if [ -z "$url" ] || [ -z "$key" ]; then
    echo "The local stack is not running. Run: pnpm local start" >&2
    exit 1
  fi
  for app in $APPS; do
    local dir="apps/$app" prefix
    if [ "$app" = "storefront" ]; then prefix="NEXT_PUBLIC_"; else prefix="VITE_"; fi
    # Keep the live file once, so `pnpm local env live` can put it back.
    if [ -f "$dir/.env.local" ] && [ ! -f "$dir/.env.live.local" ] && ! grep -q "^# local-supabase" "$dir/.env.local"; then
      mv "$dir/.env.local" "$dir/.env.live.local"
    fi
    {
      echo "# local-supabase (written by pnpm local env local; pnpm local env live restores the live file)"
      echo "${prefix}SUPABASE_URL=$url"
      echo "${prefix}SUPABASE_PUBLISHABLE_KEY=$key"
    } > "$dir/.env.local"
    echo "apps/$app now uses the local database."
  done
  echo "Restart pnpm dev so the apps pick it up."
}

env_live() {
  for app in $APPS; do
    local dir="apps/$app"
    if [ -f "$dir/.env.live.local" ]; then
      mv "$dir/.env.live.local" "$dir/.env.local"
      echo "apps/$app now uses the live database."
    else
      echo "apps/$app: no saved live file (apps/$app/.env.live.local); nothing changed."
    fi
  done
  echo "Restart pnpm dev so the apps pick it up."
}

case "${1:-}" in
  start)
    sb start -x "$SKIP" > /dev/null
    echo
    echo "Studio (tables, SQL):  http://localhost:54323"
    echo "Mail (6-digit codes):  http://localhost:54324"
    echo "Next: pnpm local env local, then pnpm dev"
    ;;
  stop)
    sb stop
    echo "Stopped. Your local data is kept for the next start."
    ;;
  status)
    sb status -o env 2>/dev/null | grep -E '^(API_URL|DB_URL|STUDIO_URL|MAILPIT_URL)=' || echo "Not running."
    ;;
  reset)
    # Rebuilds the local database from supabase/migrations, then seed.sql adds the demo shops.
    sb db reset --local
    echo "Local database rebuilt; demo shops juans-cafe and tala-apparel are back. Sign-ups were cleared."
    ;;
  demo)
    for slug in juans-cafe tala-apparel; do
      sql -c "select private.demo_reset('$slug');" > /dev/null
    done
    echo "Demo orders and customers refreshed for juans-cafe and tala-apparel."
    ;;
  owner)
    email="${2:-}"
    slug="${3:-}"
    if [ -z "$email" ] || [ -z "$slug" ]; then
      echo "Usage: pnpm local owner <email you signed up with locally> <juans-cafe|tala-apparel>" >&2
      exit 1
    fi
    linked="$(sql -t -A -v email="$email" -v slug="$slug" <<'SQL'
insert into public.tenant_members (tenant_id, user_id, role)
select t.id, u.id, 'owner'
from public.tenants t
join auth.users u on u.email = :'email'
where t.slug = :'slug'
  and not exists (select 1 from public.tenant_members m where m.user_id = u.id and m.status = 'active')
on conflict (tenant_id, user_id) do update set status = 'active'
returning 'ok';
SQL
)"
    if [ "$linked" != "ok" ]; then
      echo "Not linked. Check that you signed up locally with $email (code in http://localhost:54324)," >&2
      echo "that you stopped at the Setup screen (an account owns one shop), and that the slug is right." >&2
      exit 1
    fi
    echo "Linked $email as the owner of $slug."
    ;;
  env)
    case "${2:-}" in
      local) env_local ;;
      live) env_live ;;
      *) echo "Usage: pnpm local env <local|live>" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "Usage: pnpm local <start|stop|status|reset|demo|owner|env>" >&2
    echo "See docs/local-dev.md." >&2
    exit 1
    ;;
esac
