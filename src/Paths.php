<?php
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

declare(strict_types=1);

namespace PrestaShopHeaven\Build\Typescript;

/**
 * The absolute paths of the shared JavaScript and TypeScript files of this package, so build-tools (the scaffold,
 * ps-module assets) can find them wherever Composer installed the package. Paths use "/" on every OS.
 */
final class Paths
{
    /** The two modes of a module's _dev folder (see mode.mjs). */
    public const MODES = ['typescript', 'plain'];

    /**
     * The package folder.
     */
    public static function root(): string
    {
        return str_replace('\\', '/', dirname(__DIR__));
    }

    /**
     * tsconfig.base.json: the compiler options every tsconfig.json of a module's _dev extends.
     */
    public static function tsconfigBase(): string
    {
        return self::root() . '/tsconfig.base.json';
    }

    /**
     * types/prestashop-admin.d.ts: window.prestashop.component and instance of the admin theme.
     */
    public static function adminTypes(): string
    {
        return self::root() . '/types/prestashop-admin.d.ts';
    }

    /**
     * types/prestashop-front.d.ts: window.prestashop and window.Theme in the front office.
     */
    public static function frontTypes(): string
    {
        return self::root() . '/types/prestashop-front.d.ts';
    }

    /**
     * build.mjs: exports build(devUrl, load), the typecheck, lint, tests, bundle and build manifest.
     */
    public static function build(): string
    {
        return self::root() . '/build.mjs';
    }

    /**
     * eslint.config.mjs: exports eslintConfig(devUrl, load), the flat config of both modes.
     */
    public static function eslint(): string
    {
        return self::root() . '/eslint.config.mjs';
    }

    /**
     * vitest.config.mjs: exports vitestConfig(devUrl), jsdom and the 100 % coverage gate.
     */
    public static function vitest(): string
    {
        return self::root() . '/vitest.config.mjs';
    }

    /**
     * mode.mjs: where _dev is and which mode it has; used by the three files above.
     */
    public static function mode(): string
    {
        return self::root() . '/mode.mjs';
    }

    /**
     * package.base.json: engines, scripts and pinned devDependencies of a module's _dev/package.json, per mode.
     */
    public static function packageBase(): string
    {
        return self::root() . '/package.base.json';
    }

    /**
     * The shared part of a module's _dev/package.json for one mode: engines, scripts and devDependencies (from
     * package.base.json, or from $baseFile).
     *
     * @return array{engines: array<string, string>, scripts: array<string, string>, devDependencies: array<string, string>}
     *
     * @throws \InvalidArgumentException when the mode is not typescript or plain
     * @throws \RuntimeException when the base file has no valid block for the mode
     */
    public static function packageFor(string $mode, ?string $baseFile = null): array
    {
        if (!in_array($mode, self::MODES, true)) {
            throw new \InvalidArgumentException(sprintf('The mode must be one of %s, got "%s".', implode(', ', self::MODES), $mode));
        }
        $baseFile ??= self::packageBase();
        $base = is_file($baseFile) ? json_decode((string) file_get_contents($baseFile), true) : null;
        $block = is_array($base) ? ($base[$mode] ?? null) : null;
        if (!is_array($block) || !is_array($block['engines'] ?? null) || !is_array($block['scripts'] ?? null) || !is_array($block['devDependencies'] ?? null)) {
            throw new \RuntimeException(sprintf('%s has no valid "%s" block.', $baseFile, $mode));
        }

        return ['engines' => $block['engines'], 'scripts' => $block['scripts'], 'devDependencies' => $block['devDependencies']];
    }

    /**
     * Every shared file of this package by name, for listings and checks.
     *
     * @return array<string, string>
     */
    public static function all(): array
    {
        return [
            'tsconfig' => self::tsconfigBase(),
            'admin-types' => self::adminTypes(),
            'front-types' => self::frontTypes(),
            'build' => self::build(),
            'eslint' => self::eslint(),
            'vitest' => self::vitest(),
            'mode' => self::mode(),
            'package' => self::packageBase(),
        ];
    }
}
