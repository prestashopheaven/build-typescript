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
 * Vitest for the module JavaScript (package prestashopheaven/build-typescript; TST-20..29): tests in _dev/tests/, run
 * in jsdom (a browser DOM in Node). The module's _dev/vitest.config.mjs calls it with its own location:
 *
 *   import {vitestConfig} from '../vendor/prestashopheaven/build-typescript/vitest.config.mjs';
 *
 *   export default vitestConfig(import.meta.url);
 *
 * The root is the module directory, so the tests can load the hand-written scripts of views/js/ the same way as the
 * TypeScript sources of _dev/front and _dev/back.
 *
 * Coverage: 100% lines, statements, functions and branches, per file. Covered are the TypeScript sources when there
 * are any (recipe typescript), otherwise every script in views/js/ except the third-party libraries in views/js/vendor/
 * (TST-27). build.mjs checks the summary once more, so a file that no test loads fails too.
 *
 * Only Node built-ins here: Vite bundles the config file with this one, and the npm packages are the module's own.
 */

import path from 'node:path';
import {devDirOf, isTypeScript} from './mode.mjs';

/**
 * The Vitest config for the module whose _dev/vitest.config.mjs has the URL devUrl (what defineConfig() of
 * vitest/config would return: that is the identity function).
 *
 * @param {string|URL} devUrl import.meta.url of the module's _dev/vitest.config.mjs (or the _dev folder)
 */
export function vitestConfig(devUrl) {
  const devDir = devDirOf(devUrl);
  const moduleDir = path.dirname(devDir);
  const typescript = isTypeScript(devDir);

  return {
    root: moduleDir,
    cacheDir: path.join(devDir, '.cache', 'vite'),
    test: {
      environment: 'jsdom',
      include: ['_dev/tests/**/*.test.{js,ts}'],
      exclude: ['**/node_modules/**'],
      // Removes listeners and PrestaShop globals after every test (scripts run again per test).
      setupFiles: ['_dev/tests/support/setup.js'],
      // Every test starts clean: no mocks, stubbed globals or fake timers leak into the next one.
      restoreMocks: true,
      unstubGlobals: true,
      clearMocks: true,
      coverage: {
        // Istanbul, not v8: it counts every operand of && / || / ?? and every optional chain as a branch, so
        // 100% branches really means every scenario ran (v8 skips most of those).
        provider: 'istanbul',
        include: typescript ? ['_dev/front/**/*.ts', '_dev/back/**/*.ts'] : ['views/js/**/*.js'],
        exclude: ['**/*.d.ts', '**/node_modules/**', 'views/js/vendor/**'],
        reporter: ['text', 'json-summary'],
        reportsDirectory: path.join(devDir, '.cache', 'coverage'),
        thresholds: {perFile: true, lines: 100, statements: 100, functions: 100, branches: 100},
      },
    },
  };
}
