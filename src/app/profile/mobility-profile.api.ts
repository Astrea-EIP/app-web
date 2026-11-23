import {
  DEFAULT_WHEELCHAIR_WIDTH_M,
  MOBILITY_PROFILE_IDS,
  MobilityProfileCode,
  MobilityProfileData,
  MobilityProfileId,
  PhysicalStrength,
  StairsOrSlopes,
  isWheelchairProfile,
  toMobilityProfileCode,
} from './mobility-profile.models';
import { StoredMobilityProfile } from './mobility-profile.store';

/**
 * Contrat du profil de mobilité d'api-back (`/v0/users/me/profile`, docs/contracts/accounts.md).
 * Les champs ont les noms et les valeurs de `POST /v0/itinerary`.
 */

/** Bits de `path_preferences` (profil piéton uniquement). */
export const PATH_PREFERENCE = {
  Stairs: 1,
  Slopes: 2,
  WidePathways: 4,
  LitStreets: 8,
  Benches: 16,
} as const;

export interface ProfileRequest {
  /** Doit valoir `true` : le consentement au stockage du profil, donnée de santé. */
  consent: true;
  /** Valeur libre pour les apps : retrouve le choix du formulaire (poussette et piéton valent tous deux 0). */
  app_profile?: string;
  mobility_profile: MobilityProfileCode;
  wheelchair_model_id?: string;
  wheelchair_width?: number;
  physical_strength?: 0 | 1 | 2;
  is_accompanied?: boolean;
  can_climb_stairs?: boolean;
  path_preferences?: number;
}

export interface ProfileResponse extends Omit<ProfileRequest, 'consent'> {
  consent: boolean;
  consent_given_at: string;
  updated_at: string;
}

const STRENGTH_TO_CODE: Readonly<Record<PhysicalStrength, 0 | 1 | 2>> = {
  low: 0,
  medium: 1,
  high: 2,
};
const STRENGTHS: readonly PhysicalStrength[] = ['low', 'medium', 'high'];

/** Profil proposé par défaut pour un code `mobility_profile` quand `app_profile` est absent ou incohérent. */
const DEFAULT_PROFILE_OF_CODE: Readonly<Record<MobilityProfileCode, MobilityProfileId>> = {
  0: 'pedestrian',
  1: 'manual-wheelchair',
  2: 'assisted-walking',
  3: 'visually-impaired',
};

function pathPreferences(data: {
  stairsOrSlopes: StairsOrSlopes;
  preferWidePaths: boolean;
  preferLitStreets: boolean;
  requireBenches: boolean;
}): number {
  return (
    (data.stairsOrSlopes === 'stairs' ? PATH_PREFERENCE.Stairs : 0) |
    (data.stairsOrSlopes === 'slopes' ? PATH_PREFERENCE.Slopes : 0) |
    (data.preferWidePaths ? PATH_PREFERENCE.WidePathways : 0) |
    (data.preferLitStreets ? PATH_PREFERENCE.LitStreets : 0) |
    (data.requireBenches ? PATH_PREFERENCE.Benches : 0)
  );
}

/** Profil de l'app → corps de `PUT /v0/users/me/profile`. Seuls les champs du profil choisi sont envoyés. */
export function toProfileRequest(data: MobilityProfileData): ProfileRequest {
  const base = {
    consent: true,
    app_profile: data.profile,
    mobility_profile: toMobilityProfileCode(data.profile),
  } as const;

  switch (data.profile) {
    case 'manual-wheelchair':
    case 'electric-wheelchair':
      return {
        ...base,
        ...(data.wheelchairModelId ? { wheelchair_model_id: data.wheelchairModelId } : {}),
        wheelchair_width: data.wheelchairWidthM,
        physical_strength: STRENGTH_TO_CODE[data.strength],
        is_accompanied: data.accompanied,
      };
    case 'assisted-walking':
      return { ...base, can_climb_stairs: data.canClimbStairs };
    case 'visually-impaired':
      return { ...base, is_accompanied: data.accompanied };
    case 'pedestrian':
      return { ...base, path_preferences: pathPreferences(data) };
    case 'stroller':
      return base;
  }
}

function isProfileId(value: string | undefined): value is MobilityProfileId {
  return MOBILITY_PROFILE_IDS.some((id) => id === value);
}

/**
 * Réponse de `GET`/`PUT /v0/users/me/profile` → enregistrement de l'app.
 *
 * `modelLabel` donne le libellé d'un modèle à partir de son identifiant (catalogue) ; sans libellé
 * connu, l'identifiant sert de libellé.
 */
export function fromProfileResponse(
  response: ProfileResponse,
  modelLabel: (modelId: string) => string | undefined,
): StoredMobilityProfile {
  const code = response.mobility_profile;
  const chosen = isProfileId(response.app_profile) ? response.app_profile : undefined;
  const profile =
    chosen && toMobilityProfileCode(chosen) === code ? chosen : DEFAULT_PROFILE_OF_CODE[code];

  return {
    version: 1,
    consentGivenAt: response.consent_given_at,
    data: dataOf(profile, response, modelLabel),
  };
}

function dataOf(
  profile: MobilityProfileId,
  response: ProfileResponse,
  modelLabel: (modelId: string) => string | undefined,
): MobilityProfileData {
  if (isWheelchairProfile(profile)) {
    const modelId = response.wheelchair_model_id;
    return {
      profile,
      wheelchairModel: modelId ? (modelLabel(modelId) ?? modelId) : '',
      ...(modelId ? { wheelchairModelId: modelId } : {}),
      wheelchairWidthM: response.wheelchair_width ?? DEFAULT_WHEELCHAIR_WIDTH_M,
      strength: STRENGTHS[response.physical_strength ?? 1],
      accompanied: response.is_accompanied ?? false,
    };
  }
  switch (profile) {
    case 'assisted-walking':
      return { profile, canClimbStairs: response.can_climb_stairs ?? false };
    case 'visually-impaired':
      return { profile, accompanied: response.is_accompanied ?? false };
    case 'stroller':
      return { profile };
    default: {
      const mask = response.path_preferences ?? 0;
      const stairs = (mask & PATH_PREFERENCE.Stairs) !== 0;
      const slopes = (mask & PATH_PREFERENCE.Slopes) !== 0;
      return {
        profile: 'pedestrian',
        stairsOrSlopes: stairs && !slopes ? 'stairs' : slopes && !stairs ? 'slopes' : 'none',
        preferWidePaths: (mask & PATH_PREFERENCE.WidePathways) !== 0,
        preferLitStreets: (mask & PATH_PREFERENCE.LitStreets) !== 0,
        requireBenches: (mask & PATH_PREFERENCE.Benches) !== 0,
      };
    }
  }
}
