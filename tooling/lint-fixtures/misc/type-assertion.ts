// Breaks: @typescript-eslint/consistent-type-assertions (never cast). `as const` stays allowed.
const raw: unknown = 'text';
export const cast = raw as string;
export const statuses = ['placed', 'ready'] as const;
