# 0005 — Jeton de session gardé en mémoire

- Date : 2026-11-23
- Statut : proposée
- Décideurs : à valider par un référent (back et front)
- Tickets liés : #12, #17

## Contexte

`POST /v0/auth/login` et `POST /v0/auth/register` renvoient `{ accessToken }`. Les routes
`/v0/users/me/*` et `GET /v0/wheelchairs` attendent ce jeton dans l'en-tête `access-token`. L'API ne
pose aucun cookie et n'a pas de jeton de rafraîchissement. Le jeton d'un compte vit 7 jours.

Le profil de mobilité est une donnée de santé : le jeton qui y donne accès doit être protégé.

## Options envisagées

- **`localStorage`** : le jeton survit à la fermeture du navigateur, mais tout script injecté (XSS)
  peut le lire. Écarté.
- **`sessionStorage`** : même exposition au XSS, durée limitée à l'onglet. Écarté pour l'instant.
- **Mémoire de l'application (signal)** : un script injecté ne peut pas le lire après coup. Un
  rechargement de la page ou la fermeture de l'onglet déconnecte.
- **Cookie `HttpOnly`** : le plus sûr, car le script ne le voit jamais. Il demande un changement
  d'api-back (`Set-Cookie`, CORS avec identifiants, protection CSRF), et app-mobile utilise l'en-tête.

## Décision

Le jeton est gardé en mémoire dans `SessionService` (`src/app/auth/session.service.ts`) et nulle part
ailleurs. La page `/auth` l'y place après une connexion ou une création de compte réussie. Un `401` de
l'API ferme la session et invite à se reconnecter.

Une demande à api-back est à faire pour un cookie `HttpOnly` (et un jeton de rafraîchissement), qui
permettrait de garder la session sans exposer le jeton au script.

## Conséquences

- Un rechargement de la page déconnecte : l'utilisateur se reconnecte.
- Le profil enregistré dans le compte est rechargé à chaque connexion ; la copie locale
  (`sessionStorage`, décision 0002) reste le repli sans compte.
- Aucun jeton dans le stockage du navigateur : un test le vérifie (`session.service.spec.ts`).
- Quand api-back proposera le cookie, seul `SessionService` et les appels authentifiés changent.
