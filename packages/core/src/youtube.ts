/**
 * Extracts a YouTube video ID (11 characters) from a URL or raw ID string.
 * Supports youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/shorts/, etc.
 */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );

  return match?.[1] ?? null;
}
