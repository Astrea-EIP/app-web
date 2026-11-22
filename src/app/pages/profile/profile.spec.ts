import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MobilityProfileService } from '../../profile/mobility-profile.service';
import { SESSION_STORAGE_KEY } from '../../profile/session-mobility-profile.store';
import {
  CONSENT_REQUIRED_MESSAGE,
  MODEL_REQUIRED_MESSAGE,
  PROFILE_REQUIRED_MESSAGE,
  Profile,
} from './profile';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let root: HTMLElement;
  let navigate: ReturnType<typeof vi.fn>;

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(Profile);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const text = () => root.textContent ?? '';
  const button = (label: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(label),
    )!;

  async function click(label: string): Promise<void> {
    button(label).click();
    await settle();
  }

  async function acceptConsent(): Promise<void> {
    const box = root.querySelector<HTMLInputElement>('.consent__input')!;
    box.click();
    await settle();
    await click('Continuer');
  }

  async function choose(label: string): Promise<void> {
    const card = [...root.querySelectorAll<HTMLLabelElement>('.profile-group .card')].find((c) =>
      c.textContent?.includes(label),
    )!;
    card.querySelector('input')!.click();
    await settle();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = root.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  beforeEach(() => {
    sessionStorage.clear();
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
  });

  describe('consent', () => {
    beforeEach(create);

    it('starts on the consent screen and warns about health data', () => {
      expect(root.querySelector('h1')!.textContent).toContain('Votre profil de mobilité');
      expect(text()).toContain('donnée de santé');
      expect(root.querySelector('.profile-group')).toBeNull();
    });

    it('blocks the form with an icon + text error when the box is not checked', async () => {
      await click('Continuer');
      const error = root.querySelector('#consent-error')!;
      expect(error.textContent).toContain(CONSENT_REQUIRED_MESSAGE);
      expect(error.querySelector('svg')).not.toBeNull();
      expect(root.querySelector('.consent__input')!.getAttribute('aria-invalid')).toBe('true');
      expect(root.querySelector('.profile-group')).toBeNull();
    });

    it('shows the form once the consent is given', async () => {
      await acceptConsent();
      expect(root.querySelector('.profile-group')).not.toBeNull();
      expect(root.querySelector('#consent-error')).toBeNull();
    });

    it('lets the user continue without a profile and saves nothing', async () => {
      await click('Continuer sans profil');
      expect(navigate).toHaveBeenCalledWith(['/trip-entry']);
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('form', () => {
    beforeEach(async () => {
      await create();
      await acceptConsent();
    });

    it('offers the six profiles as radio cards', () => {
      const labels = [...root.querySelectorAll('.profile-group .card__label')].map(
        (l) => l.textContent,
      );
      expect(labels).toEqual([
        'Fauteuil manuel',
        'Fauteuil électrique',
        'Marche avec assistance',
        'Piéton',
        'Poussette / Chariot',
        'Aveugle ou malvoyant',
      ]);
      expect(root.querySelectorAll('.profile-group input[type="radio"]')).toHaveLength(6);
    });

    it('selects a profile and marks it checked', async () => {
      await choose('Piéton');
      expect(
        root.querySelector<HTMLInputElement>('.profile-group .card--selected input')!.checked,
      ).toBe(true);
      expect(root.querySelector('.profile-group .card--selected')!.textContent).toContain('Piéton');
    });

    it('requires a profile', async () => {
      await click('Enregistrer mon profil');
      const error = root.querySelector('#profile-error')!;
      expect(error.textContent).toContain(PROFILE_REQUIRED_MESSAGE);
      expect(error.querySelector('svg')).not.toBeNull();
      expect(root.querySelector('.passport')).toBeNull();
    });

    it('shows the wheelchair section for wheelchair profiles only', async () => {
      await choose('Fauteuil électrique');
      expect(text()).toContain('Votre fauteuil');
      expect(text()).toContain('Force physique');
      expect(text()).toContain('Largeur utilisée pour calculer l’itinéraire : 0,70 m');
      await choose('Piéton');
      expect(text()).not.toContain('Votre fauteuil');
    });

    it('shows the pedestrian preferences', async () => {
      await choose('Piéton');
      expect(text()).toContain('Vos préférences de parcours');
      expect(text()).toContain('Privilégier les rues éclairées');
      expect(text()).toContain('Exiger des bancs sur le parcours');
    });

    it('shows the assisted-walking stairs toggle', async () => {
      await choose('Marche avec assistance');
      expect(text()).toContain('Vos déplacements');
      expect(text()).toContain('Je peux monter des escaliers');
    });

    it('shows the support section for blind or low-vision users', async () => {
      await choose('Aveugle ou malvoyant');
      expect(text()).toContain('Votre accompagnement');
      expect(text()).toContain('Je suis accompagné(e)');
    });

    it('shows no extra section for stroller / cart', async () => {
      await choose('Poussette / Chariot');
      expect(root.querySelectorAll('.section')).toHaveLength(1);
    });

    it('requires the chair model for a wheelchair profile, with an accessible error', async () => {
      await choose('Fauteuil manuel');
      await click('Enregistrer mon profil');
      const input = root.querySelector<HTMLInputElement>('.model-field input')!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(root.querySelector('.field__error')!.textContent).toContain(MODEL_REQUIRED_MESSAGE);
      expect(root.querySelector('.field__error svg')).not.toBeNull();
      expect(root.querySelector('.passport')).toBeNull();
    });

    it('rejects a blank or too long model', async () => {
      await choose('Fauteuil manuel');
      await type('.model-field input', '   ');
      await click('Enregistrer mon profil');
      expect(root.querySelector('.field__error')!.textContent).toContain(MODEL_REQUIRED_MESSAGE);
      await type('.model-field input', 'x'.repeat(81));
      expect(root.querySelector('.field__error')!.textContent).toContain('80 caractères');
    });

    it('does not require the model for other profiles', async () => {
      await choose('Poussette / Chariot');
      await click('Enregistrer mon profil');
      expect(root.querySelector('.passport')).not.toBeNull();
    });

    it('goes back from the summary to the form', async () => {
      await choose('Poussette / Chariot');
      await click('Enregistrer mon profil');
      await click('Retour');
      expect(root.querySelector('.profile-group')).not.toBeNull();
    });
  });

  describe('summary and saving', () => {
    beforeEach(async () => {
      await create();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await type('.model-field input', 'Invacare — Action');
      await click('Enregistrer mon profil');
    });

    it('shows the accessibility passport', () => {
      expect(text()).toContain('Passeport d’accessibilité Astrea');
      expect(text()).toContain('Fauteuil manuel');
      expect(text()).toContain('Invacare — Action (0,70 m)');
      expect(text()).toContain('Moyenne');
      expect(text()).toContain('Non');
    });

    it('saves the profile only on validation and exposes mobility_profile', async () => {
      const service = TestBed.inject(MobilityProfileService);
      expect(service.profile()).toBeNull();
      await click('Valider mon profil');
      expect(service.mobilityProfile()).toBe(1);
      expect(service.profile()).toMatchObject({
        profile: 'manual-wheelchair',
        wheelchairModel: 'Invacare — Action',
      });
      expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!).consentGivenAt).toEqual(
        expect.any(String),
      );
      expect(navigate).toHaveBeenCalledWith(['/trip-entry']);
    });

    it('shows an error alert when the storage fails', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      await click('Valider mon profil');
      expect(root.querySelector('app-alert')!.textContent).toContain('Profil non enregistré');
      expect(navigate).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe('reload', () => {
    it('reloads a saved profile into the form, consent already given', async () => {
      TestBed.inject(MobilityProfileService).save(
        {
          profile: 'electric-wheelchair',
          wheelchairModel: 'Küschall',
          wheelchairWidthM: 0.7,
          strength: 'high',
          accompanied: true,
        },
        true,
      );
      await create();
      expect(root.querySelector('.consent__input')).toBeNull();
      expect(root.querySelector('.profile-group .card--selected')!.textContent).toContain(
        'Fauteuil électrique',
      );
      expect(root.querySelector<HTMLInputElement>('.model-field input')!.value).toBe('Küschall');
      expect(root.querySelector<HTMLInputElement>('app-setting-row input')!.checked).toBe(true);
    });
  });
});
