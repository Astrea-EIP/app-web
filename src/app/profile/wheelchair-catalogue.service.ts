import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';

import { SessionService } from '../auth/session.service';
import { MobilityProfileHttp, WheelchairModelOption } from './mobility-profile.http';

export type CatalogueStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

/**
 * Catalogue des modèles de fauteuil (`GET /v0/wheelchairs`).
 *
 * Il demande le jeton d'un compte connecté. Sans compte, ou si l'API ne répond pas, le statut est
 * `unavailable` et le formulaire n'offre que la saisie manuelle : le catalogue est une aide, jamais
 * un passage obligé.
 */
@Injectable({ providedIn: 'root' })
export class WheelchairCatalogue {
  private readonly http = inject(MobilityProfileHttp);
  private readonly session = inject(SessionService);

  private readonly loaded = signal<readonly WheelchairModelOption[]>([]);
  private readonly state = signal<CatalogueStatus>('idle');
  private inflight: Observable<void> | null = null;

  readonly models = this.loaded.asReadonly();
  readonly status = this.state.asReadonly();
  readonly available = computed(() => this.state() === 'ready' && this.loaded().length > 0);

  /**
   * Charge le catalogue une fois par session et émet quand c'est fini, y compris en cas d'échec
   * (le catalogue est alors `unavailable`, sans erreur : l'appelant continue en saisie manuelle).
   */
  ensureLoaded(): Observable<void> {
    const token = this.session.accessToken();
    if (!token) {
      this.state.set('unavailable');
      return of(undefined);
    }
    if (this.state() === 'ready') {
      return of(undefined);
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.state.set('loading');
    this.inflight = this.http.loadWheelchairModels(token).pipe(
      tap((models) => {
        this.loaded.set(models);
        this.state.set('ready');
      }),
      map(() => undefined),
      catchError(() => {
        this.state.set('unavailable');
        return of(undefined);
      }),
      finalize(() => (this.inflight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inflight;
  }

  /** Lance le chargement sans attendre le résultat (l'état se lit dans les signaux). */
  load(): void {
    this.ensureLoaded().subscribe();
  }

  /** Modèle du catalogue pour un identifiant, ou undefined. */
  find(id: string): WheelchairModelOption | undefined {
    return this.loaded().find((model) => model.id === id);
  }

  /** Libellé d'un identifiant, utilisé pour réafficher un profil rechargé depuis l'API. */
  label(id: string): string | undefined {
    return this.find(id)?.label;
  }
}
