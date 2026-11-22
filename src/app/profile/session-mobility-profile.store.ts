import { MobilityProfileStore, StoredMobilityProfile } from './mobility-profile.store';
import { MOBILITY_PROFILE_IDS } from './mobility-profile.models';

export const SESSION_STORAGE_KEY = 'astrea.mobility-profile';

/**
 * Stockage local dans sessionStorage : le profil survit au rechargement de la page mais disparaît à
 * la fermeture de l'onglet. Choix volontaire pour une donnée de santé tant que le serveur ne la porte pas.
 */
export class SessionMobilityProfileStore implements MobilityProfileStore {
  constructor(private readonly storage: Storage = sessionStorage) {}

  load(): StoredMobilityProfile | null {
    try {
      const raw = this.storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      return isStoredProfile(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(profile: StoredMobilityProfile): void {
    this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
  }

  clear(): void {
    try {
      this.storage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Stockage indisponible : rien à effacer.
    }
  }
}

function isStoredProfile(value: unknown): value is StoredMobilityProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { version?: unknown; consentGivenAt?: unknown; data?: unknown };
  const data = candidate.data as { profile?: unknown } | null | undefined;
  return (
    candidate.version === 1 &&
    typeof candidate.consentGivenAt === 'string' &&
    typeof data === 'object' &&
    data !== null &&
    (MOBILITY_PROFILE_IDS as readonly unknown[]).includes(data.profile)
  );
}
