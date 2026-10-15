# Design tokens

The CSS tokens in [src/styles/tokens.css](../src/styles/tokens.css) are generated from `tokens.json` in the central `Astrea-EIP/docs` repository, the shared source for the Astrea design system.

Do not edit the CSS output directly: update the canonical source in `Astrea-EIP/docs/design-tokens/tokens.json`, run `pnpm tokens:generate` in that repository, then synchronize this file.

The Montserrat and Inter families are bundled locally in `public/fonts/`, with weights `400`, `600`, and `700`. The files are distributed under the SIL Open Font License; `OFL.txt` notices are kept with each family.

In a pull request that updates these files, state the version used:

```text
Design tokens source: docs@<commit-or-tag>
```
