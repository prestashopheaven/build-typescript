/**
 * NOTICE OF LICENSE
 *
 * This source file is subject to the MIT License
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/MIT
 *
 * @author    prestahaven.com
 * @copyright Since 2026 George van Engers
 * @license   https://opensource.org/licenses/MIT MIT License
 */

/*
 * Lint rules of the module JavaScript (package prestashopheaven/build-typescript; npm run lint, also part of npm run
 * build). The module's _dev/eslint.config.mjs calls it with its own location:
 *
 *   import {eslintConfig} from '../vendor/prestashopheaven/build-typescript/eslint.config.mjs';
 *
 *   export default await eslintConfig(import.meta.url, (name) => import(name));
 *
 * ESLint runs from the module directory: the patterns below are relative to it. The rules mirror the conventions: no
 * console output (validator warns on console.log), strict equality, no jQuery in front code (TPL-10). Two modes, the
 * same as build.mjs:
 *
 *   typescript  the TypeScript sources and the tests in _dev (typescript-eslint); front code without window.$ and
 *               window.jQuery (only lib/page-events.ts listens to jQuery-only events)
 *   plain       the hand-written scripts in views/js and the tests in _dev/tests (no typescript-eslint needed); front
 *               scripts without window.$ (jQuery-only events of other modules excepted, TPL-18); back-office scripts
 *               (admin-*.js, admin/) may use jQuery
 *
 * The npm packages are the module's own (_dev/node_modules), loaded with the module's import function.
 */

import {devDirOf, isTypeScript} from './mode.mjs';
import {importerFor} from './build.mjs';

/** The default export of a loaded module (CommonJS or ESM). */
function defaultOf(module) {
  return module.default ?? module;
}

/** Rules both modes share. */
const COMMON_RULES = {
  'no-console': 'error',
  eqeqeq: ['error', 'always'],
  'prefer-const': 'error',
};

/** Parameters a signature needs but the code does not use start with _ (test doubles, callbacks). */
const UNUSED = ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}];

/** The rule against jQuery in front code. */
function noJQuery(...properties) {
  const messages = {
    $: 'Front JS is vanilla JS (TPL-10).',
    jQuery: 'Front JS is vanilla JS (TPL-10); only lib/page-events.ts listens to jQuery-only events.',
  };

  return {'no-restricted-properties': ['error', ...properties.map((property) => ({object: 'window', property, message: messages[property]}))]};
}

/**
 * The flat config for the module whose _dev/eslint.config.mjs has the URL devUrl.
 *
 * @param {string|URL} devUrl import.meta.url of the module's _dev/eslint.config.mjs (or the _dev folder)
 * @param {(name: string) => Promise<object>} [load] the module's import function, for the npm packages
 * @param {{mode?: 'typescript'|'plain'}} [options] the mode; by default from the files, like build.mjs
 */
export async function eslintConfig(devUrl, load, options = {}) {
  const devDir = devDirOf(devUrl);
  const importModule = load ?? importerFor(devDir);
  const typescript = (options.mode ?? (isTypeScript(devDir) ? 'typescript' : 'plain')) === 'typescript';
  const js = defaultOf(await importModule('@eslint/js'));
  const {defineConfig} = await importModule('eslint/config');
  const globals = defaultOf(await importModule('globals'));

  if (typescript) {
    const tseslint = defaultOf(await importModule('typescript-eslint'));

    return defineConfig(
      // views/js/vendor/: third-party libraries, unmodified, with their license (TST-27).
      {ignores: ['**/node_modules/**', '**/.cache/**', '_dev/*.mjs', 'views/js/vendor/**']},
      js.configs.recommended,
      tseslint.configs.recommended,
      {
        files: ['**/*.ts', '**/*.js'],
        languageOptions: {globals: {...globals.browser}},
        rules: {
          ...COMMON_RULES,
          '@typescript-eslint/no-explicit-any': 'error',
          '@typescript-eslint/no-unused-vars': UNUSED,
        },
      },
      {
        files: ['_dev/front/**/*.ts'],
        rules: noJQuery('$', 'jQuery'),
      },
      {
        files: ['_dev/tests/**'],
        languageOptions: {globals: {...globals.browser, ...globals.node}},
      },
    );
  }

  return defineConfig(
    // views/js/vendor/: third-party libraries, unmodified, with their license (TST-27).
    {ignores: ['**/node_modules/**', '**/.cache/**', '_dev/*.mjs', 'views/js/vendor/**']},
    js.configs.recommended,
    {
      files: ['**/*.js'],
      languageOptions: {ecmaVersion: 2020, sourceType: 'script', globals: {...globals.browser}},
      rules: {
        ...COMMON_RULES,
        'no-var': 'error',
        'no-unused-vars': UNUSED,
      },
    },
    {
      // Front scripts: vanilla JS (TPL-10). Back-office scripts (admin-*.js, admin/) may use jQuery.
      files: ['views/js/**/*.js'],
      ignores: ['views/js/admin*.js', 'views/js/admin/**'],
      rules: noJQuery('$'),
    },
    {
      files: ['**/tests/**/*.js'],
      languageOptions: {sourceType: 'module', globals: {...globals.browser, ...globals.node}},
    },
  );
}
