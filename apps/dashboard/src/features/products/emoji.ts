const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const PICTOGRAPHIC = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** The last emoji typed into a field, so the field keeps exactly one; `null` when there is none. */
export function lastEmoji(text: string): string | null {
  const emoji = [...segmenter.segment(text)].map((part) => part.segment).filter((part) => PICTOGRAPHIC.test(part));
  return emoji.at(-1) ?? null;
}
