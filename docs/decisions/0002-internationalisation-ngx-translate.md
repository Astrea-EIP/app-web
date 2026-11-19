# 0002 — Internationalisation avec ngx-translate

- Date : 2026-11-19
- Statut : proposée
- Décideurs : Carlos
- Tickets liés : #77

## Contexte

Les textes de l'interface étaient écrits en dur dans les templates. L'application est destinée à la France et reste en français (aucun sélecteur de langue dans les maquettes Figma), mais les textes doivent être centralisés pour être relus et modifiés sans toucher au code des écrans, et pour pouvoir ajouter l'anglais plus tard.

## Options envisagées

- Fichier de textes typé en TypeScript, sans dépendance : clés vérifiées à la compilation, mais pas de changement de langue prévu.
- `@angular/localize` : natif, mais build par langue, workflow XLIFF lourd, textes laissés dans les templates.
- Transloco : clés typables, chargement par morceaux, moins familier pour l'équipe.
- ngx-translate : fichiers JSON par langue et pipe `translate`, déjà connu de l'équipe.

## Décision

ngx-translate (`@ngx-translate/core` et `@ngx-translate/http-loader`, version 18, compatible Angular ≥ 18).

- Français par défaut et langue de secours ; `en.json` est présent mais non exposé (pas de sélecteur).
- Fichiers dans `public/i18n/<langue>.json`, chargés depuis `./i18n/`.
- Clés en `camelCase`, groupées par fonctionnalité : `nav.tripEntry`, `auth.login.title`.
- Dans un template : `{{ 'nav.map' | translate }}`. Aucun texte visible en dur dans les templates.
- `provideI18n()` (dans `src/app/i18n/i18n.ts`) configure le service et tient à jour l'attribut `lang` de `<html>` (WCAG 3.1.1).
- Dans les tests : `provideTestI18n()` fournit les vraies traductions françaises sans requête HTTP.
- Un test vérifie que `fr.json` et `en.json` ont exactement les mêmes clés et aucune valeur vide.

## Conséquences

- Les clés ne sont pas vérifiées à la compilation : une clé inconnue s'affiche telle quelle. Le test de parité couvre les deux fichiers entre eux, pas l'usage dans les templates.
- Chaque nouveau texte d'écran s'ajoute dans `fr.json` et `en.json` dans la même PR.
- Les écrans existants (#12, #14, #17, composants partagés) sont migrés dans des PR séparées après leur fusion.
