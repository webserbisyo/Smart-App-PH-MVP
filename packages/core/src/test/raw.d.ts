// Vitest (Vite) loads `?raw` imports as the file's text. Used by tests that compare SQL with core lists.
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
