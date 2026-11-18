export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  /** Date de naissance au format ISO (AAAA-MM-JJ). */
  birthDate: string;
  /** Consentement RGPD (localisation et profil de mobilité), toujours `true` à l'envoi. */
  consent: true;
}

export interface AccountSession {
  accessToken: string;
}

export type AccountErrorCode =
  'unavailable' | 'invalid-credentials' | 'email-already-used' | 'unknown';

/** Erreur typée renvoyée par le port `AccountService`. */
export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AccountError';
  }
}
