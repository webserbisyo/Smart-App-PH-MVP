import { describe, expect, it } from 'vitest';

import { option, optionGroup } from '../test/samples';

import { Option, OptionGroup } from './option-group';

describe('option-group', () => {
  it('a valid Option parses', () => {
    expect(Option.parse(option)).toEqual(option);
  });
  it('a valid OptionGroup parses', () => {
    expect(OptionGroup.parse(optionGroup)).toEqual(optionGroup);
  });
  it('rejects maxSelect below minSelect', () => {
    expect(OptionGroup.safeParse({ ...optionGroup, minSelect: 3, maxSelect: 2 }).success).toBe(false);
  });
});
