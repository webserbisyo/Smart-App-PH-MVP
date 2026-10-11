// Flat config for the whole repo. Every package runs `eslint .` and picks up this file.
// The import rules below enforce the folder map in CLAUDE.md (system paper 8.3).
// They are proven by tooling/lint-rules.test.ts against tooling/lint-fixtures/.
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/** Dashboard feature areas from system paper 8.3. A new area is added here too. */
const DASHBOARD_FEATURES = ['home', 'orders', 'products', 'customers', 'reports', 'settings', 'auth'];

/** The fixture copy of a folder, so each rule can be proven on a broken file. */
const FIXTURES = 'tooling/lint-fixtures';
const scope = (glob) => [glob, `${FIXTURES}/${glob}`];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NO_SUPABASE = {
  group: ['@supabase/*'],
  message: 'Only packages/api may import Supabase.',
};
const NO_REACT = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'packages/core has no React.',
};
const NO_SMARTAPP_UI = {
  group: ['@smartapp/ui', '@smartapp/ui/*'],
  message: 'packages/core may not import @smartapp/ui.',
};
const NO_SMARTAPP_API = {
  group: ['@smartapp/api', '@smartapp/api/*'],
  message: 'Only the apps may import @smartapp/api.',
};

/** Blocks imports of the other app, by package name or by path. */
function noOtherApp(other) {
  return [
    { group: [`@smartapp/${other}`, `@smartapp/${other}/*`], message: 'Apps never import each other.' },
    {
      regex: `(^|/)(apps/)?${other}/src(/|$)|(^|/)apps/${other}(/|$)`,
      message: 'Apps never import each other.',
    },
  ];
}

/** Blocks a dashboard feature from reaching into another feature folder. */
function noOtherFeatures(own) {
  const others = DASHBOARD_FEATURES.filter((name) => name !== own).map(escape).join('|');
  const message = 'Dashboard features never import each other. Move shared code to packages/ui or packages/core.';
  return [
    // aliased or long relative paths: '@/features/orders', '../../features/orders/x'
    { regex: `(^|/)features/(${others})(/|$)`, message },
    // short relative paths from inside a feature: '../orders/x', '../../orders/x'
    { regex: `^(\\.\\./)+(${others})(/|$)`, message },
  ];
}

const restrict = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default defineConfig(
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/.next/**', '**/next-env.d.ts', '**/.turbo/**', 'reference/**', `${FIXTURES}/**`]),
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': true, 'ts-nocheck': true, 'ts-check': false },
      ],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },

  // Import rules (system paper 8.3). For each file only the last matching block applies,
  // so every block lists all the restrictions for its folder.
  { files: ['**/*.{ts,tsx,js,mjs,cjs}'], rules: restrict([NO_SUPABASE]) },
  { files: scope('packages/api/**'), rules: { 'no-restricted-imports': 'off' } },
  { files: scope('packages/core/**'), rules: restrict([NO_SUPABASE, NO_REACT, NO_SMARTAPP_UI, NO_SMARTAPP_API]) },
  { files: scope('packages/ui/**'), rules: restrict([NO_SUPABASE, NO_SMARTAPP_API]) },
  { files: scope('apps/storefront/**'), rules: restrict([NO_SUPABASE, ...noOtherApp('dashboard')]) },
  { files: scope('apps/dashboard/**'), rules: restrict([NO_SUPABASE, ...noOtherApp('storefront')]) },
  ...DASHBOARD_FEATURES.map((feature) => ({
    files: scope(`apps/dashboard/src/features/${feature}/**`),
    rules: restrict([NO_SUPABASE, ...noOtherApp('storefront'), ...noOtherFeatures(feature)]),
  })),
);
