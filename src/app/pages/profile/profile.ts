import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  effect,
  signal,
  untracked,
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
  WHEELCHAIR_WIDTH_MAX_M,
  WHEELCHAIR_WIDTH_MIN_M,
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
import type { WheelchairModelOption } from '../../profile/mobility-profile.http';
import { WheelchairCatalogue } from '../../profile/wheelchair-catalogue.service';
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
export const WIDTH_MESSAGE = `Indiquez une largeur en mètres, entre ${WHEELCHAIR_WIDTH_MIN_M} et ${WHEELCHAIR_WIDTH_MAX_M} (par exemple 0,65).`;
export const SESSION_EXPIRED_MESSAGE =
  'Votre session a expiré. Reconnectez-vous pour enregistrer votre profil sur votre compte.';
export const REMOTE_SAVE_FAILED_MESSAGE =
  'Votre profil est enregistré sur cet appareil, mais pas encore sur votre compte. Réessayez.';
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  manual: 'Fauteuils manuels',
  electric: 'Fauteuils électriques',
};
/** Valeur du sélecteur pour « Autre modèle » : l'utilisateur saisit le modèle et la largeur lui-même. */
export const MANUAL_MODEL = 'manual';
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
  protected readonly catalogue = inject(WheelchairCatalogue);
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
  protected readonly sessionExpiredMessage = SESSION_EXPIRED_MESSAGE;

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
    wheelchairModelId: this.fb.control(DEFAULT_FORM_VALUE.wheelchairModelId),
    wheelchairWidthM: this.fb.control(DEFAULT_FORM_VALUE.wheelchairWidthM),
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
  /** Message quand l'enregistrement sur le compte échoue alors que le profil est bien gardé en local. */
  readonly remoteError = signal<string | null>(null);
  readonly saving = signal(false);

  /** Choix du sélecteur : '' (aucun), identifiant du catalogue, ou MANUAL_MODEL. */
  readonly modelChoice = signal('');
  /** Largeur saisie à la main (texte : virgule ou point acceptés), contrôlée seulement en saisie manuelle. */
  readonly widthText = new FormControl(formatWidthInput(DEFAULT_WHEELCHAIR_WIDTH_M), {
    nonNullable: true,
  });
  private readonly widthValue = toSignal(this.widthText.valueChanges, {
    initialValue: this.widthText.value,
  });

  private readonly consentAttempted = signal(false);
  private readonly submitted = signal(false);

  /** Les contrôles réactifs ne sont pas des signaux : on relit l'état à chaque évènement du formulaire. */
  private readonly formEvents = toSignal(this.form.events);
  protected readonly selectedProfile = toSignal(this.form.controls.profile.valueChanges, {
    initialValue: this.form.controls.profile.value,
  });
  private readonly consentValue = toSignal(this.consent.valueChanges, { initialValue: false });

  protected readonly showWheelchair = computed(() => isWheelchairProfile(this.selectedProfile()));

  /** Modèle et largeur à saisir : sans catalogue (pas de compte, API injoignable) ou quand « Autre modèle » est choisi. */
  protected readonly manualEntry = computed(
    () => !this.catalogue.available() || this.modelChoice() === MANUAL_MODEL,
  );

  /** Largeur retenue pour le calcul, affichée quand elle vient du catalogue. */
  protected readonly widthLabel = computed(() => {
    this.formEvents();
    return formatWidth(this.form.controls.wheelchairWidthM.value);
  });

  /** Modèles du catalogue regroupés par catégorie, pour les groupes du sélecteur. */
  protected readonly catalogueGroups = computed(() => {
    const groups = new Map<
      string,
      { id: string; label: string; models: WheelchairModelOption[] }
    >();
    for (const model of this.catalogue.models()) {
      const group = groups.get(model.category) ?? {
        id: model.category,
        label: CATEGORY_LABELS[model.category] ?? model.category,
        models: [],
      };
      group.models.push(model);
      groups.set(model.category, group);
    }
    return [...groups.values()];
  });

  protected readonly widthError = computed(() => {
    this.formEvents();
    const touched = this.widthText.touched || this.submitted();
    return this.manualEntry() && touched && parseWidth(this.widthValue()) === null
      ? WIDTH_MESSAGE
      : null;
  });

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

    // Le catalogue n'est demandé que si l'écran fauteuil s'affiche (et seulement avec un compte).
    effect(() => {
      if (this.showWheelchair()) {
        untracked(() => this.catalogue.load());
      }
    });

    // Profil déjà enregistré (avec son consentement) : on le recharge directement dans le formulaire.
    const stored = this.service.profile();
    if (stored) {
      this.consent.setValue(true);
      this.restore(toFormValue(stored));
      this.step.set('form');
    }
  }

  private restore(value: MobilityProfileFormValue): void {
    this.form.setValue({
      profile: value.profile,
      wheelchairModel: value.wheelchairModel,
      wheelchairModelId: value.wheelchairModelId,
      wheelchairWidthM: value.wheelchairWidthM,
      strength: value.strength,
      accompanied: value.accompanied,
      canClimbStairs: value.canClimbStairs,
      stairsOrSlopes: value.stairsOrSlopes,
      preferWidePaths: value.preferWidePaths,
      preferLitStreets: value.preferLitStreets,
      requireBenches: value.requireBenches,
    });
    this.widthText.setValue(formatWidthInput(value.wheelchairWidthM));
    this.modelChoice.set(
      value.wheelchairModelId ? value.wheelchairModelId : value.wheelchairModel ? MANUAL_MODEL : '',
    );
  }

  /** Choix dans la liste : un modèle du catalogue remplit le nom, l'identifiant et la largeur recommandée. */
  protected chooseModel(choice: string): void {
    this.modelChoice.set(choice);
    const { wheelchairModel, wheelchairModelId, wheelchairWidthM } = this.form.controls;
    const model = this.catalogue.find(choice);
    if (model) {
      wheelchairModel.setValue(model.label);
      wheelchairModelId.setValue(model.id);
      wheelchairWidthM.setValue(model.widthM);
      this.widthText.setValue(formatWidthInput(model.widthM));
    } else {
      // « Autre modèle » ou aucun choix : l'ancien identifiant ne vaut plus, le nom reste à saisir.
      wheelchairModelId.setValue('');
      if (this.catalogue.models().some((m) => m.label === wheelchairModel.value)) {
        wheelchairModel.setValue('');
      }
    }
    wheelchairModel.markAsTouched();
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
    if (isWheelchairProfile(this.form.controls.profile.value) && this.manualEntry()) {
      const width = parseWidth(this.widthText.value);
      this.widthText.markAsTouched();
      if (width === null) {
        this.focusAfterRender('.width-field input');
        return;
      }
      this.form.controls.wheelchairWidthM.setValue(width);
    }
    this.draft.set(buildProfileData(this.form.getRawValue()));
    this.goTo('recap');
  }

  protected backToForm(): void {
    this.goTo('form');
  }

  protected confirm(): void {
    const data = this.draft();
    if (!data || this.saving()) {
      return;
    }
    this.saveFailed.set(false);
    this.remoteError.set(null);
    this.saving.set(true);
    try {
      this.service.saveAndSync(data, this.consent.value).subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigate(['/trip-entry']);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const expired = (error as { kind?: string } | null)?.kind === 'unauthorized';
          this.remoteError.set(expired ? SESSION_EXPIRED_MESSAGE : REMOTE_SAVE_FAILED_MESSAGE);
        },
      });
    } catch {
      this.saving.set(false);
      this.saveFailed.set(true);
    }
  }

  protected signIn(): void {
    void this.router.navigate(['/auth']);
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

/** Largeur en mètres saisie par l'utilisateur ('0,65' ou '0.65') ; null si absente ou hors des bornes de l'API. */
export function parseWidth(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return value >= WHEELCHAIR_WIDTH_MIN_M && value <= WHEELCHAIR_WIDTH_MAX_M ? value : null;
}

function formatWidthInput(widthM: number): string {
  return String(widthM).replace('.', ',');
}
