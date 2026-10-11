// Proves each rule in eslint.config.js fires on a file that breaks it (tooling/lint-fixtures/).
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const root = `${process.cwd()}/..`;
const fixtures = `${root}/tooling/lint-fixtures`;

let eslint: ESLint;
beforeAll(() => {
  // ignore: false because the fixtures are ignored by normal lint.
  eslint = new ESLint({ cwd: root, ignore: false });
});

async function ruleHits(fixture: string, ruleId: string): Promise<number> {
  const [result] = await eslint.lintFiles([`${fixtures}/${fixture}`]);
  if (result === undefined) throw new Error(`No lint result for ${fixture}`);
  const fatal = result.messages.find((message) => message.fatal === true);
  if (fatal !== undefined) throw new Error(`${fixture}: ${fatal.message}`);
  return result.messages.filter((message) => message.ruleId === ruleId).length;
}

describe('import rules (system paper 8.3)', () => {
  it('only packages/api imports @supabase/*', async () => {
    expect(await ruleHits('apps/storefront/src/imports-supabase.ts', 'no-restricted-imports')).toBe(1);
    expect(await ruleHits('packages/api/src/imports-supabase.ts', 'no-restricted-imports')).toBe(0);
  });

  it('the storefront does not import the dashboard', async () => {
    expect(await ruleHits('apps/storefront/src/imports-dashboard.ts', 'no-restricted-imports')).toBe(2);
  });

  it('the dashboard does not import the storefront', async () => {
    expect(await ruleHits('apps/dashboard/src/imports-storefront.ts', 'no-restricted-imports')).toBe(2);
  });

  it('packages/core has no React, Supabase, ui or api', async () => {
    expect(await ruleHits('packages/core/src/imports-forbidden.ts', 'no-restricted-imports')).toBe(5);
  });

  it('packages/ui has no Supabase and no api', async () => {
    expect(await ruleHits('packages/ui/src/imports-forbidden.ts', 'no-restricted-imports')).toBe(2);
  });

  it('dashboard features do not import each other, but may import inside themselves', async () => {
    const fixture = 'apps/dashboard/src/features/home/screens/imports-other-feature.ts';
    expect(await ruleHits(fixture, 'no-restricted-imports')).toBe(3);
  });
});

describe('type safety rules', () => {
  it('no any', async () => {
    expect(await ruleHits('misc/explicit-any.ts', '@typescript-eslint/no-explicit-any')).toBe(1);
  });

  it('no unsafe use of any', async () => {
    expect(await ruleHits('misc/unsafe.ts', '@typescript-eslint/no-unsafe-assignment')).toBe(1);
  });

  it('no @ts-ignore and no @ts-expect-error', async () => {
    expect(await ruleHits('misc/ts-comments.ts', '@typescript-eslint/ban-ts-comment')).toBe(2);
  });

  it('no type casts, but as const is allowed', async () => {
    expect(await ruleHits('misc/type-assertion.ts', '@typescript-eslint/consistent-type-assertions')).toBe(1);
  });
});
