import { WORDS } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';

/** "Member" in member green. */
export function MemberBadge() {
  return <Badge className="bg-member-soft text-member-soft-foreground">{WORDS.dashboard.customers.member}</Badge>;
}
