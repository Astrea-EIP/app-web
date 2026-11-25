import { InjectionToken } from '@angular/core';

/**
 * Port du service d'itinéraire (POST /v0/itinerary).
 *
 * L'implémentation HTTP est `HttpItineraryService`, branchée dans `app.config.ts`
 * (décisions 0002 et 0006).
 */
export interface ItineraryRequest {
  /** Adresse ou « lat,lng » saisi(e) par l'utilisateur, sans espaces superflus. */
  readonly origin: string;
  readonly destination: string;
}

export interface ItineraryPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface ItineraryResult {
  /** Points du trajet, dans l'ordre, du départ à l'arrivée. Vide : aucun trajet à afficher. */
  readonly points: readonly ItineraryPoint[];
}

/**
 * Le message affiché dépend du code HTTP, jamais du texte `error` de l'API, qui sert au debug
 * (api-back#125, décision 0006).
 */
export type ItineraryErrorKind =
  | 'no-profile' // aucun profil de mobilité enregistré : l'API n'est pas appelée
  | 'invalid-request' // 400 : saisie invalide ou adresse introuvable
  | 'unprocessable' // 422 : zone non couverte ou aucun trajet pour ce profil
  | 'unauthorized' // 401 encore après un nouveau jeton
  | 'rate-limited' // 429
  | 'server'; // 500, erreur réseau ou réponse hors contrat

export interface ItineraryErrorDetails {
  /** `errorId` d'une 500, à communiquer pour le signalement (affiché tel quel). */
  readonly errorId?: string;
  /** Délai demandé par `Retry-After` sur une 429, en secondes. */
  readonly retryAfterSeconds?: number;
}

export class ItineraryError extends Error {
  constructor(
    readonly kind: ItineraryErrorKind,
    readonly details: ItineraryErrorDetails = {},
  ) {
    super(`Itinerary error: ${kind}`);
    this.name = 'ItineraryError';
  }
}

export interface ItineraryService {
  compute(request: ItineraryRequest): Promise<ItineraryResult>;
}

/** Implémentation par défaut : volontairement NON branchée sur l'API. */
export class NotWiredItineraryService implements ItineraryService {
  compute(): Promise<ItineraryResult> {
    return Promise.reject(
      new Error('Service d’itinéraire non branché : contrat POST /v0/itinerary à documenter.'),
    );
  }
}

export const ITINERARY_SERVICE = new InjectionToken<ItineraryService>('ITINERARY_SERVICE', {
  providedIn: 'root',
  factory: () => new NotWiredItineraryService(),
});
