# 0002 — Service de compte : port et implémentation « non disponible »

- Date : 2026-11-18
- Statut : proposée
- Décideurs : à valider par un référent
- Tickets liés : #12

## Contexte

Le ticket #12 demande l'écran de création de compte et de connexion (Figma, page « 30 - Web », frames 01a et 01b). api-back n'expose pour l'instant que `GET /v0/auth/anonymous` (jeton anonyme) : il n'existe aucune route d'inscription ni de connexion, et aucun contrat d'API n'est documenté pour elles. Le bouton « Continuer avec Google » de la maquette n'est pas supporté non plus.

## Options envisagées

- A : appeler des routes supposées (`/v0/auth/login`, `/v0/auth/register`). Refusée : contrat inventé, erreurs 404 en production.
- B : attendre api-back avant de livrer l'écran. Refusée : bloque le travail d'interface.
- C : définir un port `AccountService` (`login`, `register`) dans `src/app/auth/`, avec une implémentation par défaut `UnavailableAccountService` qui renvoie une `AccountError` typée (`unavailable`), affichée dans un `Alert` d'erreur. **Retenue.**

## Décision

- Le port et ses modèles (`LoginRequest`, `RegisterRequest`, `AccountSession`, `AccountError`) vivent dans `src/app/auth/account.*.ts`. Les champs de `RegisterRequest` reprennent ceux de la maquette (nom, e-mail, mot de passe, date de naissance, consentement) ; ils ne valent pas contrat d'API.
- L'écran `pages/auth` ne dépend que du port. Par défaut, tout envoi se termine par un message rassurant en français.
- Le bouton Google, le séparateur « ou » associé, le lien « En savoir plus » du consentement (pas de page cible) ne sont pas implémentés. « Mot de passe oublié ? » affiche une information « pas encore disponible ».
- Règle de mot de passe à la création (à confirmer avec le back) : 8 caractères minimum, une lettre, un chiffre.

## Conséquences

- Quand api-back exposera les routes, il suffira de fournir une implémentation HTTP d'`AccountService` ; l'écran ne change pas. L'écart est à lever par un ticket api-back.
- La redirection après connexion réussie reste à définir (aucun ticket ne la précise).
- Le jeton de session (`AccountSession.accessToken`) n'est pas encore stocké ni envoyé aux requêtes : hors périmètre du #12.

## Mise à jour (#85, ticket #84)

api-back propose désormais les routes dans ses PR #117 (`POST /v0/auth/register`, `POST /v0/auth/login`) et #118 (routes `/v0/users/me`), pas encore fusionnées au moment de cette mise à jour. `HttpAccountService` est l'implémentation HTTP annoncée ci-dessus : l'écran `pages/auth` ne change pas.

- `register` envoie `birth_date` en snake_case et ne transmet pas le consentement, qui se donne sur le profil selon le contrat.
- Erreurs : 409 à l'inscription → `email-already-used` ; 401 à la connexion → `invalid-credentials` ; API injoignable → `unavailable` ; autres cas → `unknown` (message du back conservé).
- `UnavailableAccountService` reste l'implémentation par défaut des tests.
- Reste ouvert : conservation du jeton (#84) et réglage CORS pour `localhost:4200` côté api-back.
