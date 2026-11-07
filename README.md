# prestashopheaven/build-typescript

The shared TypeScript and JavaScript tooling of the PrestaHaven modules: tsconfig base, PrestaShop typings (admin and
front), the `_dev` build (typecheck, lint, tests with 100 % coverage, esbuild bundle, build manifest), the ESLint and
Vitest configs and the base npm dependencies. A build package: `require-dev` only, never in a module zip (PKG-03).

JavaScript and TypeScript are delivered as files in this Composer package and imported by path (D16): there is no npm
package. The npm tools themselves (esbuild, TypeScript, ESLint, Vitest) stay the module's own, in `_dev/node_modules`.

## Use when

A module has JavaScript or TypeScript in `_dev/` (recipe `typescript` or optional part `js-tests`): extend the tsconfig
base, include the PrestaShop typings and call the shared build, ESLint and Vitest configs from the module's `_dev`
files.

## Install

```
composer require --dev prestashopheaven/build-typescript:^1.0
```

`composer install` comes before `npm ci` / `ps-module assets build`: the `_dev` files import from `../vendor/`.

## Usage

Two modes, chosen by the files (the same rule in `build.mjs`, `eslint.config.mjs` and `vitest.config.mjs`, see
`mode.mjs`): **typescript** when `_dev/front/` or `_dev/back/` has a top-level `*.ts` entry, otherwise **plain**
(hand-written scripts in `views/js/`).

Each shared `.mjs` file is a function the module calls with its own `import.meta.url`: the files live in `vendor/`, so
they never use their own location to find `_dev/`, and the npm packages are loaded with the module's import function
`(name) => import(name)` (Node resolves a bare import from the importing file; from `vendor/` it would not find
`_dev/node_modules`). Without that function they fall back to resolving from `_dev/package.json`.

### `_dev/build.mjs`

```js
/**
 * (the module's license header)
 */

/* The JS build of this module: prestashopheaven/build-typescript (typecheck, lint, tests, bundle, manifest). */

import {build} from '../vendor/prestashopheaven/build-typescript/build.mjs';

await build(import.meta.url, (name) => import(name));
```

`node build.mjs` (`npm run build`), `--typecheck`, `--watch`: unchanged. The exit code is set as `process.exitCode`.

### `_dev/eslint.config.mjs`

```js
/**
 * (the module's license header)
 */

/* Lint rules: prestashopheaven/build-typescript. */

import {eslintConfig} from '../vendor/prestashopheaven/build-typescript/eslint.config.mjs';

export default await eslintConfig(import.meta.url, (name) => import(name));
```

A third argument `{mode: 'typescript' | 'plain'}` overrides the mode. Module-specific rules: spread the result into
your own array (`export default [...await eslintConfig(...), {files: [...], rules: {...}}]`).

### `_dev/vitest.config.mjs`

```js
/**
 * (the module's license header)
 */

/* Vitest (jsdom, 100% coverage per file): prestashopheaven/build-typescript. */

import {vitestConfig} from '../vendor/prestashopheaven/build-typescript/vitest.config.mjs';

export default vitestConfig(import.meta.url);
```

The shared file uses only Node built-ins (Vite bundles the config file together with it).

### tsconfig files (typescript mode)

`_dev/tsconfig.base.json`, `_dev/types/prestashop-admin.d.ts` and `_dev/types/prestashop-front.d.ts` are removed from
the module. The `tsconfig.json` files stay (TypeScript resolves `include` relative to the file that defines it, so a
shared file cannot list the module's sources); they extend the base and include the typings from the package:

`_dev/back/tsconfig.json`

```json
{
  "extends": "../../vendor/prestashopheaven/build-typescript/tsconfig.base.json",
  "include": ["**/*.ts", "../../vendor/prestashopheaven/build-typescript/types/prestashop-admin.d.ts", "../types/module.d.ts"]
}
```

`_dev/front/tsconfig.json`

```json
{
  "extends": "../../vendor/prestashopheaven/build-typescript/tsconfig.base.json",
  "include": ["**/*.ts", "../../vendor/prestashopheaven/build-typescript/types/prestashop-front.d.ts", "../types/module.d.ts"]
}
```

`_dev/tests/back/tsconfig.json` (and `tests/front` with `prestashop-front.d.ts`)

```json
{
  "extends": "../../../vendor/prestashopheaven/build-typescript/tsconfig.base.json",
  "include": ["**/*.ts", "../support/*.d.ts", "../../../vendor/prestashopheaven/build-typescript/types/prestashop-admin.d.ts", "../../types/module.d.ts"]
}
```

### `_dev/package.json`

npm cannot extend a `package.json`, so it stays in the module (with its lock file). `package.base.json` holds the shared
part per mode (`engines`, `scripts`, pinned `devDependencies`); the module adds `name`, `description`, `private`,
`license` and `type: module`. `Paths::packageFor('typescript' | 'plain')` returns that block for the scaffold or a check.

### What stays in the module

- `_dev/types/module.d.ts`: the module's own global `window.<module>` (TPL-05), different per module.
- The `tsconfig.json` files above, `package.json` + `package-lock.json`, `build-manifest.json` (generated) and
  `.license-header.txt`.
- `_dev/tests/support/*`: package `build-testing-js` (monorepo `mono-build-testing`).

### Paths for build-tools

`PrestaShopHeaven\Build\Typescript\Paths` gives the absolute path of every shared file: `tsconfigBase()`,
`adminTypes()`, `frontTypes()`, `build()`, `eslint()`, `vitest()`, `mode()`, `packageBase()`, `all()`, and
`packageFor($mode)`.

---

Read-only split of [`prestashopheaven/mono-build-standards`](https://github.com/prestashopheaven/mono-build-standards): changes,
issues and pull requests go there. MIT License.
