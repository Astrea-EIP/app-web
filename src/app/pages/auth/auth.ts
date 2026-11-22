import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AccountError, AccountSession } from '../../auth/account.models';
import { AccountService } from '../../auth/account.service';
import { Alert } from '../../shared/alert/alert';
import { Button } from '../../shared/button/button';
import {
  SegmentedControl,
  SegmentedOption,
} from '../../shared/segmented-control/segmented-control';
import { TextField } from '../../shared/text-field/text-field';

export type AuthMode = 'login' | 'register';
type Status = 'idle' | 'loading' | 'success' | 'error';

/** Longueurs maximales du contrat d'api-back (docs/contracts/accounts.md). */
export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value === '' || EMAIL_PATTERN.test(value) ? null : { email: true };
}

/** Mot de passe de création : 8 caractères minimum, au moins une lettre et un chiffre. */
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (value === '') return null;
  const strong = value.length >= 8 && /\p{L}/u.test(value) && /\d/.test(value);
  return strong ? null : { weakPassword: true };
}

/** Date de naissance au format AAAA-MM-JJ, réelle et passée. */
export function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (value === '') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { birthDate: true };
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real && date.getTime() <= Date.now() && year >= 1900 ? null : { birthDate: true };
}

@Component({
  imports: [ReactiveFormsModule, Alert, Button, SegmentedControl, TextField],
  selector: 'app-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private readonly account = inject(AccountService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly modes: readonly SegmentedOption<AuthMode>[] = [
    { value: 'login', label: 'Se connecter' },
    { value: 'register', label: 'Créer un compte' },
  ];

  readonly mode = signal<AuthMode>('login');
  readonly status = signal<Status>('idle');
  readonly serviceError = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailValidator],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly registerForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        (c) => (String(c.value).trim() === '' ? { required: true } : null),
        Validators.maxLength(NAME_MAX_LENGTH),
      ],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailValidator, Validators.maxLength(EMAIL_MAX_LENGTH)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        passwordStrengthValidator,
        Validators.maxLength(PASSWORD_MAX_LENGTH),
      ],
    }),
    birthDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, birthDateValidator],
    }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected setMode(value: string | undefined): void {
    if ((value !== 'login' && value !== 'register') || value === this.mode()) return;
    this.mode.set(value);
    this.submitted.set(false);
    this.status.set('idle');
    this.serviceError.set(null);
    this.info.set(null);
  }

  /** Message d'erreur d'un champ, visible une fois touché ou après une tentative d'envoi. */
  protected error(group: FormGroup, name: string): string | null {
    const control = group.get(name);
    if (!control || control.valid || !(control.touched || this.submitted())) return null;
    const errors = control.errors ?? {};
    switch (name) {
      case 'name':
        return errors['maxlength']
          ? `Votre nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères.`
          : 'Saisissez votre nom.';
      case 'email':
        if (errors['required']) return 'Saisissez votre adresse e-mail.';
        if (errors['maxlength'])
          return `L'adresse e-mail ne doit pas dépasser ${EMAIL_MAX_LENGTH} caractères.`;
        return 'Cette adresse e-mail semble invalide. Exemple : nom@exemple.fr.';
      case 'password':
        if (errors['required']) return 'Saisissez votre mot de passe.';
        if (errors['maxlength'])
          return `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`;
        return 'Mot de passe trop faible : 8 caractères minimum, avec au moins une lettre et un chiffre.';
      case 'birthDate':
        return errors['required']
          ? 'Saisissez votre date de naissance.'
          : 'Indiquez une date de naissance valide, dans le passé.';
      case 'consent':
        return 'Pour créer un compte, vous devez accepter ce traitement de vos données.';
      default:
        return null;
    }
  }

  protected showForgotPassword(): void {
    this.serviceError.set(null);
    this.info.set(
      "La réinitialisation du mot de passe n'est pas encore disponible. Elle sera proposée dès l'ouverture des comptes.",
    );
  }

  protected submit(): void {
    if (this.status() === 'loading') return;
    this.submitted.set(true);
    this.info.set(null);
    this.serviceError.set(null);

    const form = this.mode() === 'login' ? this.loginForm : this.registerForm;
    if (form.invalid) {
      form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.status.set('loading');
    const request$ =
      this.mode() === 'login'
        ? this.account.login(this.loginForm.getRawValue())
        : this.account.register({
            ...this.registerForm.getRawValue(),
            name: this.registerForm.controls.name.value.trim(),
            consent: true,
          });

    request$.subscribe({
      next: (_session: AccountSession) => {
        this.status.set('success');
        this.info.set(
          this.mode() === 'login' ? 'Vous êtes connecté·e.' : 'Votre compte a bien été créé.',
        );
      },
      error: (err: unknown) => {
        this.status.set('error');
        this.serviceError.set(this.messageFor(err));
      },
    });
  }

  private messageFor(err: unknown): string {
    const code = err instanceof AccountError ? err.code : 'unknown';
    switch (code) {
      case 'unavailable':
        return "La connexion et la création de compte ne sont pas encore disponibles. Vos informations n'ont pas été enregistrées : vous pourrez réessayer très bientôt.";
      case 'invalid-credentials':
        return "Nous n'avons pas reconnu cette adresse e-mail ou ce mot de passe. Vérifiez-les et réessayez.";
      case 'email-already-used':
        return 'Un compte existe déjà avec cette adresse e-mail. Essayez de vous connecter.';
      default:
        return "Un problème est survenu de notre côté. Vos informations n'ont pas été perdues, vous pouvez réessayer dans un instant.";
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      },
      { injector: this.injector },
    );
  }
}
