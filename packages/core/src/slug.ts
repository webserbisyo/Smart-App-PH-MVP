/**
 * A link name suggested from a shop name: lowercase, accents removed, anything else becomes single hyphens,
 * cut to 40 characters. "Juan's Café" → "juans-cafe". The owner can still edit it; `Slug` decides if it is valid.
 */
export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}
