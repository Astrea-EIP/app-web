import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../auth/session.service';
import { MobilityProfileService } from '../../profile/mobility-profile.service';
import { SESSION_STORAGE_KEY } from '../../profile/session-mobility-profile.store';
import {
  CONSENT_REQUIRED_MESSAGE,
  MODEL_REQUIRED_MESSAGE,
  REMOTE_SAVE_FAILED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  WIDTH_MESSAGE,
  parseWidth,
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
      expect(text()).toContain('Largeur du fauteuil (en mètres)');
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

  describe('connected account', () => {
    const BASE = environment.apiUrl.replace(/\/+$/, '');
    const CATALOGUE = {
      categories: [
        {
          id: 'manual',
          name: 'Manual wheelchairs',
          models: [
            {
              id: 'invacare-action-kuschall',
              brand: 'Invacare',
              range: 'Action',
              recommended_wheelchair_width: 0.7,
            },
          ],
        },
      ],
    };
    let http: HttpTestingController;

    const select = () => root.querySelector<HTMLSelectElement>('#model-select')!;
    const pick = async (value: string) => {
      select().value = value;
      select().dispatchEvent(new Event('change'));
      await settle();
    };

    /** Compte connecté : la page demande le catalogue, puis le profil du compte (absent : 404). */
    async function connect(catalogue: 'ok' | 'down' = 'ok'): Promise<void> {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      http = TestBed.inject(HttpTestingController);
      TestBed.inject(SessionService).start('jeton');
      await create();
      const wheelchairs = http.expectOne(`${BASE}/v0/wheelchairs`);
      expect(wheelchairs.request.headers.get('access-token')).toBe('jeton');
      if (catalogue === 'ok') {
        wheelchairs.flush(CATALOGUE);
      } else {
        wheelchairs.flush({ error: 'down' }, { status: 500, statusText: 'Server Error' });
      }
      await settle();
      http
        .expectOne(`${BASE}/v0/users/me/profile`)
        .flush({ error: 'none' }, { status: 404, statusText: 'Not Found' });
      await settle();
    }

    afterEach(() => http.verify());

    it('offers the catalogue models and a manual option', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      expect(select().textContent).toContain('Invacare — Action');
      expect(select().textContent).toContain('Autre modèle (saisie manuelle)');
      expect(root.querySelector('.model-field')).toBeNull();
    });

    it('sends the catalogue id and its recommended width', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await pick('invacare-action-kuschall');
      expect(text()).toContain('Largeur utilisée pour calculer l’itinéraire : 0,70 m');
      await click('Enregistrer mon profil');
      expect(text()).toContain('Invacare — Action (0,70 m)');

      await click('Valider mon profil');
      const put = http.expectOne(`${BASE}/v0/users/me/profile`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.headers.get('access-token')).toBe('jeton');
      expect(put.request.body).toMatchObject({
        consent: true,
        mobility_profile: 1,
        wheelchair_model_id: 'invacare-action-kuschall',
        wheelchair_width: 0.7,
      });
      put.flush({
        consent: true,
        mobility_profile: 1,
        app_profile: 'manual-wheelchair',
        wheelchair_model_id: 'invacare-action-kuschall',
        wheelchair_width: 0.7,
        physical_strength: 1,
        is_accompanied: false,
        consent_given_at: '2026-11-23T10:00:00.000Z',
        updated_at: '2026-11-23T10:00:00.000Z',
      });
      await settle();
      expect(navigate).toHaveBeenCalledWith(['/trip-entry']);
    });

    it('lets the user type the model and the width without the list', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await pick('manual');
      expect(root.querySelector('.model-field')).not.toBeNull();
      await type('.model-field input', 'Modèle sur mesure');
      await type('.width-field input', '0,65');
      await click('Enregistrer mon profil');
      expect(text()).toContain('Modèle sur mesure (0,65 m)');

      await click('Valider mon profil');
      const put = http.expectOne(`${BASE}/v0/users/me/profile`);
      expect(put.request.body.wheelchair_width).toBe(0.65);
      expect(put.request.body).not.toHaveProperty('wheelchair_model_id');
      put.flush({
        consent: true,
        mobility_profile: 1,
        wheelchair_width: 0.65,
        consent_given_at: '2026-11-23T10:00:00.000Z',
        updated_at: '2026-11-23T10:00:00.000Z',
      });
    });

    it('rejects a manual width outside what the API accepts', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await pick('manual');
      await type('.model-field input', 'Modèle sur mesure');
      await type('.width-field input', '3');
      await click('Enregistrer mon profil');
      expect(text()).toContain(WIDTH_MESSAGE);
      expect(root.querySelector('.passport')).toBeNull();
    });

    it('falls back to manual entry when the catalogue is unavailable', async () => {
      await connect('down');
      await acceptConsent();
      await choose('Fauteuil manuel');
      // Ouvrir la section fauteuil retente le catalogue ; il répond encore en erreur.
      http
        .expectOne(`${BASE}/v0/wheelchairs`)
        .flush({ error: 'down' }, { status: 500, statusText: 'Server Error' });
      await settle();
      expect(root.querySelector('#model-select')).toBeNull();
      expect(root.querySelector('.model-field')).not.toBeNull();
      expect(root.querySelector('.width-field')).not.toBeNull();
    });

    it('keeps the local profile and says so when the account save fails', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await pick('manual');
      await type('.model-field input', 'Modèle sur mesure');
      await click('Enregistrer mon profil');
      await click('Valider mon profil');
      http
        .expectOne(`${BASE}/v0/users/me/profile`)
        .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
      await settle();
      expect(text()).toContain(REMOTE_SAVE_FAILED_MESSAGE);
      expect(TestBed.inject(MobilityProfileService).profile()).not.toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('ends the session and offers to sign in again on a 401', async () => {
      await connect();
      await acceptConsent();
      await choose('Fauteuil manuel');
      await pick('manual');
      await type('.model-field input', 'Modèle sur mesure');
      await click('Enregistrer mon profil');
      await click('Valider mon profil');
      http
        .expectOne(`${BASE}/v0/users/me/profile`)
        .flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
      await settle();
      expect(text()).toContain(SESSION_EXPIRED_MESSAGE);
      expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
      await click('Me reconnecter');
      expect(navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('parseWidth', () => {
    it('accepts a comma or a dot, inside the API bounds', () => {
      expect(parseWidth('0,65')).toBe(0.65);
      expect(parseWidth(' 0.7 ')).toBe(0.7);
      expect(parseWidth('2')).toBe(2);
    });

    it('rejects text, zero, negatives and widths over 2 m', () => {
      for (const bad of ['', 'abc', '0', '-1', '2,1', '0,6,5']) {
        expect(parseWidth(bad)).toBeNull();
      }
    });
  });
});
