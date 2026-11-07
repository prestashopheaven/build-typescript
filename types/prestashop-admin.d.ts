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
 * The JavaScript API of the PrestaShop back office for modules: window.prestashop.component.
 * main.bundle.js of the admin theme (admin/themes/new-theme/js/app/utils/init-components.ts) defines
 * it in a jQuery ready handler on every Symfony page (new-theme), in PS 8.1 and 9.x. Legacy pages
 * (default admin theme: HelperForm, HelperList, AdminModules?configure=...) do not have it.
 * Docs: https://devdocs.prestashop-project.org/9/development/components/global-components/
 *
 * Components that a version lacks are optional below. PS 8.1.0 has everything except
 * TextWithRecommendedLengthCounter, EntitySearchInput (8.1.7+), EmailInput, MultipleZoneChoice and
 * ToggleChildrenChoice.
 */

type AdminComponentClass = new (...args: never[]) => unknown;

/** The Node "events" EventEmitter shared by all admin components (window.prestashop.component.EventEmitter). */
interface AdminEventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): AdminEventEmitter;
  once(event: string, listener: (...args: unknown[]) => void): AdminEventEmitter;
  off(event: string, listener: (...args: unknown[]) => void): AdminEventEmitter;
  emit(event: string, ...args: unknown[]): boolean;
}

interface AdminGrid {
  addExtension(extension: unknown): void;
  getId(): string;
  getContainer(): unknown;
}

interface AdminRouter {
  generate(route: string, params?: Record<string, unknown>): string;
}

interface PrestaShopAdminComponents {
  /** Creates window.prestashop.instance.<camelCaseName> for every name; warns for unknown or already started ones. */
  initComponents(names: string[]): void;
  EventEmitter: AdminEventEmitter;
  Grid: new (gridId: string) => AdminGrid;
  GridExtensions: Record<string, new (...args: never[]) => unknown>;
  Router: new () => AdminRouter;
  ChoiceTable: AdminComponentClass;
  ChoiceTree: AdminComponentClass;
  ColorPicker: AdminComponentClass;
  CountryDniRequiredToggler: AdminComponentClass;
  CountryStateSelectionToggler: AdminComponentClass;
  DateRange: AdminComponentClass;
  DeltaQuantityInput: AdminComponentClass;
  DisablingSwitch: AdminComponentClass;
  FormFieldToggler: AdminComponentClass;
  GeneratableInput: AdminComponentClass;
  IframeClient: AdminComponentClass;
  ModifyAllShopsCheckbox: AdminComponentClass;
  MultipleChoiceTable: AdminComponentClass;
  MultistoreConfigField: AdminComponentClass;
  PreviewOpener: AdminComponentClass;
  ShopSelector: AdminComponentClass;
  TaggableField: AdminComponentClass;
  TextWithLengthCounter: AdminComponentClass;
  TinyMCEEditor: AdminComponentClass;
  TranslatableField: AdminComponentClass;
  TranslatableInput: AdminComponentClass;
  // Not in every supported version (see above): check before use.
  TextWithRecommendedLengthCounter?: AdminComponentClass;
  EntitySearchInput?: AdminComponentClass;
  EmailInput?: AdminComponentClass;
  MultipleZoneChoice?: AdminComponentClass;
  ToggleChildrenChoice?: AdminComponentClass;
  [name: string]: unknown;
}

interface PrestaShopAdmin {
  component?: PrestaShopAdminComponents;
  /** Started components, e.g. instance.multistoreConfigField. */
  instance?: Record<string, unknown>;
  [key: string]: unknown;
}

/** jQuery is part of every back-office page (TPL-10 allows it there); only what lib/admin.ts uses. */
interface JQueryLite {
  (ready: () => void): unknown;
}

interface Window {
  prestashop?: PrestaShopAdmin;
  jQuery?: JQueryLite;
}
