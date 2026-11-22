import { DOCUMENT } from '@angular/common';
import {
  effect,
  inject,
  provideAppInitializer,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

/** Langue par défaut de l'application (et langue de secours). */
export const DEFAULT_LANG = 'fr';

/** Langues pour lesquelles un fichier `public/i18n/<lang>.json` existe. */
export const SUPPORTED_LANGS = ['fr', 'en'] as const;

/**
 * Configure ngx-translate : français par défaut, fichiers chargés depuis `i18n/<lang>.json`,
 * et attribut `lang` de `<html>` tenu à jour (WCAG 3.1.1).
 */
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({
      lang: DEFAULT_LANG,
      fallbackLang: DEFAULT_LANG,
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json' }),
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      const root = inject(DOCUMENT).documentElement;
      effect(() => {
        root.lang = translate.currentLang() ?? DEFAULT_LANG;
      });
    }),
  ];
}
