import { describe, expect, it } from 'vitest';

import { tenantMember } from '../test/samples';

import { TenantMember } from './tenant-member';

describe('tenant-member', () => {
  it('a valid TenantMember parses', () => {
    expect(TenantMember.parse(tenantMember)).toEqual(tenantMember);
  });
});
