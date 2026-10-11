// Breaks: @typescript-eslint/no-unsafe-* (JSON.parse returns any).
export const value: string = JSON.parse('"text"');
