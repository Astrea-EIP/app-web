# 0002 — Port du service d'itinéraire et carte statique (saisie du trajet)

- Date : 2026-11-18
- Statut : proposée, partiellement remplacée par 0006 (branchement HTTP)
- Décideurs : à valider par l'équipe
- Tickets liés : #14

## Contexte

L'écran de saisie du trajet (#14) doit appeler `POST /v0/itinerary`. Le contrat de cette route (corps, réponse, forme des erreurs 400/422/500) n'est documenté ni dans ce dépôt ni dans `docs/`. Par ailleurs :

- aucune bibliothèque cartographique n'est choisie ;
- aucune source du profil de mobilité n'existe encore côté web ;
- l'API n'a ni recherche de lieux (suggestions) ni étapes intermédiaires, et la maquette les range dans « À venir ».

## Options envisagées

1. Inventer un client HTTP à partir des messages d'erreur de la maquette.
2. Définir un port (`ITINERARY_SERVICE`) avec une implémentation par défaut non branchée, et brancher l'API une fois le contrat documenté.

## Décision

Option 2. `src/app/itinerary/itinerary.service.ts` expose l'interface `ItineraryService` (`compute({ origin, destination })`), les types `ItineraryResult` et `ItineraryError` (genres `address-not-found`, `uncovered-zone`, `no-accessible-route`, `server`) et un jeton d'injection dont l'implémentation par défaut refuse toujours l'appel (« non branchée »). Ces types sont provisoires.

La carte de l'écran est une illustration statique, signalée comme telle à l'écran. Le badge de profil affiche un libellé générique tant qu'aucune source de profil n'existe.

## Conséquences

- En l'état, « Calculer l'itinéraire » aboutit à l'état « Un problème est survenu » (service non branché).
- À faire : documenter le contrat de `POST /v0/itinerary` (dépôt `docs`), puis fournir une implémentation HTTP du jeton et ajuster les types.
- Les étapes intermédiaires et les suggestions de lieux restent à décider (#14).
- À faire : carte interactive et profil réel dans des tickets dédiés.
