import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { SessionService } from '../auth/session.service';
import type { ApiError } from '../core/http/api-error';
import { MobilityProfileHttp } from './mobility-profile.http';
import {
  MobilityProfileCode,
  MobilityProfileData,
  toMobilityProfileCode,
} from './mobility-profile.models';
import { MOBILITY_PROFILE_STORE, StoredMobilityProfile } from './mobility-profile.store';
import { SessionMobilityProfileStore } from './session-mobility-profile.store';
import { WheelchairCatalogue } from './wheelchair-catalogue.service';

/**
 * État partagé du profil de mobilité. La demande d'itinéraire lira `mobilityProfile`
 * (valeur numérique `mobility_profile`) ; ce branchement n'est pas fait ici (ticket #17, case restante).
 *
 * Sans compte connecté, le profil reste dans le stockage local (décision 0002). Avec un compte, il est
 * aussi enregistré dans api-back (décision 0004) et rechargé depuis l'API à la connexion.
 */
@Injectable({ providedIn: 'root' })
export class MobilityProfileService {
  private readonly store =
    inject(MOBILITY_PROFILE_STORE, { optional: true }) ?? new SessionMobilityProfileStore();
  private readonly session = inject(SessionService);
  private readonly http = inject(MobilityProfileHttp);
  private readonly catalogue = inject(WheelchairCatalogue);
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
    // À la connexion, le profil du compte remplace celui du stockage local.
    effect(() => {
      const token = this.session.accessToken();
      if (token) {
        untracked(() => this.loadRemote(token));
      }
    });
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

  /**
   * Enregistre le profil en local, puis dans api-back si un compte est connecté.
   * L'erreur de l'API (ApiError) est transmise à l'appelant ; un 401 ferme la session.
   * Le consentement est obligatoire : sans lui, rien n'est écrit ni envoyé.
   */
  saveAndSync(data: MobilityProfileData, consent: boolean): Observable<void> {
    this.save(data, consent);
    const token = this.session.accessToken();
    if (!token) {
      return of(undefined);
    }
    return this.http
      .save(data, token, (id) => this.catalogue.label(id))
      .pipe(
        tap((record) => this.current.set(record)),
        map(() => undefined),
        catchError((error: unknown) => this.failRemote(error)),
      );
  }

  /** Supprime le profil (retrait du consentement), en local puis dans api-back si un compte est connecté. */
  clear(): void {
    this.store.clear();
    this.current.set(null);
    const token = this.session.accessToken();
    if (token) {
      this.http
        .clear(token)
        .pipe(catchError((error: unknown) => this.failRemote(error)))
        .subscribe({ error: () => undefined });
    }
  }

  /** Charge le profil du compte (et le catalogue pour en afficher les libellés). 404 : pas encore de profil. */
  private loadRemote(token: string): void {
    this.catalogue
      .ensureLoaded()
      .pipe(
        switchMap(() => this.http.load(token, (id) => this.catalogue.label(id))),
        catchError((error: unknown) => this.failRemote(error)),
      )
      .subscribe({
        next: (record) => {
          if (record) {
            this.current.set(record);
            this.persistLocally(record);
          }
        },
        error: () => undefined,
      });
  }

  private persistLocally(record: StoredMobilityProfile): void {
    try {
      this.store.save(record);
    } catch {
      // Stockage local indisponible : le profil reste en mémoire pour cette session.
    }
  }

  /** Un 401 veut dire jeton expiré ou refusé : on ferme la session pour renvoyer vers la connexion. */
  private failRemote(error: unknown): Observable<never> {
    if (isUnauthorized(error)) {
      this.session.end();
    }
    return throwError(() => error);
  }
}

function isUnauthorized(error: unknown): boolean {
  return (error as Partial<ApiError> | null)?.kind === 'unauthorized';
}
