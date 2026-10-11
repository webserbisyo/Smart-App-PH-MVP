# Lint fixtures

Each file here breaks one lint rule on purpose. `tooling/lint-rules.test.ts` lints them and
expects the rule to fire. The folders mirror the repo, so the folder-scoped import rules in
`eslint.config.js` apply. This folder is ignored by normal lint and by TypeScript.
