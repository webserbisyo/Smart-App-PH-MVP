// Philippine mobile numbers. Stored as +639XXXXXXXXX (PhPhone); typed however people type them.

/** `0917 123 4567`, `917-123-4567`, `+63 917 123 4567`, `63 917…` → `+639171234567`; anything else → `null`. */
export function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(digits);
  return match?.[1] ? `+63${match[1]}` : null;
}

/** `+639171234567` → `0917 123 4567`. Anything else comes back as it is. */
export function formatPhPhone(phone: string): string {
  const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(phone);
  if (!match) return phone;
  const [, prefix = '', middle = '', last = ''] = match;
  return `0${prefix} ${middle} ${last}`;
}
