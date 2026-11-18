import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Alert } from '../../shared/alert/alert';
import { Button } from '../../shared/button/button';
import { TextField } from '../../shared/text-field/text-field';
import {
  DEFAULT_FORM_VALUE,
  DEFAULT_WHEELCHAIR_WIDTH_M,
  MobilityProfileData,
  MobilityProfileFormValue,
  PROFILE_OPTIONS,
  RecapRow,
  STAIRS_OR_SLOPES_LABELS,
  STRENGTH_LABELS,
  WHEELCHAIR_MODEL_MAX_LENGTH,
  buildProfileData,
  buildRecapRows,
  formatWidth,
  isWheelchairProfile,
  toFormValue,
} from '../../profile/mobility-profile.models';
import { MobilityProfileService } from '../../profile/mobility-profile.service';
import {
  OptionCardDefinition,
  OptionCardGroup,
  OptionIcon,
} from './option-card-group/option-card-group';
import { SettingRow } from './setting-row/setting-row';

export type ProfileStep = 'consent' | 'form' | 'recap';

const PROFILE_ICONS: Record<string, OptionIcon> = {
  'manual-wheelchair': 'wheelchair',
  'electric-wheelchair': 'bolt',
  'assisted-walking': 'cane',
  pedestrian: 'person',
  stroller: 'cart',
  'visually-impaired': 'eye',
};

export const MODEL_REQUIRED_MESSAGE =
  'Choisissez un modèle de fauteuil pour calculer un itinéraire adapté.';
export const PROFILE_REQUIRED_MESSAGE = 'Choisissez votre profil de mobilité pour continuer.';
export const CONSENT_REQUIRED_MESSAGE =
  'Cochez la case pour accepter et continuer, ou choisissez « Continuer sans profil ».';

