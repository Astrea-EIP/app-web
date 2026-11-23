/**
 * Modèle du profil de mobilité, d'après la maquette Figma « 30 - Web » (frames 03a à 03g).
 * Ce n'est PAS un contrat d'API : aucun contrat de lecture/écriture du profil n'existe dans api-back
 * (voir docs/decisions/0002-stockage-local-profil-mobilite.md).
 */

export const MOBILITY_PROFILE_IDS = [
  'manual-wheelchair',
  'electric-wheelchair',
  'assisted-walking',
  'pedestrian',
  'stroller',
  'visually-impaired',
] as const;

export type MobilityProfileId = (typeof MOBILITY_PROFILE_IDS)[number];

/** Valeur numérique `mobility_profile` attendue par l'API (note de la maquette, nœud 117:117). */
export type MobilityProfileCode = 0 | 1 | 2 | 3;

export const MOBILITY_PROFILE_CODES: Readonly<Record<MobilityProfileId, MobilityProfileCode>> = {
  'manual-wheelchair': 1,
  'electric-wheelchair': 1,
  'assisted-walking': 2,
  pedestrian: 0,
  stroller: 0,
  'visually-impaired': 3,
};

export function toMobilityProfileCode(id: MobilityProfileId): MobilityProfileCode {
  return MOBILITY_PROFILE_CODES[id];
}

export type PhysicalStrength = 'low' | 'medium' | 'high';
export type StairsOrSlopes = 'none' | 'stairs' | 'slopes';

export type WheelchairProfileId = 'manual-wheelchair' | 'electric-wheelchair';

export type MobilityProfileData =
  | {
      profile: WheelchairProfileId;
      /** Libellé du modèle choisi (marque et gamme du catalogue `GET /v0/wheelchairs`). */
      wheelchairModel: string;
      /** Identifiant stable du modèle dans le catalogue, envoyé comme `wheelchair_model_id`. */
      wheelchairModelId?: string;
      /** Largeur utilisée pour le calcul d'itinéraire, en mètres. */
      wheelchairWidthM: number;
      strength: PhysicalStrength;
      accompanied: boolean;
    }
  | { profile: 'assisted-walking'; canClimbStairs: boolean }
  | {
      profile: 'pedestrian';
      stairsOrSlopes: StairsOrSlopes;
      preferWidePaths: boolean;
      preferLitStreets: boolean;
      requireBenches: boolean;
    }
  | { profile: 'stroller' }
  | { profile: 'visually-impaired'; accompanied: boolean };

/**
 * La maquette affiche 0,70 m sans catalogue de modèles ni contrat de mesure : valeur par défaut
 * pour tous les modèles, en attendant une source de données validée.
 */
export const DEFAULT_WHEELCHAIR_WIDTH_M = 0.7;

export const WHEELCHAIR_MODEL_MAX_LENGTH = 80;

/** Bornes de la largeur saisie à la main, en mètres : celles d'api-back (`wheelchair_width` > 0 et ≤ 2). */
export const WHEELCHAIR_WIDTH_MIN_M = 0.1;
export const WHEELCHAIR_WIDTH_MAX_M = 2;

export function isWheelchairProfile(id: MobilityProfileId | null): id is WheelchairProfileId {
  return id === 'manual-wheelchair' || id === 'electric-wheelchair';
}

/** Valeurs brutes du formulaire (tous les champs existent, seuls ceux du profil choisi comptent). */
export interface MobilityProfileFormValue {
  profile: MobilityProfileId | null;
  wheelchairModel: string;
  /** Identifiant du modèle choisi dans le catalogue ; vide pour une saisie manuelle. */
  wheelchairModelId: string;
  /** Largeur en mètres : celle du catalogue pour un modèle choisi, saisie sinon. */
  wheelchairWidthM: number;
  strength: PhysicalStrength;
  accompanied: boolean;
  canClimbStairs: boolean;
  stairsOrSlopes: StairsOrSlopes;
  preferWidePaths: boolean;
  preferLitStreets: boolean;
  requireBenches: boolean;
}

/** Valeurs par défaut : les plus prudentes pour le calcul (pas d'escaliers, pas d'accompagnement supposé). */
export const DEFAULT_FORM_VALUE: MobilityProfileFormValue = {
  profile: null,
  wheelchairModel: '',
  wheelchairModelId: '',
  wheelchairWidthM: DEFAULT_WHEELCHAIR_WIDTH_M,
  strength: 'medium',
  accompanied: false,
  canClimbStairs: false,
  stairsOrSlopes: 'none',
  preferWidePaths: false,
  preferLitStreets: false,
  requireBenches: false,
};

