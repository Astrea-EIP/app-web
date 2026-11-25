import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { ApiClient } from '../core/http/api-client';
import { ApiError } from '../core/http/api-error';
import { MobilityProfileService } from '../profile/mobility-profile.service';
import { toItineraryRequest, toItineraryResult } from './itinerary.api';
import {
  ItineraryError,
  ItineraryRequest,
  ItineraryResult,
  ItineraryService,
} from './itinerary.service';

const ITINERARY_PATH = 'v0/itinerary';

/**
 * Implémentation HTTP du port `ITINERARY_SERVICE` (décision 0006).
 *
 * - Le corps est construit à partir du profil enregistré (`MobilityProfileService`). Sans profil,
 *   l'API n'est pas appelée.
 * - Jeton : celui du compte connecté (`SessionService`), sinon un jeton anonyme gardé en mémoire de
 *   ce service, jamais dans le stockage du navigateur (décision 0005).
 * - `401` : jeton oublié (la session du compte est fermée), nouveau jeton anonyme, un seul nouvel essai.
 * - Le texte `error` de l'API sert au debug (api-back#125) : il est journalisé, jamais affiché.
 */
@Injectable({ providedIn: 'root' })
export class HttpItineraryService implements ItineraryService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly mobilityProfile = inject(MobilityProfileService);

  private anonymousToken: string | null = null;

  async compute(request: ItineraryRequest): Promise<ItineraryResult> {
    const profile = this.mobilityProfile.profile();
    if (!profile) {
      throw new ItineraryError('no-profile');
    }
    const body = toItineraryRequest(request.origin, request.destination, profile);

    try {
      const token = await this.token();
      try {
        return await this.post(body, token);
      } catch (error) {
        if (!isApiError(error) || error.kind !== 'unauthorized') {
          throw error;
        }
        this.forget(token);
        return await this.post(body, await this.token());
      }
    } catch (error) {
      throw toItineraryError(error);
    }
  }

  private async post(body: unknown, token: string): Promise<ItineraryResult> {
    const response = await firstValueFrom(
      this.api.post<unknown>(ITINERARY_PATH, body, { headers: { 'access-token': token } }),
    );
    return toItineraryResult(response);
  }

  private async token(): Promise<string> {
    const accountToken = this.session.accessToken();
    if (accountToken) {
      return accountToken;
    }
    this.anonymousToken ??= (await firstValueFrom(this.auth.getAnonymousToken())).accessToken;
    return this.anonymousToken;
  }

  /** Jeton refusé : un jeton de compte ferme la session (décision 0005), un jeton anonyme est oublié. */
  private forget(token: string): void {
    if (token === this.session.accessToken()) {
      this.session.end();
    }
    if (token === this.anonymousToken) {
      this.anonymousToken = null;
    }
  }
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Partial<ApiError>).kind === 'string' &&
    typeof (error as Partial<ApiError>).status === 'number'
  );
}

/** Choisit le genre d'erreur selon le code HTTP. Le message de l'API part dans la console seulement. */
function toItineraryError(error: unknown): ItineraryError {
  if (!isApiError(error)) {
    console.warn('[itinerary] échec hors HTTP', String(error));
    return new ItineraryError('server');
  }
  console.warn(
    `[itinerary] HTTP ${error.status}${error.errorId ? ` (errorId ${error.errorId})` : ''}`,
    error.message,
  );
  switch (error.status) {
    case 400:
      return new ItineraryError('invalid-request');
    case 401:
      return new ItineraryError('unauthorized');
    case 422:
      return new ItineraryError('unprocessable');
    case 429:
      return new ItineraryError(
        'rate-limited',
        error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {},
      );
    default:
      return new ItineraryError('server', error.errorId ? { errorId: error.errorId } : {});
  }
}
