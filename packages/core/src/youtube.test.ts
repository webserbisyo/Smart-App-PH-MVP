import { describe, expect, it } from 'vitest';

import { extractYoutubeId } from './youtube';

describe('extractYoutubeId', () => {
  it('accepts raw 11-char ID', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com/watch?v=', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be/', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed and shorts', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid inputs', () => {
    expect(extractYoutubeId('')).toBeNull();
    expect(extractYoutubeId('not a url')).toBeNull();
    expect(extractYoutubeId('https://google.com')).toBeNull();
    expect(extractYoutubeId('https://youtube.com/watch?v=too_short')).toBeNull();
  });
});
