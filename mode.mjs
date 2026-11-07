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
 * Shared by build.mjs, eslint.config.mjs and vitest.config.mjs of prestashopheaven/build-typescript: where the
 * module's _dev/ folder is, and which of the two modes it has.
 *
 *   typescript  there are entries in _dev/front/ or _dev/back/ (recipe typescript)
 *   plain       no entries: the JavaScript is written by hand in views/js/ (optional part js-tests)
 *
 * The files of this package live in the module's vendor/ folder, so they never use their own location: the module's
 * _dev files pass their import.meta.url.
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** The folders with TypeScript entries. */
export const TARGETS = ['front', 'back'];

/** The _dev folder of a module, from the import.meta.url of a file directly in it (or the folder itself). */
export function devDirOf(devUrl) {
  const file = devUrl instanceof URL || String(devUrl).startsWith('file:') ? fileURLToPath(devUrl) : String(devUrl);

  return fs.existsSync(file) && fs.statSync(file).isDirectory() ? file : path.dirname(file);
}

/** Top-level entry files of a target folder (every *.ts, not *.d.ts), sorted. */
export function entriesOf(devDir, target) {
  const dir = path.join(devDir, target);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .sort()
    .map((file) => path.join(dir, file));
}

/** True when the module has TypeScript entries in _dev/front/ or _dev/back/. */
export function isTypeScript(devDir) {
  return TARGETS.some((target) => entriesOf(devDir, target).length > 0);
}
