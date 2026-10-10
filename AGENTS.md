# Astrea — règles pour les assistants IA et les contributeurs

## Projet

Astrea : application d'itinéraires accessibles (EIP Epitech). Dépôts : app-web, app-mobile, api-back, core-moteur, docs, deploy-orchestration.

## Règles de travail

- Source de vérité : les issues GitHub. Chaque PR référence son ticket ("Closes #N").
- La documentation vit sous `docs/`. Jamais de SPEC.md, de plans ou de fichiers de tâches à la racine ni commités.
- Les décisions importantes sont écrites dans `docs/decisions/` (modèle : `0000-modele.md`).
- Pas de modification de la CI, des secrets ou du déploiement sans validation d'un référent.

## Accessibilité (obligatoire)

- WCAG 2.2 niveau AA : texte 4,5:1, éléments d'interface 3:1, zones tactiles ≥ 24 px (2.5.8).
- Aucune couleur écrite en dur : utiliser les tokens du design system (Figma, page "10 - Foundations").
- Les couleurs « primary » et « accent » ne servent que de fond ; icônes, marqueurs et texte colorés utilisent les variantes « -strong ».

## Code

- Commits : Conventional Commits (feat, fix, docs…), cohérents dans la PR.
- Avant toute PR : lint, type-check, tests et build passent en local.
- Une PR = un ticket. Pas de refactor hors périmètre.

## Contexte à ne pas deviner

Si une information manque (maquette, décision, accès), la demander plutôt que d'inventer.

## Ce dépôt (app-web)

- Frontend Angular : pages, layouts, intégration navigateur. Lire `README.md` (ce que le dépôt possède ou non) et `CONTRIBUTING.md` (workflow) avant toute tâche.
- Standards cross-repo (archi globale, conventions partagées, CI, release) : handbook du dépôt `docs`, à ne pas redéfinir ici.
