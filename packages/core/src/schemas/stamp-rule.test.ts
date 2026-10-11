import { describe, expect, it } from 'vitest';

import { stampRule } from '../test/samples';

import { StampRule } from './stamp-rule';

describe('stamp-rule', () => {
  it('a valid StampRule parses', () => {
    expect(StampRule.parse(stampRule)).toEqual(stampRule);
  });
});
