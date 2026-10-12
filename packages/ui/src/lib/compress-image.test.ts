import { describe, expect, it } from 'vitest';

import { IMAGE_SIZES, fitSize } from './compress-image';

describe('fitSize', () => {
  it('scales a phone photo down to 1600 px on the long edge', () => {
    expect(fitSize(4032, 3024, IMAGE_SIZES.photo)).toEqual({ sx: 0, sy: 0, sw: 4032, sh: 3024, width: 1600, height: 1200 });
    expect(fitSize(3024, 4032, IMAGE_SIZES.photo)).toMatchObject({ width: 1200, height: 1600 });
  });

  it('never upscales', () => {
    expect(fitSize(800, 600, IMAGE_SIZES.photo)).toMatchObject({ width: 800, height: 600 });
  });

  it('centre-crops a square for logos', () => {
    expect(fitSize(4000, 3000, IMAGE_SIZES.logo)).toEqual({ sx: 500, sy: 0, sw: 3000, sh: 3000, width: 512, height: 512 });
    expect(fitSize(300, 400, IMAGE_SIZES.logo)).toEqual({ sx: 0, sy: 50, sw: 300, sh: 300, width: 300, height: 300 });
  });

  it('keeps thumbs small and never zero', () => {
    expect(fitSize(1600, 1200, IMAGE_SIZES.thumb)).toMatchObject({ width: 400, height: 300 });
    expect(fitSize(10000, 1, IMAGE_SIZES.thumb)).toMatchObject({ width: 400, height: 1 });
  });
});