/** Ne garde que les champs qui concernent le profil choisi. Renvoie null si aucun profil n'est choisi. */
export function buildProfileData(value: MobilityProfileFormValue): MobilityProfileData | null {
  switch (value.profile) {
    case 'manual-wheelchair':
    case 'electric-wheelchair':
      return {
        profile: value.profile,
        wheelchairModel: value.wheelchairModel.trim(),
        ...(value.wheelchairModelId ? { wheelchairModelId: value.wheelchairModelId } : {}),
        wheelchairWidthM: value.wheelchairWidthM,
        strength: value.strength,
        accompanied: value.accompanied,
      };
    case 'assisted-walking':
      return { profile: 'assisted-walking', canClimbStairs: value.canClimbStairs };
    case 'pedestrian':
      return {
        profile: 'pedestrian',
        stairsOrSlopes: value.stairsOrSlopes,
        preferWidePaths: value.preferWidePaths,
        preferLitStreets: value.preferLitStreets,
        requireBenches: value.requireBenches,
      };
    case 'stroller':
      return { profile: 'stroller' };
    case 'visually-impaired':
      return { profile: 'visually-impaired', accompanied: value.accompanied };
    default:
      return null;
  }
}

/** Inverse de `buildProfileData` : recharge un profil enregistré dans le formulaire. */
export function toFormValue(data: MobilityProfileData): MobilityProfileFormValue {
  const base: MobilityProfileFormValue = { ...DEFAULT_FORM_VALUE, profile: data.profile };
  switch (data.profile) {
    case 'manual-wheelchair':
    case 'electric-wheelchair':
      return {
        ...base,
        wheelchairModel: data.wheelchairModel,
        wheelchairModelId: data.wheelchairModelId ?? '',
        wheelchairWidthM: data.wheelchairWidthM,
        strength: data.strength,
        accompanied: data.accompanied,
      };
    case 'assisted-walking':
      return { ...base, canClimbStairs: data.canClimbStairs };
    case 'pedestrian':
      return {
        ...base,
        stairsOrSlopes: data.stairsOrSlopes,
        preferWidePaths: data.preferWidePaths,
        preferLitStreets: data.preferLitStreets,
        requireBenches: data.requireBenches,
      };
    case 'visually-impaired':
      return { ...base, accompanied: data.accompanied };
    case 'stroller':
      return base;
  }
}

export interface ProfileOptionDefinition {
  id: MobilityProfileId;
  label: string;
  description: string;
}

/** Libellés et descriptions de la maquette (frame 03a), dans l'ordre d'affichage. */
export const PROFILE_OPTIONS: readonly ProfileOptionDefinition[] = [
  {
    id: 'manual-wheelchair',
    label: 'Fauteuil manuel',
    description: 'Pente douce, largeur minimale',
  },
  {
    id: 'electric-wheelchair',
    label: 'Fauteuil électrique',
    description: 'Passages larges, équipement motorisé',
  },
  {
    id: 'assisted-walking',
    label: 'Marche avec assistance',
    description: 'Évite les escaliers et les pentes raides',
  },
  { id: 'pedestrian', label: 'Piéton', description: 'Sans aide à la mobilité' },
  {
    id: 'stroller',
    label: 'Poussette / Chariot',
    description: 'Rampes d’accès, évite les marches',
  },
  { id: 'visually-impaired', label: 'Aveugle ou malvoyant', description: 'Parcours adaptés' },
];

export const STRENGTH_LABELS: Readonly<Record<PhysicalStrength, string>> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};

export const STAIRS_OR_SLOPES_LABELS: Readonly<Record<StairsOrSlopes, string>> = {
  none: 'Pas de préférence',
  stairs: 'Escaliers',
  slopes: 'Pentes',
};

export interface RecapRow {
  label: string;
  value: string;
}

function yesNo(value: boolean): string {
  return value ? 'Oui' : 'Non';
}

export function formatWidth(widthM: number): string {
  return `${widthM.toFixed(2).replace('.', ',')} m`;
}

/** Lignes du « Passeport d'accessibilité » (frame 03g). */
export function buildRecapRows(data: MobilityProfileData): RecapRow[] {
  const mode: RecapRow = {
    label: 'Mode de mobilité',
    value: PROFILE_OPTIONS.find((option) => option.id === data.profile)!.label,
  };
  switch (data.profile) {
    case 'manual-wheelchair':
    case 'electric-wheelchair':
      return [
        mode,
        {
          label: 'Modèle de fauteuil',
          value: `${data.wheelchairModel} (${formatWidth(data.wheelchairWidthM)})`,
        },
        { label: 'Force physique', value: STRENGTH_LABELS[data.strength] },
        { label: 'Je suis accompagné(e)', value: yesNo(data.accompanied) },
      ];
    case 'assisted-walking':
      return [mode, { label: 'Je peux monter des escaliers', value: yesNo(data.canClimbStairs) }];
    case 'pedestrian':
      return [
        mode,
        { label: 'Escaliers ou pentes', value: STAIRS_OR_SLOPES_LABELS[data.stairsOrSlopes] },
        { label: 'Privilégier les chemins larges', value: yesNo(data.preferWidePaths) },
        { label: 'Privilégier les rues éclairées', value: yesNo(data.preferLitStreets) },
        { label: 'Exiger des bancs sur le parcours', value: yesNo(data.requireBenches) },
      ];
    case 'stroller':
      return [mode];
    case 'visually-impaired':
      return [mode, { label: 'Je suis accompagné(e)', value: yesNo(data.accompanied) }];
  }
}
