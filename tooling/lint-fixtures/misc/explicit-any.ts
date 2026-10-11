// Breaks: @typescript-eslint/no-explicit-any.
export function first(list: any[]): unknown {
  return list[0];
}
