# 0004 — Profil de mobilité enregistré via api-back

- Date : 2026-11-23
- Statut : proposée
- Décideurs : à valider par un référent (back et front)
- Tickets liés : #17
- Remplace partiellement : 0002 (stockage local), pour la partie « aucun contrat n'existe »

## Contexte

Le stockage local de la décision 0002 attendait un contrat d'api-back. Il existe maintenant : `docs/contracts/accounts.md` (api-back, PR #116 à #118, le fichier `accounts.openapi.yaml` provisoire étant remplacé par `docs/api.json`, généré) définit `GET`, `PUT` et `DELETE /v0/users/me/profile`, ainsi que le catalogue `GET /v0/wheelchairs`.

Points du contrat qui touchent le web :

- le profil reprend les champs de `POST /v0/itinerary`, en snake_case ;
- `poussette` et `piéton` valent tous deux `mobility_profile: 0`, le choix du formulaire se garde dans `app_profile` ;
- le modèle de fauteuil est un `wheelchair_model_id` du catalogue, la largeur envoyée est son `recommended_wheelchair_width` ;
- les routes `/v0/users/me/*` exigent le jeton d'un compte connecté (le jeton anonyme reçoit 401) ;
- le consentement se donne sur le profil (`consent: true` sur le `PUT`) et le `DELETE` du profil le retire.

## Décision

- `mobility-profile.api.ts` : fonctions pures `toProfileRequest` et `fromProfileResponse` entre le profil de l'app et le contrat (`mobility_profile` 0 à 3, `physical_strength` 0/1/2, `is_accompanied`, `can_climb_stairs`, `path_preferences` en masque de bits : Stairs 1, Slopes 2, WidePathways 4, LitStreets 8, Benches 16). Un `app_profile` incohérent avec `mobility_profile` est ignoré.
- `mobility-profile.http.ts` : `MobilityProfileHttp` (chargement, enregistrement, retrait du profil, liste des modèles de fauteuil). Le jeton est fourni par l'appelant, comme le prévoit `ApiClient` (décision 0003). Un `404` au chargement signifie « pas de profil » et renvoie `null`.
- `MobilityProfileData` gagne un `wheelchairModelId` optionnel.

## Ce qui n'est pas décidé ici

- Le branchement de `MobilityProfileService` sur `MobilityProfileHttp` : il suppose qu'un service garde le jeton du compte connecté (`AccountSession.accessToken`), ce qui n'existe pas encore.
- Le remplacement du champ libre « Modèle de fauteuil » par un sélecteur alimenté par le catalogue : il demande un composant de sélection partagé et la maquette correspondante.
- L'emplacement du consentement (inscription ou profil), à trancher avec l'équipe back.

## Conséquences

- Tant que le branchement n'est pas fait, le profil reste enregistré localement (décision 0002) et la largeur envoyée au calcul reste 0,70 m.
- Un profil rechargé depuis l'API remet le formulaire dans l'état choisi grâce à `app_profile`.
