import { InjectionToken } from '@angular/core';
import { MobilityProfileData } from './mobility-profile.models';

/** Enregistrement du profil : les données de mobilité et la preuve du consentement RGPD (donnée de santé). */
export interface StoredMobilityProfile {
  version: 1;
  /** Horodatage ISO du consentement donné avant l'enregistrement. */
  consentGivenAt: string;
  data: MobilityProfileData;
}

/**
 * Port de stockage du profil de mobilité.
 * Aucun contrat de lecture/écriture n'existe dans api-back : l'implémentation fournie par défaut est
 * locale (sessionStorage). Une implémentation HTTP pourra la remplacer sans toucher au reste du code.
 */
export interface MobilityProfileStore {
  /** Profil enregistré, ou null s'il n'y en a pas (ou s'il est illisible). */
  load(): StoredMobilityProfile | null;
  /** Peut lever une erreur si le stockage est indisponible. */
  save(profile: StoredMobilityProfile): void;
  clear(): void;
}

export const MOBILITY_PROFILE_STORE = new InjectionToken<MobilityProfileStore>(
  'MOBILITY_PROFILE_STORE',
);
