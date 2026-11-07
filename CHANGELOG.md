# Changelog

The version is the one of the monorepo `mono-build-standards`.

## 1.0.0

First version, merged from the `_dev/` folders of the 17 modules (scan of 2026-11-07; 16 modules with the recipe
`typescript`, `heavenproductstocksorting` plain JavaScript).

### Identical everywhere: moved as they are

| File | Modules | Note |
|---|---|---|
| `tsconfig.base.json` | 16 | All TypeScript modules |
| `types/prestashop-admin.d.ts` | 16 | All TypeScript modules |
| `types/prestashop-front.d.ts` | 13 | The other 3 TypeScript modules have no front code (`heavenattachmentmailer`, `heavendeliverycopy`, `heavenfooterpaymenticons`) |

### Identical everywhere, made a function (they found `_dev/` through their own location)

- `build.mjs` (17 identical): `build(devUrl, load, args)`. The code is the module's, step for step; the differences:
  the constants that used `import.meta.url` are computed from `devUrl`; `process.exit(n)` became `process.exitCode = n`
  plus `return` (the same exit codes); `import('esbuild')` goes through the module's import function (from `vendor/`,
  Node would not find `_dev/node_modules`); `entriesOf()` moved to `mode.mjs`.
- `vitest.config.mjs` (17 identical): `vitestConfig(devUrl)`. Without `defineConfig()` of `vitest/config` (an identity
  function), so the shared file needs no npm package; the config object is unchanged.

### Drifted: merged

- `eslint.config.mjs`, 2 variants: 16 TypeScript modules, and `heavenproductstocksorting` (plain JavaScript). Both
  are kept as the two modes of one function `eslintConfig(devUrl, load, options)`, with the mode taken from the files
  as in `build.mjs` (or `options.mode`):
  - **typescript** (16): unchanged: `typescript-eslint` recommended, `**/*.ts` and `**/*.js`, `no-explicit-any`, the
    TypeScript `no-unused-vars`, front code without `window.$` and `window.jQuery`, Node globals in `_dev/tests`.
    Added from the plain variant: `views/js/vendor/**` in the ignores (no effect: this mode lints only `_dev`).
  - **plain** (1): unchanged: `**/*.js` with `ecmaVersion` 2020 and `sourceType` script, `no-var`, core
    `no-unused-vars`, the front rule on `views/js/**` except `admin*.js` and `admin/` with only `window.$` (TPL-18),
    tests as modules. `typescript-eslint` is not loaded in this mode (the plain module does not install it).
  - Shared by both: `no-console`, `eqeqeq`, `prefer-const`, the `_`-prefix for unused parameters, the same messages.
- `package.json`, 2 variants (16 / 1): the differences are the mode (TypeScript tools, `watch` and `typecheck`
  scripts, `lint` also on `views/js`) plus the module's name and description. npm cannot extend a `package.json`, so it
  stays in the module; `package.base.json` holds the shared part per mode, equal to the modules' current versions.

### Module-specific: stays in the module

- `back/tsconfig.json` (16 identical), `tests/back/tsconfig.json` (16), `front/tsconfig.json` and
  `tests/front/tsconfig.json` (2 each): TypeScript resolves `include` relative to the file that defines it, so a shared
  file cannot list the module's sources. They only change their `extends` and the path of the typings (README).
- `types/module.d.ts` (12 variants in 16 modules; the 5 equal ones are the unfilled scaffold template, still named
  after the module): the module's own `window.<module>` global.
- `tests/support/*`: package `build-testing-js` (milestone M4). `build-manifest.json`, `package-lock.json`: generated.

### Verified

Throwaway copies of `heavenautoorderstatus` (typescript, back only; package copied into `vendor/`),
`heavencartjourney` (typescript, front and back; package linked as a junction, like `ps-module link`) and
`heavenproductstocksorting` (plain) under `.cache/ts-verify`, switched to these files: `npm ci` + `npm run build`
green, the built `views/js` byte-identical to the modules' committed build manifests (same outputs, same test counts);
`--watch` starts. Injected faults are reported: `any`, `console.log` and `==` (typescript), `window.$` in front code and
a wrong type against `PrestaShopFront` (typecheck with the typings from the package), `var` and an unused variable
(plain).
