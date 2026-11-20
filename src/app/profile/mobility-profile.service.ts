import { Injectable, computed, inject, signal } from '@angular/core';
import {
  MobilityProfileCode,
  MobilityProfileData,
  toMobilityProfileCode,
} from './mobility-profile.models';
import { MOBILITY_PROFILE_STORE, StoredMobilityProfile } from './mobility-profile.store';
import { SessionMobilityProfileStore } from './session-mobility-profile.store';

/**
 * État partagé du profil de mobilité. La demande d'itinéraire lira `mobilityProfile`
 * (valeur numérique `mobility_profile`) ; ce branchement n'est pas fait ici (ticket #17, case restante).
 */
@Injectable({ providedIn: 'root' })
export class MobilityProfileService {
  private readonly store =
    inject(MOBILITY_PROFILE_STORE, { optional: true }) ?? new SessionMobilityProfileStore();
  private readonly current = signal<StoredMobilityProfile | null>(null);

  /** Profil enregistré, ou null. */
  readonly profile = computed<MobilityProfileData | null>(() => this.current()?.data ?? null);

  /** Valeur `mobility_profile` de l'API, ou null tant qu'aucun profil n'est enregistré. */
  readonly mobilityProfile = computed<MobilityProfileCode | null>(() => {
    const data = this.profile();
    return data ? toMobilityProfileCode(data.profile) : null;
  });

  constructor() {
    this.load();
  }

  /** Recharge le profil depuis le stockage (appelé à la création du service, donc à l'ouverture de l'app). */
  load(): void {
    this.current.set(this.store.load());
  }

  /**
   * Enregistre le profil. Le consentement est obligatoire : sans lui, rien n'est écrit.
   * Lève une erreur si le stockage échoue (le profil courant reste alors inchangé).
   */
  save(data: MobilityProfileData, consent: boolean): void {
    if (!consent) {
      throw new Error('Le consentement est obligatoire avant d’enregistrer le profil de mobilité.');
    }
    const record: StoredMobilityProfile = {
      version: 1,
      consentGivenAt: this.current()?.consentGivenAt ?? new Date().toISOString(),
      data,
    };
    this.store.save(record);
    this.current.set(record);
  }

  /** Supprime le profil (retrait du consentement). */
  clear(): void {
    this.store.clear();
    this.current.set(null);
  }
}
