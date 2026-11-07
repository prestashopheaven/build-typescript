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
 * Checks, tests and (for TypeScript) builds the module JavaScript (package prestashopheaven/build-typescript). The
 * module's _dev/build.mjs calls it with its own location:
 *
 *   import {build} from '../vendor/prestashopheaven/build-typescript/build.mjs';
 *
 *   await build(import.meta.url, (name) => import(name));
 *
 * Two modes, chosen by the files:
 *
 *   typescript  there are entries in front/ or back/ (recipe typescript): typecheck, lint, tests with
 *               coverage, then esbuild bundles every entry into ../views/js/<name>.js
 *   plain       no entries: the JavaScript is written by hand in ../views/js/; lint and tests with coverage
 *
 *   node build.mjs              everything above + build-manifest.json (npm run build)
 *   node build.mjs --typecheck  only the typecheck (npm run typecheck)
 *   node build.mjs --watch      typescript: rebuild on every change, without checks and manifest (npm run watch)
 *
 * Tests: _dev/tests/**\/*.test.{js,ts} with Vitest + jsdom (vitest.config.mjs). Coverage must be 100% for
 * lines, statements, functions and branches, per file, for every source file (TST-20..29). The summary is
 * checked here too: a source file without any test fails, even if Vitest would not report it. Third-party
 * libraries in ../views/js/vendor/<library>/ (with their license file, TST-27) are not linted, tested or hashed.
 *
 * TypeScript entries: every top-level *.ts file in front/ and back/ (not *.d.ts) becomes ../views/js/<name>.js;
 * code in subfolders (lib/, components/...) is imported by the entries. The output is one readable IIFE per
 * entry: no imports at runtime, no minification, the license header of ../.license-header.txt on top (TPL-26).
 *
 * build-manifest.json records a hash of every source and test file (the module's _dev folder) and of every
 * JavaScript file in ../views/js/. `ps-module assets check` (composer check, definition of done) compares it with
 * the files in PHP, without Node. Only this script writes it, and only when every step above passed.
 *
 * The npm packages (esbuild, typescript, eslint, vitest) are the module's own, in _dev/node_modules: this file lives
 * in vendor/, where Node would not find them, so esbuild is loaded with the module's import function.
 */

import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {TARGETS, devDirOf, entriesOf} from './mode.mjs';

const SKIP_DIRS = new Set(['node_modules', '.cache']);
const METRICS = ['lines', 'statements', 'functions', 'branches'];

/** An import function that resolves npm packages from the module's _dev/node_modules (when the module passes none). */
export function importerFor(devDir) {
  const require = createRequire(path.join(devDir, 'package.json'));

  return (name) => import(pathToFileURL(require.resolve(name)).href);
}

/**
 * Runs the build of the module whose _dev/build.mjs has the URL devUrl. Returns the exit code (also set as
 * process.exitCode); in watch mode it returns 0 and keeps watching.
 *
 * @param {string|URL} devUrl import.meta.url of the module's _dev/build.mjs (or the _dev folder)
 * @param {(name: string) => Promise<object>} [load] the module's import function, for esbuild
 * @param {string[]} [args] the command line options (--watch, --typecheck)
 */
