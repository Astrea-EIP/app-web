import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  ITINERARY_SERVICE,
  ItineraryError,
  ItineraryRequest,
  ItineraryResult,
} from '../../itinerary/itinerary.service';
import { TripEntry } from './trip-entry';

describe('TripEntry', () => {
  let fixture: ComponentFixture<TripEntry>;
  let el: HTMLElement;
  let compute: ReturnType<typeof vi.fn<(request: ItineraryRequest) => Promise<ItineraryResult>>>;

  async function setup(
    impl: (request: ItineraryRequest) => Promise<ItineraryResult> = () =>
      Promise.resolve({ routeFound: true }),
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
    expect(el.querySelector('.trip__route')).not.toBeNull();
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
    resolve({ routeFound: true });
    await fixture.whenStable();
  });

  it('shows an explicit empty state when no route comes back', async () => {
    await setup(() => Promise.resolve({ routeFound: false }));
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Aucun résultat');
    expect(el.querySelector('.trip__route')).toBeNull();
  });

  it('flags an unresolved address (400) on the field, with icon and text', async () => {
    await setup(() =>
      Promise.reject(
        new ItineraryError('address-not-found', { field: 'destination', address: 'Rue des Zzzz' }),
      ),
    );
    await fill('A', 'Rue des Zzzz');
    await submit();
    const error = el.querySelector('.field__error');
    expect(error?.textContent).toContain('Impossible de résoudre l’adresse « Rue des Zzzz »');
    expect(error?.querySelector('svg')).not.toBeNull();
    expect(inputs()[1].getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the uncovered zone error (422) and lets the user edit the search', async () => {
    await setup(() => Promise.reject(new ItineraryError('uncovered-zone')));
    await fill('A', 'Kiev, Ukraine');
    await submit();
    const alert = el.querySelector('.trip__message app-alert');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Zone non couverte');
    el.querySelector<HTMLButtonElement>('.trip__message button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.trip__message')).toBeNull();
  });

  it('shows the no accessible route error (422) with a link to the profile', async () => {
    await setup(() => Promise.reject(new ItineraryError('no-accessible-route')));
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Aucun trajet accessible');
    expect(el.querySelector('.trip__message a[href="/profile"]')?.textContent).toContain(
      'Modifier mon profil',
    );
  });

  it('shows the server error (500) with its code and retries on demand', async () => {
    let calls = 0;
    await setup(() =>
      ++calls === 1
        ? Promise.reject(new ItineraryError('server', { errorCode: '3f9a1c0b' }))
        : Promise.resolve({ routeFound: true }),
    );
    await fill('A', 'B');
    await submit();
    expect(el.textContent).toContain('Un problème est survenu');
    expect(el.textContent).toContain('Code d’erreur : 3f9a1c0b');
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
    expect(el.textContent).not.toContain('Code d’erreur');
  });
});