/** Page « Profil de mobilité » : consentement, formulaire dépendant du profil, récapitulatif, enregistrement. */
@Component({
  imports: [ReactiveFormsModule, Alert, Button, TextField, OptionCardGroup, SettingRow],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly service = inject(MobilityProfileService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profileOptions: readonly OptionCardDefinition[] = PROFILE_OPTIONS.map(
    (option) => ({
      value: option.id,
      label: option.label,
      description: option.description,
      icon: PROFILE_ICONS[option.id],
    }),
  );
  protected readonly strengthOptions: readonly OptionCardDefinition[] = [
    { value: 'low', label: STRENGTH_LABELS.low, description: 'Aucune pente ni bordure' },
    { value: 'medium', label: STRENGTH_LABELS.medium, description: 'Pentes douces acceptées' },
    {
      value: 'high',
      label: STRENGTH_LABELS.high,
      description: 'Pentes douces et petites bordures',
    },
  ];
  protected readonly stairsOrSlopesOptions: readonly OptionCardDefinition[] = [
    { value: 'none', label: STAIRS_OR_SLOPES_LABELS.none, description: 'Escaliers et pentes' },
    {
      value: 'stairs',
      label: STAIRS_OR_SLOPES_LABELS.stairs,
      description: 'Plutôt que des pentes',
    },
    {
      value: 'slopes',
      label: STAIRS_OR_SLOPES_LABELS.slopes,
      description: 'Plutôt que des escaliers',
    },
  ];
  protected readonly modelMaxLength = WHEELCHAIR_MODEL_MAX_LENGTH;
  protected readonly widthLabel = formatWidth(DEFAULT_WHEELCHAIR_WIDTH_M);

  readonly consent = new FormControl(false, {
    nonNullable: true,
    validators: [Validators.requiredTrue],
  });

  private readonly fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    profile: this.fb.control<MobilityProfileFormValue['profile']>(DEFAULT_FORM_VALUE.profile, [
      Validators.required,
    ]),
    wheelchairModel: this.fb.control(DEFAULT_FORM_VALUE.wheelchairModel),
    strength: this.fb.control(DEFAULT_FORM_VALUE.strength),
    accompanied: this.fb.control(DEFAULT_FORM_VALUE.accompanied),
    canClimbStairs: this.fb.control(DEFAULT_FORM_VALUE.canClimbStairs),
    stairsOrSlopes: this.fb.control(DEFAULT_FORM_VALUE.stairsOrSlopes),
    preferWidePaths: this.fb.control(DEFAULT_FORM_VALUE.preferWidePaths),
    preferLitStreets: this.fb.control(DEFAULT_FORM_VALUE.preferLitStreets),
    requireBenches: this.fb.control(DEFAULT_FORM_VALUE.requireBenches),
  });

  readonly step = signal<ProfileStep>('consent');
  readonly draft = signal<MobilityProfileData | null>(null);
  readonly saveFailed = signal(false);

  private readonly consentAttempted = signal(false);
  private readonly submitted = signal(false);

  /** Les contrôles réactifs ne sont pas des signaux : on relit l'état à chaque évènement du formulaire. */
  private readonly formEvents = toSignal(this.form.events);
  protected readonly selectedProfile = toSignal(this.form.controls.profile.valueChanges, {
    initialValue: this.form.controls.profile.value,
  });
  private readonly consentValue = toSignal(this.consent.valueChanges, { initialValue: false });

  protected readonly showWheelchair = computed(() => isWheelchairProfile(this.selectedProfile()));

  protected readonly profileError = computed(() => {
    this.formEvents();
    const control = this.form.controls.profile;
    return (control.touched || this.submitted()) && control.invalid
      ? PROFILE_REQUIRED_MESSAGE
      : null;
  });

  protected readonly modelError = computed(() => {
    this.formEvents();
    const control = this.form.controls.wheelchairModel;
    if (!(control.touched || this.submitted()) || !control.errors) {
      return null;
    }
    return control.errors['maxlength']
      ? `Le modèle ne peut pas dépasser ${WHEELCHAIR_MODEL_MAX_LENGTH} caractères.`
      : MODEL_REQUIRED_MESSAGE;
  });

  protected readonly consentError = computed(() =>
    this.consentAttempted() && !this.consentValue() ? CONSENT_REQUIRED_MESSAGE : null,
  );

  protected readonly recapRows = computed<RecapRow[]>(() => {
    const data = this.draft();
    return data ? buildRecapRows(data) : [];
  });

  constructor() {
    this.form.controls.profile.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => this.applyProfileValidators(profile));

    // Profil déjà enregistré (avec son consentement) : on le recharge directement dans le formulaire.
    const stored = this.service.profile();
    if (stored) {
      this.consent.setValue(true);
      this.form.setValue(toFormValue(stored));
      this.step.set('form');
    }
  }

  /** Le modèle de fauteuil n'est obligatoire que pour les profils fauteuil. */
  private applyProfileValidators(profile: MobilityProfileFormValue['profile']): void {
    const model = this.form.controls.wheelchairModel;
    model.setValidators(
      isWheelchairProfile(profile)
        ? [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(WHEELCHAIR_MODEL_MAX_LENGTH),
          ]
        : [],
    );
    model.updateValueAndValidity();
  }

  protected acceptConsent(): void {
    this.consentAttempted.set(true);
    if (this.consent.invalid) {
      this.focusAfterRender('.consent__input');
      return;
    }
    this.goTo('form');
  }

  /** « Continuer sans profil » : rien n'est enregistré. */
  protected skip(): void {
    void this.router.navigate(['/trip-entry']);
  }

  protected review(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusAfterRender(
        this.form.controls.profile.invalid ? '.profile-group input' : '.model-field input',
      );
      return;
    }
    this.draft.set(buildProfileData(this.form.getRawValue()));
    this.goTo('recap');
  }

  protected backToForm(): void {
    this.goTo('form');
  }

  protected confirm(): void {
    const data = this.draft();
    if (!data) {
      return;
    }
    try {
      this.service.save(data, this.consent.value);
      this.saveFailed.set(false);
      void this.router.navigate(['/trip-entry']);
    } catch {
      this.saveFailed.set(true);
    }
  }

  private goTo(step: ProfileStep): void {
    this.step.set(step);
    this.focusAfterRender('h1');
  }

  /** Déplace le focus après le rendu pour que le lecteur d'écran annonce le nouvel écran ou l'erreur. */
  private focusAfterRender(selector: string): void {
    afterNextRender(() => document.querySelector<HTMLElement>(`app-profile ${selector}`)?.focus(), {
      injector: this.injector,
    });
  }
}
