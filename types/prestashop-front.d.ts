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
 * Globals of the front office that the module may use. They come from PrestaShop and the theme, not
 * from this module, and are optional on purpose: a page without core.js (theme setting
 * core_scripts off), a page cache or a theme that loads later must not break the module (TPL-17).
 *
 * - window.prestashop: the JSON of themes/javascript.tpl plus the event emitter of themes/core.js
 *   (on/emit), in Classic and Hummingbird, PS 8.1 and 9.x.
 * - window.prestashop.themeSelectors: Classic only.
 * - window.Theme: Hummingbird only (PS 9): its events map, selectors and UI components
 *   (src/js/theme.ts of github.com/PrestaShop/hummingbird).
 */

type PrestaShopEventHandler = (event?: PrestaShopEvent) => void;

/** Payload of the core events, e.g. updateCart {reason: {linkAction: 'add-to-cart', idProduct: 1}}. */
interface PrestaShopEvent {
  reason?: {linkAction?: string; idProduct?: number | string; idProductAttribute?: number | string; [key: string]: unknown};
  resp?: unknown;
  [key: string]: unknown;
}

interface PrestaShopFront {
  on(event: string, handler: PrestaShopEventHandler): void;
  emit(event: string, payload?: PrestaShopEvent): void;
  /** Selectors of core.js (product, cart, checkout, listing ...). */
  selectors?: Record<string, Record<string, string> | string>;
  /** Classic only. */
  themeSelectors?: Record<string, Record<string, string> | string>;
  urls?: {base_url?: string; current_url?: string; pages?: Record<string, string>; [key: string]: unknown};
  page?: {page_name?: string; [key: string]: unknown};
  customer?: {is_logged?: boolean; [key: string]: unknown};
  /** Tools::getToken(false): the token for the module's own POST requests (recipe front-controller). */
  static_token?: string;
  [key: string]: unknown;
}

/** Hummingbird (PS 9) exposes window.Theme; Classic does not. */
interface HummingbirdTheme {
  events?: Record<string, string>;
  selectors?: Record<string, unknown>;
  components?: {
    useToast?: (message: string, options?: Record<string, unknown>) => {show: () => void};
    useAlert?: (message: string, options?: Record<string, unknown>) => {show: () => void};
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Only the jQuery calls lib/page-events.ts needs (jQuery-only events of third-party modules). */
interface JQueryLite {
  (target: Document): {on(events: string, handler: () => void): unknown};
}

interface Window {
  prestashop?: PrestaShopFront;
  Theme?: HummingbirdTheme;
  jQuery?: JQueryLite;
}
