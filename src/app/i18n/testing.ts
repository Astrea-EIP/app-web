import type { Provider } from '@angular/core';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import fr from '../../../public/i18n/fr.json';
import { DEFAULT_LANG } from './i18n';

/** Fournit ngx-translate dans les tests, avec les vraies traductions françaises (sans HTTP). */
export function provideTestI18n(): Provider[] {
  return [
    provideTranslateService({
      lang: DEFAULT_LANG,
      fallbackLang: DEFAULT_LANG,
      loader: provideTranslateLoader(() => ({ getTranslation: () => of(fr) })),
    }),
  ];
}
