# Composants partagés

Composants Angular communs aux écrans web, sous `src/app/shared/`. Ils reprennent la page `11 - Components` du Figma et n'utilisent que les tokens de `src/styles/tokens.css`.

| Composant          | Usage                                                       | Figma            |
| ------------------ | ----------------------------------------------------------- | ---------------- |
| `Button`           | `<button appButton variant="primary\|secondary" [loading]>` | Button           |
| `TextField`        | `<app-text-field label error hint [formControl]>`           | Input            |
| `SegmentedControl` | `<app-segmented-control ariaLabel [options] [(value)]>`     | SegmentedControl |
| `Alert`            | `<app-alert tone="error\|info" title>Message</app-alert>`   | (ticket #67)     |

## Règles

- Accessibilité : icône + texte pour les erreurs, focus visible, `aria-invalid` et `aria-describedby` sur les champs, `aria-disabled` sur les boutons (ils restent focalisables).
- `Button` secondaire : bordure `--color-border-strong` (`--color-border` est sous 3:1, WCAG 1.4.11).
- `Alert` : seuls les tons `error` et `info` existent, les tokens warning et succès ne sont pas encore définis.
- Rayons : `var(--radius-*, valeur Figma)`, la famille `radius` est absente de `tokens.json`.

## Composants locaux de la page Profil

Créés dans `src/app/pages/profile/` (le dossier `shared` n'a pas ces composants) ; à déplacer dans `shared` si une autre page les réutilise.

| Composant         | Usage                                                                    | Figma                      |
| ----------------- | ------------------------------------------------------------------------ | -------------------------- |
| `OptionCardGroup` | `<app-option-card-group ariaLabel [options] [columns] formControlName>`  | ProfileOption / OptionCard |
| `SettingRow`      | `<app-setting-row label formControlName>` (interrupteur `role="switch"`) | SettingRow (Toggle)        |
