import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import en from '../../../public/i18n/en.json';
import fr from '../../../public/i18n/fr.json';
import { provideI18n } from './i18n';

type Tree = { [key: string]: string | Tree };

function keysOf(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value, `${prefix}${key}.`),
  );
}

describe('fichiers de traduction', () => {
  it('fr.json et en.json ont exactement les mêmes clés', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(fr).sort());
  });

  it("n'a aucune valeur vide", () => {
    const empty = (tree: Tree): boolean =>
      Object.values(tree).some((value) =>
        typeof value === 'string' ? !value.trim() : empty(value),
      );
    expect(empty(fr)).toBe(false);
    expect(empty(en)).toBe(false);
  });
});

describe('provideI18n', () => {
  it("passe l'attribut lang de <html> à la langue courante", async () => {
    TestBed.configureTestingModule({ providers: [provideI18n()] });
    const root = TestBed.inject(DOCUMENT).documentElement;
    const translate = TestBed.inject(TranslateService);

    TestBed.tick();
    expect(root.lang).toBe('fr');

    translate.setTranslation('en', en);
    await new Promise<void>((resolve) => translate.use('en').subscribe(() => resolve()));
    TestBed.tick();
    expect(root.lang).toBe('en');
  });
});
