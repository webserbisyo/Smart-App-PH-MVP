// CSV text for spreadsheets (RFC 4180): commas between cells, CRLF between rows.

/** Cells starting with one of these are formulas to Excel, Sheets and LibreOffice. */
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/** One cell: a leading `'` keeps a formula as text; quotes when the cell holds a quote, comma or line break. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Rows of text cells → CSV text. Adds no byte order mark; the file download adds one for Excel. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
