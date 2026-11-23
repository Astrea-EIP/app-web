---
title: Couche API
sidebar_position: 4
---

# Couche API

Le code d'intégration à `api-back` vit sous `src/app/core/http/`.

## Structure

| Chemin                    | Rôle                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `core/http/api-error.ts`  | Type `ApiError` et normalisation des échecs.                                    |
| `core/http/api-client.ts` | `ApiClient` : requêtes `get`, `post`, `put` et `delete` typées vers `api-back`. |

## Configuration

`ApiClient` lit l'URL de base dans `environment.apiUrl` : aucune URL n'est écrite en dur dans le client. Les chemins peuvent être passés avec ou sans `/` initial.

```ts
this.api.get<TokenResponse>('v0/auth/anonymous');
```

## En-têtes et jeton d'accès

`AccessTokenMiddleware` de `api-back` lit un en-tête littéral `access-token`, et non `Authorization: Bearer`.

`ApiClient` ne gère pas le jeton : il n'ajoute aucun en-tête de lui-même. Un service appelant fournit l'en-tête via l'option `headers` :

```ts
this.api.get<Itinerary[]>('v0/itineraries', { headers: { 'access-token': token } });
```

`HttpAccountService` (`src/app/auth/`) s'appuie sur `ApiClient` pour `POST v0/auth/register` et `POST v0/auth/login`. Le jeton renvoyé n'est pas encore conservé ni envoyé aux requêtes suivantes : c'est le sujet du ticket #84.

## Gestion des erreurs

Toute erreur est normalisée en `ApiError`, afin que les appelants n'aient jamais à inspecter un `HttpErrorResponse` :

```ts
this.api.get<Itinerary[]>('v0/itineraries').subscribe({
  next: (itineraries) => {},
  error: (error: ApiError) => {
    if (error.kind === 'network') {
      // api-back injoignable, ou requête bloquée par CORS.
    }
  },
});
```

| `kind`         | Statuts  | Signification                                                     |
| -------------- | -------- | ----------------------------------------------------------------- |
| `validation`   | 400, 422 | Requête rejetée ; `message` reprend le champ `error` du back-end. |
| `unauthorized` | 401, 403 | Jeton absent ou inconnu.                                          |
| `not-found`    | 404      | Ressource inexistante.                                            |
| `conflict`     | 409      | Conflit d'état (par exemple e-mail déjà utilisé à l'inscription). |
| `server`       | 5xx      | `ServerErrorResponse` ; `errorId` est renseigné.                  |
| `network`      | 0        | Requête jamais parvenue au serveur.                               |
| `unknown`      | autres   | Non mappé.                                                        |

Le `kind` `network` couvre aussi un rejet CORS : `api-back` ne déclare aucune politique CORS à ce jour, donc un appel navigateur direct échoue avec le statut `0`.

Voir `docs/decisions/0003-client-http-erreurs-api.md`.
