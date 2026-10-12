function isRowKey(key: string): key is `${number}` {
  return /^\d+$/.test(key);
}

/**
 * A list index as a form path segment (`variants.${row(index)}.name`): React Hook Form paths are typed with
 * `${number}`, and lint keeps raw numbers out of template strings.
 */
export function row(index: number): `${number}` {
  const key = String(index);
  if (!isRowKey(key)) throw new Error(`Not a list index: ${key}`);
  return key;
}
