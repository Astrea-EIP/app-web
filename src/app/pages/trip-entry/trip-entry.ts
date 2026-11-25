import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ITINERARY_SERVICE,
  ItineraryError,
  ItineraryErrorKind,
  ItineraryPoint,
} from '../../itinerary/itinerary.service';
import { Alert } from '../../shared/alert/alert';
import { Button } from '../../shared/button/button';
import { TextField } from '../../shared/text-field/text-field';

type Field = 'origin' | 'destination';

export type TripEntryState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  /** Les points restent en mémoire de la page pour la future carte (#13). */
  | { readonly status: 'success'; readonly points: readonly ItineraryPoint[] }
  | { readonly status: 'empty' }
  | {
      readonly status: 'error';
      readonly kind: ItineraryErrorKind;
      readonly errorId?: string;
      readonly retryAfterSeconds?: number;
    };

/**
 * Le moteur (core-moteur jusqu'à v0.3.1) ne tient pas encore compte du profil de mobilité :
 * limite documentée dans `docs/api.md` d'api-back. Passer à `true` quand ce sera le cas.
 */
export const ENGINE_USES_MOBILITY_PROFILE = false;

const COORDINATE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 5 });

/** « (48,8566 ; 2,3522) » : le point-virgule évite la confusion avec la virgule décimale. */
export function formatPoint({ lat, lng }: ItineraryPoint): string {
  return `(${COORDINATE.format(lat)} ; ${COORDINATE.format(lng)})`;
}

/** « Trajet de 42 points, de (…) à (…). » */
export function summarizeRoute(points: readonly ItineraryPoint[]): string {
  const count = `${points.length} ${points.length > 1 ? 'points' : 'point'}`;
  return `Trajet de ${count}, de ${formatPoint(points[0])} à ${formatPoint(points[points.length - 1])}.`;
}

/** Refuse les valeurs vides ou faites uniquement d'espaces. */
export function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return (control.value ?? '').trim() ? null : { required: true };
}

@Component({
  imports: [ReactiveFormsModule, RouterLink, TextField, Button, Alert],
  selector: 'app-trip-entry',
  styleUrl: './trip-entry.css',
  templateUrl: './trip-entry.html',
})
export class TripEntry {
  private readonly itinerary = inject(ITINERARY_SERVICE);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    origin: ['', [Validators.required, notBlank]],
    destination: ['', [Validators.required, notBlank]],
  });

  protected readonly state = signal<TripEntryState>({ status: 'idle' });
  private readonly submitted = signal(false);

  protected readonly loading = computed(() => this.state().status === 'loading');
  protected readonly engineUsesProfile = ENGINE_USES_MOBILITY_PROFILE;
  protected readonly summary = computed(() => {
    const state = this.state();
    return state.status === 'success' ? summarizeRoute(state.points) : '';
  });
  /** Texte lu par les lecteurs d'écran (zone `aria-live` polie). */
  protected readonly liveMessage = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Calcul de l’itinéraire en cours…';
    if (state.status === 'success') return 'Itinéraire calculé.';
    if (state.status === 'empty') return 'Aucun itinéraire à afficher pour cette recherche.';
    return '';
  });

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    if ((control.touched || this.submitted()) && control.invalid) {
      return field === 'origin'
        ? 'Indiquez votre point de départ.'
        : 'Indiquez votre point d’arrivée.';
    }
    return null;
  }

  protected errorState() {
    const state = this.state();
    return state.status === 'error' ? state : null;
  }

  protected async submit(): Promise<void> {
    if (this.loading()) return;
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.state.set({ status: 'idle' });
      this.focusField(this.form.controls.origin.invalid ? 'origin' : 'destination');
      return;
    }
    const { origin, destination } = this.form.getRawValue();
    this.state.set({ status: 'loading' });
    try {
      const result = await this.itinerary.compute({
        origin: origin.trim(),
        destination: destination.trim(),
      });
      this.state.set(
        result.points.length > 0
          ? { status: 'success', points: result.points }
          : { status: 'empty' },
      );
    } catch (error) {
      const known = error instanceof ItineraryError ? error : null;
      this.state.set({
        status: 'error',
        kind: known?.kind ?? 'server',
        errorId: known?.details.errorId,
        retryAfterSeconds: known?.details.retryAfterSeconds,
      });
    }
  }

  /** « Modifier la recherche » : ramène le focus sur le départ. */
  protected editSearch(): void {
    this.state.set({ status: 'idle' });
    this.focusField('origin');
  }

  private focusField(field: Field): void {
    const index = field === 'origin' ? 0 : 1;
    // Après le rendu : le champ passe à l'état erreur, le focus fait annoncer son message.
    setTimeout(() => {
      this.host.nativeElement.querySelectorAll<HTMLInputElement>('input')[index]?.focus();
    });
  }
}
