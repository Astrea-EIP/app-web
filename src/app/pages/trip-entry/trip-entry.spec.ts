import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  ITINERARY_SERVICE,
  ItineraryError,
  ItineraryRequest,
  ItineraryResult,
} from '../../itinerary/itinerary.service';
import { TripEntry, formatPoint, summarizeRoute } from './trip-entry';

const POINTS = [
  { lat: 48.8566, lng: 2.3522 },
  { lat: 48.858, lng: 2.345 },
  { lat: 48.8606, lng: 2.3376 },
];

describe('TripEntry', () => {
  let fixture: ComponentFixture<TripEntry>;
  let el: HTMLElement;
  let compute: ReturnType<typeof vi.fn<(request: ItineraryRequest) => Promise<ItineraryResult>>>;

  async function setup(
    impl: (request: ItineraryRequest) => Promise<ItineraryResult> = () =>
      Promise.resolve({ points: POINTS }),
  ) {
    compute = vi.fn(impl);
    await TestBed.configureTestingModule({
      imports: [TripEntry],
      providers: [provideRouter([]), { provide: ITINERARY_SERVICE, useValue: { compute } }],
    }).compileComponents();
    fixture = TestBed.createComponent(TripEntry);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  const inputs = () => el.querySelectorAll<HTMLInputElement>('input');

  async function fill(origin: string, destination: string) {
    for (const [i, value] of [origin, destination].entries()) {
      inputs()[i].value = value;
      inputs()[i].dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders the departure and arrival fields, the profile link and the submit button', async () => {
    await setup();
    expect(el.textContent).toContain('Départ');
    expect(el.textContent).toContain('Arrivée');
    expect(el.querySelector('a[href="/profile"]')?.textContent).toContain('Modifier');
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain(
      'Calculer l’itinéraire',
    );
    expect(el.textContent).toContain('n’est pas encore disponible');
  });

  it('requires both fields and does not call the service', async () => {
    await setup();
    await submit();
    expect(compute).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Indiquez votre point de départ.');
    expect(el.textContent).toContain('Indiquez votre point d’arrivée.');
    expect(inputs()[0].getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects blank values made of spaces', async () => {
    await setup();
    await fill('   ', 'Gare');
    await submit();
    expect(compute).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Indiquez votre point de départ.');
    expect(el.textContent).not.toContain('Indiquez votre point d’arrivée.');
  });

  it('sends trimmed values and shows the success state', async () => {
    await setup();
    await fill(' Mairie ', ' Médiathèque ');
    await submit();
    expect(compute).toHaveBeenCalledWith({ origin: 'Mairie', destination: 'Médiathèque' });
    expect(el.textContent).toContain('Itinéraire calculé');
    expect(el.textContent).toContain(
      'Trajet de 3 points, de (48,8566 ; 2,3522) à (48,8606 ; 2,3376).',
    );
    expect(el.querySelector('.trip__route')).not.toBeNull();
  });

  it('says that the engine does not use the mobility profile yet', async () => {
    await setup();
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('ne tient pas encore compte de votre profil de mobilité');
  });

  it('announces that the account session expired when the route was computed without it', async () => {
    await setup(() => Promise.resolve({ points: POINTS, sessionExpired: true }));
    await fill('A', 'B');
    await submit();
    const status = el.querySelector('app-alert[role="status"]');
    expect(status?.textContent).toContain(
      'Ta session a expiré, tu as été déconnecté. Ton trajet a été calculé sans ton compte.',
    );
  });

  it('says nothing about the session when it did not expire', async () => {
    await setup();
    await fill('A', 'B');
    await submit();
    expect(el.textContent).not.toContain('Ta session a expiré');
  });

  it('shows a loading state and ignores a second submit', async () => {
    let resolve!: (r: ItineraryResult) => void;
    await setup(() => new Promise((r) => (resolve = r)));
    await fill('A', 'B');
    await submit();
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('en cours');
    await submit();
    expect(compute).toHaveBeenCalledTimes(1);
    resolve({ points: POINTS });
    await fixture.whenStable();
  });

  it('shows an explicit empty state when no route comes back', async () => {
    await setup(() => Promise.resolve({ points: [] }));
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Aucun résultat');
    expect(el.querySelector('.trip__route')).toBeNull();
  });

  it('blocks the request without a saved profile and links to the profile page', async () => {
    await setup(() => Promise.reject(new ItineraryError('no-profile')));
    await fill('A', 'B');
    await submit();
    const alert = el.querySelector('.trip__message app-alert');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Profil de mobilité à renseigner');
    expect(el.querySelector('.trip__message a[href="/profile"]')?.textContent).toContain(
      'Renseigner mon profil',
    );
  });

  it('shows its own message for a 400 and lets the user edit the search', async () => {
    await setup(() => Promise.reject(new ItineraryError('invalid-request')));
    await fill('A', 'Rue des Zzzz');
    await submit();
    const alert = el.querySelector('.trip__message app-alert');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Départ ou arrivée non reconnu');
    el.querySelector<HTMLButtonElement>('.trip__message button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.trip__message')).toBeNull();
  });

  it('shows its own message for a 422 with a link to the profile', async () => {
    await setup(() => Promise.reject(new ItineraryError('unprocessable')));
    await fill('A', 'Kiev, Ukraine');
    await submit();
    expect(el.querySelector('.trip__message app-alert')?.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('Aucun itinéraire possible');
    expect(el.querySelector('.trip__message a[href="/profile"]')?.textContent).toContain(
      'Modifier mon profil',
    );
  });

  it('shows the Retry-After delay of a 429', async () => {
    await setup(() =>
      Promise.reject(new ItineraryError('rate-limited', { retryAfterSeconds: 30 })),
    );
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Trop de demandes');
    expect(el.textContent).toContain('Réessayez dans 30');
    expect(el.textContent).toContain('secondes');
  });

  it('shows a generic delay for a 429 without Retry-After', async () => {
    await setup(() => Promise.reject(new ItineraryError('rate-limited')));
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Réessayez dans un instant');
  });

  it('shows its own message when the token is refused twice (401)', async () => {
    await setup(() => Promise.reject(new ItineraryError('unauthorized')));
    await fill('A', 'B');
    await submit();
    expect(el.querySelector('.trip__message app-alert')?.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('Accès au service refusé');
  });

  it('shows the server error (500) with its code and retries on demand', async () => {
    let calls = 0;
    await setup(() =>
      ++calls === 1
        ? Promise.reject(new ItineraryError('server', { errorId: '3f9a1c0b' }))
        : Promise.resolve({ points: POINTS }),
    );
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Un problème est survenu');
    expect(el.textContent).toContain('indiquez ce code : 3f9a1c0b');
    el.querySelector<HTMLButtonElement>('.trip__message button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compute).toHaveBeenCalledTimes(2);
    expect(el.querySelector('.trip__message')).toBeNull();
    expect(el.textContent).toContain('Itinéraire calculé');
  });

  it('treats any unknown failure (e.g. unwired service) as a server error', async () => {
    await setup(() => Promise.reject(new Error('boom')));
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Un problème est survenu');
    expect(el.textContent).not.toContain('indiquez ce code');
  });
});

describe('summarizeRoute', () => {
  it('formats the coordinates in French with a semicolon between them', () => {
    expect(formatPoint({ lat: -33.8688, lng: 151.2093 })).toBe('(-33,8688 ; 151,2093)');
  });

  it('uses the singular for a single point', () => {
    expect(summarizeRoute([{ lat: 1, lng: 2 }])).toBe('Trajet de 1 point, de (1 ; 2) à (1 ; 2).');
  });
});
