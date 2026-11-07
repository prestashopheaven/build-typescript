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

namespace PrestaShopHeaven\Build\Typescript\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use PrestaShopHeaven\Build\Typescript\Paths;

/**
 * The paths of the shared JavaScript and TypeScript files, their content where PHP can check it, and the base npm
 * dependencies per mode.
 */
final class PathsTest extends TestCase
{
    /**
     * Every path is absolute, uses "/" and points to an existing file in the package folder.
     */
    public function testEveryPathExistsInThePackage(): void
    {
        $root = Paths::root();
        self::assertSame(str_replace('\\', '/', (string) realpath(__DIR__ . '/../..')), str_replace('\\', '/', (string) realpath($root)));
        self::assertStringNotContainsString('\\', $root);

        self::assertSame("$root/tsconfig.base.json", Paths::tsconfigBase());
        self::assertSame("$root/types/prestashop-admin.d.ts", Paths::adminTypes());
        self::assertSame("$root/types/prestashop-front.d.ts", Paths::frontTypes());
        self::assertSame("$root/build.mjs", Paths::build());
        self::assertSame("$root/eslint.config.mjs", Paths::eslint());
        self::assertSame("$root/vitest.config.mjs", Paths::vitest());
        self::assertSame("$root/mode.mjs", Paths::mode());
        self::assertSame("$root/package.base.json", Paths::packageBase());

        $all = Paths::all();
        self::assertSame(['tsconfig', 'admin-types', 'front-types', 'build', 'eslint', 'vitest', 'mode', 'package'], array_keys($all));
        foreach ($all as $file) {
            self::assertFileExists($file);
        }
    }

    /**
     * The tsconfig base is the one of the modules: strict, ES2020, bundler resolution, no emit (esbuild builds).
     */
    public function testTheTsconfigBaseIsStrict(): void
    {
        $tsconfig = json_decode((string) file_get_contents(Paths::tsconfigBase()), true);
        self::assertIsArray($tsconfig);
        $options = $tsconfig['compilerOptions'];

        self::assertSame(['compilerOptions'], array_keys($tsconfig));
        self::assertSame('ES2020', $options['target']);
        self::assertSame(['ES2020', 'DOM', 'DOM.Iterable'], $options['lib']);
        self::assertSame('Bundler', $options['moduleResolution']);
        self::assertSame([], $options['types']);
        foreach (['strict', 'noUncheckedIndexedAccess', 'noImplicitOverride', 'noImplicitReturns', 'noFallthroughCasesInSwitch', 'noUnusedLocals', 'noUnusedParameters', 'isolatedModules', 'verbatimModuleSyntax', 'noEmit'] as $flag) {
            self::assertTrue($options[$flag], $flag);
        }
    }

    /**
     * Every shared source file carries the MIT license header, and the typings declare the PrestaShop globals.
     */
    public function testTheSourcesHaveTheLicenseHeaderAndTheGlobals(): void
    {
        foreach ([Paths::adminTypes(), Paths::frontTypes(), Paths::build(), Paths::eslint(), Paths::vitest(), Paths::mode()] as $file) {
            self::assertStringStartsWith("/**\n * NOTICE OF LICENSE\n", str_replace("\r\n", "\n", (string) file_get_contents($file)), $file);
        }
        self::assertStringContainsString('interface PrestaShopAdminComponents', (string) file_get_contents(Paths::adminTypes()));
        self::assertStringContainsString('interface PrestaShopFront', (string) file_get_contents(Paths::frontTypes()));
        self::assertStringContainsString('export async function build(devUrl, load', (string) file_get_contents(Paths::build()));
        self::assertStringContainsString('export async function eslintConfig(devUrl, load', (string) file_get_contents(Paths::eslint()));
        self::assertStringContainsString('export function vitestConfig(devUrl)', (string) file_get_contents(Paths::vitest()));
    }

    /**
     * The typescript block has the TypeScript tools and the watch and typecheck scripts; plain has neither.
     */
    public function testPackageForGivesTheBlockOfTheMode(): void
    {
        $typescript = Paths::packageFor('typescript');
        $plain = Paths::packageFor('plain');

        self::assertSame(['engines', 'scripts', 'devDependencies'], array_keys($typescript));
        self::assertSame(['node' => '>=22.13'], $typescript['engines']);
        self::assertSame($typescript['engines'], $plain['engines']);
        self::assertSame('6.0.3', $typescript['devDependencies']['typescript']);
        self::assertArrayHasKey('esbuild', $typescript['devDependencies']);
        self::assertArrayHasKey('typescript-eslint', $typescript['devDependencies']);
        self::assertSame('node build.mjs --watch', $typescript['scripts']['watch']);
        self::assertSame('cd .. && eslint --config _dev/eslint.config.mjs _dev', $typescript['scripts']['lint']);

        self::assertArrayNotHasKey('typescript', $plain['devDependencies']);
        self::assertArrayNotHasKey('esbuild', $plain['devDependencies']);
        self::assertArrayNotHasKey('watch', $plain['scripts']);
        self::assertSame('cd .. && eslint --config _dev/eslint.config.mjs _dev views/js', $plain['scripts']['lint']);
        // The shared tools have the same version in both modes.
        foreach ($plain['devDependencies'] as $name => $version) {
            self::assertSame($typescript['devDependencies'][$name], $version, $name);
        }
        self::assertSame(Paths::MODES, ['typescript', 'plain']);
    }

    /**
     * Any other mode is refused.
     */
    #[DataProvider('wrongModes')]
    public function testPackageForRefusesAnUnknownMode(string $mode): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Paths::packageFor($mode);
    }

    /**
     * Modes that do not exist.
     *
     * @return iterable<string, array{string}>
     */
    public static function wrongModes(): iterable
    {
        yield 'empty' => [''];
        yield 'upper case' => ['TypeScript'];
        yield 'other' => ['js'];
    }

    /**
     * A base file that is missing, not JSON or without a complete block for the mode is refused.
     */
    #[DataProvider('brokenBaseFiles')]
    public function testPackageForRefusesABrokenBaseFile(?string $content): void
    {
        $file = str_replace('\\', '/', sys_get_temp_dir()) . '/package-base-' . bin2hex(random_bytes(4)) . '.json';
        if ($content !== null) {
            file_put_contents($file, $content);
        }
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('has no valid "plain" block');

        try {
            Paths::packageFor('plain', $file);
        } finally {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    /**
     * Base files that cannot give a plain block.
     *
     * @return iterable<string, array{?string}>
     */
    public static function brokenBaseFiles(): iterable
    {
        yield 'missing' => [null];
        yield 'not JSON' => ['{'];
        yield 'not an object' => ['"plain"'];
        yield 'no block' => ['{"typescript": {}}'];
        yield 'block not an object' => ['{"plain": "x"}'];
        yield 'no scripts' => ['{"plain": {"engines": {}, "devDependencies": {}}}'];
        yield 'engines not an object' => ['{"plain": {"engines": "22", "scripts": {}, "devDependencies": {}}}'];
        yield 'no devDependencies' => ['{"plain": {"engines": {}, "scripts": {}}}'];
    }
}
