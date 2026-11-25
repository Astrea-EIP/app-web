# 0006 — Itinéraire calculé via api-back

- Date : 2026-11-25
- Statut : proposée
- Décideurs : Carlos
- Tickets liés : #89, #14, #17
- Remplace partiellement : 0002 (port du service d'itinéraire), pour la partie « non branchée »

## Contexte

Le contrat de `POST /v0/itinerary` est maintenant documenté dans api-back (`docs/api.md`,
`docs/api.json`) :

- en-tête `access-token` : jeton de compte, ou jeton anonyme (`GET /v0/auth/anonymous`) ;
- corps : `start`, `end` (« lat,lng » ou adresse), `mobility_profile` et les champs du profil, avec
  les mêmes noms que le profil enregistré (décision 0004) ;
- réponse `201` : `{ points: [{ lat, lng }] }`, du départ à l'arrivée (`ItineraryResponse`,
  `PointResponse`) ;
- erreurs : `400`/`422` `{ error }`, `401` sans corps, `429` avec `Retry-After`, `500`
  `{ error, errorId }`.

api-back#125 précise que `error` est un message de debug en anglais, sans garantie de stabilité.

## Options envisagées

**Texte des erreurs**

- A : afficher `error` tel quel (ce que proposait #89). Refusée : le texte est instable et en anglais.
- B : un message propre au web pour chaque code HTTP, `error` seulement dans la console.
  **Retenue** (api-back#125).

**Sans profil enregistré**

- A : envoyer `mobility_profile: 0` (piéton). Refusée : cela pourrait proposer un trajet dangereux à
  une personne en fauteuil.
- B : ne pas appeler l'API et renvoyer vers la page du profil. **Retenue**.

**401 avec un jeton de compte**

- A : fermer la session sans nouvel essai.
- B : fermer la session (décision 0005), prendre un jeton anonyme et réessayer une seule fois.
  **Retenue** : le profil reste en mémoire, le calcul aboutit quand même.

## Décision

- `HttpItineraryService` (`src/app/itinerary/http-itinerary.service.ts`) implémente
  `ITINERARY_SERVICE` et est branché dans `app.config.ts`.
- Le corps est construit par `toItineraryRequest` (`itinerary.api.ts`), qui reprend
  `toProfileRequest` et retire `consent`, `app_profile` et `wheelchair_model_id`.
- Jeton : celui de `SessionService`, sinon un jeton anonyme gardé dans un champ du service.
  Rien n'est écrit dans le stockage du navigateur.
- `401` : le jeton refusé est oublié (la session du compte est fermée), puis un nouveau jeton
  anonyme sert à un seul nouvel essai. Un second `401` donne l'erreur `unauthorized`.
- Le genre d'erreur dépend du code HTTP : `400` `invalid-request`, `422` `unprocessable`,
  `429` `rate-limited` (avec le délai `Retry-After`), `500`, réseau ou réponse hors contrat
  `server` (avec `errorId`). `ApiError` gagne le genre `rate-limited` et `retryAfterSeconds`.
- Écran : un résumé (« Trajet de N points, de (lat ; lng) à (lat ; lng). »). Les points restent
  dans l'état de la page pour la future carte (#13). Aucune liste ni tracé sans maquette.
- Le moteur (core-moteur jusqu'à v0.3.1) ne tient pas encore compte du profil : le résumé le dit
  tant que `ENGINE_USES_MOBILITY_PROFILE` vaut `false`.

## Conséquences

- Les variantes de l'écran 0002 (adresse introuvable sur un champ précis, « zone non couverte »
  et « aucun trajet accessible ») sont fusionnées : un même code HTTP donne un seul message. Pour les
  distinguer à nouveau, il faudra demander à api-back des codes d'erreur stables dans le corps.
- Après un `401` sur un jeton de compte, l'utilisateur est déconnecté sans message dédié : l'en-tête
  de l'app n'affiche pas encore l'état de la session.
- api-back ne renvoie pas encore de `429` (aucune limite de débit sur `main`) : ce cas n'est vérifié
  que par les tests.
