# 0002 — Stockage local du profil de mobilité (en attendant l'API)

- Date : 2026-11-18
- Statut : proposée
- Décideurs : à valider par un référent (back et front)
- Tickets liés : #17

## Contexte

Le ticket #17 demande que le profil de mobilité soit enregistré puis rechargé à la connexion. À notre connaissance, api-back n'expose aucun contrat de lecture/écriture du profil : on ne l'invente pas côté web. Seule la correspondance mode → `mobility_profile` est connue (note de la maquette, nœud 117:117).

Le profil révèle potentiellement un handicap : c'est une donnée de santé (RGPD), le consentement est donc obligatoire avant tout enregistrement.

## Options envisagées

- A : inventer un endpoint et un schéma côté web. Rejetée (contrat non validé).
- B : stockage local dans `localStorage`. Rejetée : la donnée de santé persisterait sur l'appareil au-delà de la session.
- C : port de stockage + implémentation `sessionStorage`. **Retenue.**
- D : état en mémoire seul. Rejetée : le profil serait perdu au rechargement de la page.

## Décision

- Un port `MobilityProfileStore` (`src/app/profile/mobility-profile.store.ts`, jeton `MOBILITY_PROFILE_STORE`) définit `load`, `save` et `clear`.
- L'implémentation par défaut est `SessionMobilityProfileStore` (clé `astrea.mobility-profile`) : le profil survit au rechargement mais disparaît à la fermeture de l'onglet.
- L'enregistrement contient le profil et l'horodatage du consentement ; `MobilityProfileService.save` refuse d'écrire sans consentement.
- `MobilityProfileService` est l'état partagé : il expose `profile` et `mobilityProfile` (0, 1, 2 ou 3, ou `null` sans profil). Correspondance : fauteuil manuel et électrique = 1, marche avec assistance = 2, piéton et poussette = 0, aveugle ou malvoyant = 3.
- Le branchement dans la demande d'itinéraire n'est pas fait (reste du ticket #17).

## Conséquences

- Écarts de périmètre à valider :
  - Le ticket parle de « largeur du fauteuil » et de « pente maximale » ; la maquette validée retient profils, modèle de fauteuil, force physique et accompagnement. Le code suit la maquette.
  - La largeur (0,70 m dans la maquette) est une constante par défaut (`DEFAULT_WHEELCHAIR_WIDTH_M`) : il n'existe ni catalogue de modèles ni source de mesure. La « pente maximale » n'est pas saisie.
  - Valeurs par défaut prudentes : escaliers non montés et pas d'accompagnement supposé.
- Quand l'API existera, une implémentation HTTP du port la remplacera sans modifier la page ni le service ; le consentement et le format d'enregistrement devront alors être alignés avec le back.
- Retrait du consentement (écran Réglages, hors ticket) : appeler `MobilityProfileService.clear()`.
