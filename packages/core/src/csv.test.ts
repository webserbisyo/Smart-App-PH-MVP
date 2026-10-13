import { describe, expect, it } from 'vitest';

import { csvCell, toCsv } from './csv';

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(toCsv([['Order', 'Total'], ['#001', '120.00']])).toBe('Order,Total\r\n#001,120.00');
    expect(toCsv([])).toBe('');
  });

  it('quotes cells with commas, quotes and line breaks', () => {
    expect(csvCell('2x Iced Latte, Large')).toBe('"2x Iced Latte, Large"');
    expect(csvCell('the "big" one')).toBe('"the ""big"" one"');
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('keeps formulas as text with a leading apostrophe', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+639171234567')).toBe("'+639171234567");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\t=1')).toBe("'\t=1");
    expect(csvCell('a=b')).toBe('a=b');
  });

  it('keeps Filipino characters as they are', () => {
    expect(toCsv([['Peña, Ibañez', 'Señor Ñoño']])).toBe('"Peña, Ibañez",Señor Ñoño');
  });
});
