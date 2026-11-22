import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { ApiClient } from '../core/http/api-client';
import { ApiError } from '../core/http/api-error';
import { ProfileResponse, fromProfileResponse, toProfileRequest } from './mobility-profile.api';
import { MobilityProfileData } from './mobility-profile.models';
import { StoredMobilityProfile } from './mobility-profile.store';

/** Modèle de fauteuil du catalogue, prêt à alimenter le sélecteur du formulaire. */
export interface WheelchairModelOption {
  readonly id: string;
  /** Marque et gamme, par exemple « Invacare — Action, Küschall ». */
  readonly label: string;
  /** `manual` ou `electric`, identifiant de catégorie du catalogue. */
  readonly category: string;
  /** `recommended_wheelchair_width` du modèle, en mètres : la largeur à envoyer pour le calcul. */
  readonly widthM: number;
}

interface WheelchairCatalogueResponse {
  readonly categories: readonly {
    readonly id: string;
    readonly models: readonly {
      readonly id: string;
      readonly brand: string;
      readonly range: string;
      readonly recommended_wheelchair_width: number;
    }[];
  }[];
}

const PROFILE_PATH = 'v0/users/me/profile';

/**
 * Appels HTTP du profil de mobilité et du catalogue de fauteuils (docs/contracts/accounts.md).
 *
 * Le jeton est passé par l'appelant, comme le prévoit `ApiClient` : toutes ces routes veulent le jeton
 * d'un compte connecté (`access-token`), le jeton anonyme est refusé en 401 sur `/v0/users/me/*`.
 */
@Injectable({ providedIn: 'root' })
export class MobilityProfileHttp {
  private readonly api = inject(ApiClient);

  /** Modèles de fauteuil du catalogue `GET /v0/wheelchairs`, toutes catégories confondues. */
  loadWheelchairModels(token: string): Observable<WheelchairModelOption[]> {
    return this.api
      .get<WheelchairCatalogueResponse>('v0/wheelchairs', { headers: header(token) })
      .pipe(
        map(({ categories }) =>
          categories.flatMap((category) =>
            category.models.map((model) => ({
              id: model.id,
              label: `${model.brand} — ${model.range}`,
              category: category.id,
              widthM: model.recommended_wheelchair_width,
            })),
          ),
        ),
      );
  }

  /** Profil enregistré, ou `null` si l'utilisateur n'en a pas encore (404). */
  load(
    token: string,
    modelLabel: (modelId: string) => string | undefined,
  ): Observable<StoredMobilityProfile | null> {
    return this.api.get<ProfileResponse>(PROFILE_PATH, { headers: header(token) }).pipe(
      map((response) => fromProfileResponse(response, modelLabel)),
      catchError((error: ApiError) =>
        error.kind === 'not-found' ? of(null) : throwError(() => error),
      ),
    );
  }

  /** Crée ou remplace le profil. L'envoi vaut consentement : l'appelant l'a recueilli avant. */
  save(
    data: MobilityProfileData,
    token: string,
    modelLabel: (modelId: string) => string | undefined,
  ): Observable<StoredMobilityProfile> {
    return this.api
      .put<ProfileResponse>(PROFILE_PATH, toProfileRequest(data), { headers: header(token) })
      .pipe(map((response) => fromProfileResponse(response, modelLabel)));
  }

  /** Retire le consentement : l'API supprime le profil et la date de consentement, le compte reste. */
  clear(token: string): Observable<void> {
    return this.api.delete<void>(PROFILE_PATH, { headers: header(token) });
  }
}

function header(token: string): Record<string, string> {
  return { 'access-token': token };
}
