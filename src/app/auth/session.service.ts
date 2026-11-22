import { Injectable, computed, signal } from '@angular/core';

/**
 * Session du compte connecté : le jeton d'accès, gardé en mémoire uniquement.
 *
 * Choix volontaire : rien n'est écrit dans `localStorage`, `sessionStorage` ni un cookie lisible
 * par le script. Un script injecté ne peut donc pas voler le jeton après coup. Le prix : un
 * rechargement de la page ou la fermeture de l'onglet déconnecte. Un cookie `HttpOnly` posé par
 * api-back permettrait de garder la session sans exposer le jeton au script (demande au back).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly token = signal<string | null>(null);

  /** Jeton du compte connecté, ou null. À envoyer dans l'en-tête `access-token`. */
  readonly accessToken = this.token.asReadonly();

  readonly isAuthenticated = computed(() => this.token() !== null);

  /** Ouvre la session après une connexion ou une création de compte réussie. */
  start(accessToken: string): void {
    this.token.set(accessToken);
  }

  /** Ferme la session : déconnexion, ou jeton refusé par l'API (401). */
  end(): void {
    this.token.set(null);
  }
}
