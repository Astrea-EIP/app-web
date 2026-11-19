# 0003 — Client HTTP typé et normalisation des erreurs

- Date : 2026-10-10
- Statut : proposée
- Décideurs : Carlos
- Tickets liés : #8 (référencé, ticket fermé)

## Contexte

Le ticket #8 demandait un client HTTP typé pour consommer `api-back`, avec une gestion des erreurs homogène. Le back-end renvoie deux formes d'erreur, sérialisées en camelCase par `Program.cs` :

- `ErrorResponse { error }` avec le statut 400 (échec de validation) ;
- `ServerErrorResponse { error, errorId }` avec le statut 500, produite par `ExceptionHandlingMiddleware`.

Sans couche commune, chaque appelant devrait inspecter un `HttpErrorResponse`, distinguer lui-même une erreur réseau d'une erreur serveur, et extraire le message du corps.

`AccessTokenMiddleware` lit le jeton dans un en-tête littéral `access-token`. La gestion du jeton (obtention, stockage) relève du service d'authentification et n'est pas traitée ici.

`src/environments/environment.ts` porte déjà `apiUrl`.

## Options envisagées

**URL de base**

- A : lire `environment.apiUrl` directement. **Retenue** : source déjà existante, surchargée par environnement via le remplacement de fichiers d'Angular.
- B : jeton d'injection dédié (`API_CONFIG`). Refusée : il doublonnerait `environment.apiUrl` sans rien apporter d'autre.

**Gestion du jeton**

- A : `ApiClient` reste générique et reçoit les en-têtes de l'appelant. **Retenue** : le client ne dépend d'aucun service d'authentification.
- B : `ApiClient` ajoute lui-même l'en-tête depuis un magasin de jeton. Refusée : elle couplerait le client à un choix de stockage non encore tranché.

**Forme des erreurs**

- A : un type `ApiError` unique, union discriminée sur `kind`. **Retenue** : les appelants raisonnent sur `kind` sans connaître HTTP.
- B : propager `HttpErrorResponse`. Refusée : chaque appelant redevrait normaliser.

## Décision

- `ApiClient` (`core/http/api-client.ts`) : méthodes `get` et `post` typées ; résolution des chemins contre `environment.apiUrl` (slash initial et final tolérés) ; en-têtes optionnels fournis par l'appelant ; toute erreur normalisée en `ApiError`.
- `ApiError` (`core/http/api-error.ts`) : union discriminée `validation | unauthorized | not-found | server | network | unknown`, avec `status`, `message`, `errorId` optionnel et corps brut pour le diagnostic. Reprend les champs `error` et `errorId` des DTO du back-end.
- Statut `0` : requête jamais parvenue au serveur (réseau, CORS, hors ligne) → `network`. Échec non HTTP (statut `-1`) → `unknown`, pour ne pas signaler à tort un serveur injoignable.
- Un message vide ou absent dans le corps est remplacé par un libellé générique par `kind`.
- Tests unitaires avec `provideHttpClientTesting` : succès, 400, 401, 404, 500, erreur réseau, message de repli, en-têtes.

## Conséquences

- `ApiClient` n'est pas encore branché sur `AuthFetcher` (`src/app/auth/`) : ce branchement est hors périmètre et fera l'objet d'un changement séparé.
- Les appelants qui ont besoin du jeton passent eux-mêmes l'en-tête `access-token` via l'option `headers`.
- `api-back` ne déclare aucune politique CORS : un appel navigateur direct échoue avec `kind: 'network'` tant que le back-end n'en ajoute pas. Ce point relève du back-end et n'est pas corrigé ici.
