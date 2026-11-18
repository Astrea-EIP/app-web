import { InjectionToken } from '@angular/core';

/**
 * Port du service d'itinéraire (POST /v0/itinerary).
 *
 * Le contrat de l'API n'est pas documenté dans ce dépôt : ces types sont PROVISOIRES et ne
 * décrivent que ce dont l'écran de saisie a besoin (voir docs/decisions/0002-port-service-itineraire.md).
 */
export interface ItineraryRequest {
  /** Adresse ou « lat,lng » saisi(e) par l'utilisateur, sans espaces superflus. */
  readonly origin: string;
  readonly destination: string;
}

export interface ItineraryResult {
  /** `false` : le calcul s'est bien passé mais ne renvoie aucun trajet exploitable. */
  readonly routeFound: boolean;
}

export type ItineraryErrorKind =
  | 'address-not-found' // 400 : adresse non résolue
  | 'uncovered-zone' // 422 : zone non couverte
  | 'no-accessible-route' // 422 : aucun trajet accessible pour ce profil
  | 'server'; // 500 et erreurs réseau

export interface ItineraryErrorDetails {
  readonly field?: 'origin' | 'destination';
  readonly address?: string;
  /** Identifiant renvoyé par le serveur pour le support (affiché tel quel). */
  readonly errorCode?: string;
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