export async function build(devUrl, load, args = process.argv.slice(2)) {
  const devDir = devDirOf(devUrl);
  const importModule = load ?? importerFor(devDir);
  const moduleDir = path.dirname(devDir);
  const outDir = path.join(moduleDir, 'views', 'js');
  const manifestFile = path.join(devDir, 'build-manifest.json');
  const headerFile = path.join(moduleDir, '.license-header.txt');
  const summaryFile = path.join(devDir, '.cache', 'coverage', 'coverage-summary.json');
  const vendorDir = path.join(outDir, 'vendor');
  const watch = args.includes('--watch');
  const typecheckOnly = args.includes('--typecheck');
  const loadEsbuild = async () => {
    const esbuild = await importModule('esbuild');

    return esbuild.default ?? esbuild;
  };

  /** Relative path with "/" separators. */
  function rel(from, file) {
    return path.relative(from, file).split(path.sep).join('/');
  }

  /** All files below a directory (recursive, sorted), without node_modules/ and .cache/. */
  function walk(dir, filter = () => true) {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          files.push(...walk(full, filter));
        }
      } else if (filter(full)) {
        files.push(full);
      }
    }

    return files.sort((a, b) => (rel(devDir, a) < rel(devDir, b) ? -1 : 1));
  }

  /** Runs a Node CLI from node_modules with the current Node binary (no npx, works the same on Windows). */
  function runNode(script, scriptArgs, cwd = devDir) {
    const result = spawnSync(process.execPath, [path.join(devDir, 'node_modules', script), ...scriptArgs], {cwd, stdio: 'inherit'});

    return result.status === 0;
  }

  /** Same hash rules as ps-module assets (PHP): paths with "/", CRLF -> LF, "\0" separators. */
  function hashFiles(files, baseDir) {
    const hash = createHash('sha256');
    for (const file of files) {
      hash.update(rel(baseDir, file) + '\0', 'latin1');
      hash.update(fs.readFileSync(file).toString('latin1').replace(/\r\n/g, '\n') + '\0', 'latin1');
    }

    return hash.digest('hex');
  }

  /** Typecheck of every folder with TypeScript and a tsconfig.json (esbuild and Vitest strip types without checking). */
  function typecheck() {
    const projects = ['front', 'back', 'tests/front', 'tests/back']
      .filter((dir) => fs.existsSync(path.join(devDir, dir, 'tsconfig.json')) && walk(path.join(devDir, dir), (f) => f.endsWith('.ts')).length > 0);

    return projects.every((dir) => runNode('typescript/bin/tsc', ['-p', path.join(dir, 'tsconfig.json'), '--pretty']));
  }

  /** Own JavaScript in views/js: everything except the third-party libraries in views/js/vendor/ (TST-27). */
  function ownScripts() {
    return walk(outDir, (f) => f.endsWith('.js') && !f.startsWith(vendorDir + path.sep));
  }

  /** The files the tests must cover: the TypeScript sources, or the hand-written JavaScript in views/js. */
  function coveredFiles(typescript) {
    return typescript
      ? TARGETS.flatMap((target) => walk(path.join(devDir, target), (f) => f.endsWith('.ts') && !f.endsWith('.d.ts')))
      : ownScripts();
  }

  /**
   * Runs the tests with coverage, then checks the summary per file: every covered file must be in it with
   * 100% on every metric. Returns the summary for the manifest, or null when something failed.
   */
  function test(typescript) {
    const sources = coveredFiles(typescript);
    const tests = walk(path.join(devDir, 'tests'), (f) => /\.test\.(js|ts)$/.test(f));
    if (sources.length > 0 && tests.length === 0) {
      console.error('No tests in _dev/tests/ for ' + sources.map((f) => rel(moduleDir, f)).join(', ') + ' (TST-20).');

      return null;
    }
    if (tests.length === 0) {
      return {files: 0, tests: 0};
    }
    fs.rmSync(summaryFile, {force: true});
    if (!runNode('vitest/vitest.mjs', ['run', '--coverage', '--config', path.join(devDir, 'vitest.config.mjs')])) {
      return null;
    }
    const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : {};
    const byFile = Object.fromEntries(Object.entries(summary).map(([file, data]) => [path.resolve(file), data]));
    const missing = [];
    for (const file of sources) {
      const data = byFile[path.resolve(file)];
      const short = METRICS.filter((metric) => !data || data[metric].pct !== 100);
      if (short.length > 0) {
        missing.push(`${rel(moduleDir, file)}: ${data ? short.map((m) => `${m} ${data[m].pct}%`).join(', ') : 'not covered by any test'}`);
      }
    }
    if (missing.length > 0) {
      console.error('Coverage must be 100% for every file (TST-21):\n  ' + missing.join('\n  '));

      return null;
    }

    return {files: sources.length, tests: tests.length, coverage: '100% lines, statements, functions and branches per file'};
  }

  /** esbuild options for the entries of one target. */
  function options(entryPoints, banner) {
    return {
      entryPoints,
      outdir: outDir,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: ['es2020'],
      minify: false,
      sourcemap: false,
      charset: 'utf8',
      legalComments: 'none',
      banner: {js: banner},
      // Not the tsconfig files (tsc reads those): their strict mode would make esbuild put "use strict" at
      // the top of the file, and with Smart cache (CCC) PrestaShop concatenates all scripts into one file.
      tsconfigRaw: {compilerOptions: {alwaysStrict: false, verbatimModuleSyntax: true, useDefineForClassFields: true}},
      logLevel: 'info',
    };
  }

  /** Ends the run with an exit code. */
  function done(code) {
    process.exitCode = code;

    return code;
  }

  const targets = TARGETS.map((target) => ({target, entries: entriesOf(devDir, target)})).filter((t) => t.entries.length > 0);
  const typescript = targets.length > 0;

  // Two entries with the same name would overwrite each other in views/js/.
  const names = targets.flatMap((t) => t.entries.map((e) => path.basename(e, '.ts')));
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) {
    console.error(`Two entries are called "${duplicate}.ts" (front/ and back/): rename one, they share views/js/.`);

    return done(1);
  }

  const banner = fs.readFileSync(headerFile, 'utf8').replace(/\r\n/g, '\n').trim();

  if (watch) {
    const esbuild = await loadEsbuild();
    for (const {entries} of targets) {
      const ctx = await esbuild.context(options(entries, banner));
      await ctx.watch();
    }
    console.log('Watching _dev/ ... (no checks and no manifest: run npm run build before you commit)');

    return done(0);
  }
  if (typescript && !typecheck()) {
    return done(1);
  }
  if (typecheckOnly) {
    return done(0);
  }
  // Lint this folder and, for hand-written JavaScript, views/js (run from the module directory).
  const lintTargets = typescript ? ['_dev'] : ['_dev', 'views/js'].filter((dir) => fs.existsSync(path.join(moduleDir, dir)));
  if (!runNode('eslint/bin/eslint.js', ['--config', path.join(devDir, 'eslint.config.mjs'), ...lintTargets], moduleDir)) {
    return done(1);
  }
  const tests = test(typescript);
  if (tests === null) {
    return done(1);
  }
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {outputs: {}};
  let esbuildVersion = null;
  if (typescript) {
    const esbuild = await loadEsbuild();
    esbuildVersion = esbuild.version;
    const built = new Set();
    for (const {entries} of targets) {
      await esbuild.build(options(entries, banner));
      entries.forEach((entry) => built.add('views/js/' + path.basename(entry, '.ts') + '.js'));
    }
    // Remove the output of entries that no longer exist (only files an earlier TypeScript build made).
    if ((previous.mode ?? 'typescript') === 'typescript') {
      for (const relative of Object.keys(previous.outputs || {})) {
        if (!built.has(relative) && fs.existsSync(path.join(moduleDir, relative))) {
          fs.unlinkSync(path.join(moduleDir, relative));
          console.log(`removed ${relative} (its entry is gone)`);
        }
      }
    }
  }
  // The validator wants an index.php in every directory of the module (STR-03): copy the module's own.
  for (const dir of [path.dirname(outDir), outDir]) {
    if (fs.existsSync(dir) && !fs.existsSync(path.join(dir, 'index.php')) && fs.existsSync(path.join(moduleDir, 'index.php'))) {
      fs.copyFileSync(path.join(moduleDir, 'index.php'), path.join(dir, 'index.php'));
    }
  }
  // Every own JavaScript file in views/js: the build output, or the hand-written (and tested) scripts.
  const outputs = Object.fromEntries(ownScripts().map((file) => [rel(moduleDir, file), hashFiles([file], moduleDir)]));
  const manifest = {
    _comment: 'Written by npm run build (_dev/build.mjs) after lint, tests and coverage passed; checked by vendor/bin/ps-module assets check. Do not edit.',
    mode: typescript ? 'typescript' : 'plain',
    ...(esbuildVersion ? {esbuild: esbuildVersion} : {}),
    tests: {passed: true, ...tests},
    sources: hashFiles([...walk(devDir, (f) => f !== manifestFile), headerFile].sort((a, b) => (rel(devDir, a) < rel(devDir, b) ? -1 : 1)), devDir),
    outputs: Object.fromEntries(Object.entries(outputs).sort()),
  };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`build-manifest.json: ${manifest.mode}, ${tests.tests} test file(s), ${Object.keys(outputs).length} file(s) in views/js`);

  return done(0);
}
