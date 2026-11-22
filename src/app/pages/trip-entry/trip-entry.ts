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
} from '../../itinerary/itinerary.service';
import { Alert } from '../../shared/alert/alert';
import { Button } from '../../shared/button/button';
import { TextField } from '../../shared/text-field/text-field';

type Field = 'origin' | 'destination';

export type TripEntryState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success' }
  | { readonly status: 'empty' }
  | {
      readonly status: 'error';
      readonly kind: ItineraryErrorKind;
      readonly field?: Field;
      readonly address?: string;
      readonly errorCode?: string;
    };

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
  /** Texte lu par les lecteurs d'écran (zone `aria-live` polie). */
  protected readonly liveMessage = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Calcul de l’itinéraire en cours…';
    if (state.status === 'success') return 'Itinéraire calculé.';
    if (state.status === 'empty') return 'Aucun itinéraire à afficher pour cette recherche.';
    return '';
  });

  protected fieldError(field: Field): string | null {
    const state = this.state();
    if (state.status === 'error' && state.kind === 'address-not-found' && state.field === field) {
      return `Impossible de résoudre l’adresse « ${state.address ?? this.form.controls[field].value.trim()} » en coordonnées. Vérifiez l’orthographe ou utilisez le format « lat,lng ».`;
    }
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
    return state.status === 'error' && state.kind !== 'address-not-found' ? state : null;
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
      this.state.set({ status: result.routeFound ? 'success' : 'empty' });
    } catch (error) {
      const known = error instanceof ItineraryError ? error : null;
      this.state.set({
        status: 'error',
        kind: known?.kind ?? 'server',
        field:
          known?.details.field ?? (known?.kind === 'address-not-found' ? 'destination' : undefined),
        address: known?.details.address,
        errorCode: known?.details.errorCode,
      });
      if (known?.kind === 'address-not-found') {
        this.focusField(known.details.field ?? 'destination');
      }
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
