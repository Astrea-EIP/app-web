import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { MobilityProfileData } from '../profile/mobility-profile.models';
import { MobilityProfileService } from '../profile/mobility-profile.service';
import { HttpItineraryService } from './http-itinerary.service';
import { ItineraryError } from './itinerary.service';

const URL = `${environment.apiUrl.replace(/\/+$/, '')}/v0/itinerary`;
const WHEELCHAIR: MobilityProfileData = {
  profile: 'manual-wheelchair',
  wheelchairModel: 'Invacare — Action',
  wheelchairWidthM: 0.7,
  strength: 'medium',
  accompanied: false,
};
const POINTS = [
  { lat: 48.8566, lng: 2.3522 },
  { lat: 48.8606, lng: 2.3376 },
];
const REQUEST = { origin: '48.8566,2.3522', destination: '48.8606,2.3376' };

describe('HttpItineraryService', () => {
  let service: HttpItineraryService;
  let httpMock: HttpTestingController;
  let session: SessionService;
  let profile: ReturnType<typeof signal<MobilityProfileData | null>>;
  let anonymousTokens: string[];
  let getAnonymousToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    profile = signal<MobilityProfileData | null>(WHEELCHAIR);
    anonymousTokens = ['anon-1', 'anon-2'];
    getAnonymousToken = vi.fn(() => of({ accessToken: anonymousTokens.shift()! }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MobilityProfileService, useValue: { profile } },
        { provide: AuthService, useValue: { getAnonymousToken } },
      ],
    });
    service = TestBed.inject(HttpItineraryService);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => httpMock.verify());

  /** Laisse les promesses en attente avancer jusqu'à la requête HTTP suivante. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  async function expectPost() {
    await settle();
    return httpMock.expectOne(URL);
  }

  async function failWith(
    status: number,
    body: object | null,
    headers: Record<string, string> = {},
  ) {
    const result = service.compute(REQUEST).catch((error: unknown) => error);
    (await expectPost()).flush(body, { status, statusText: 'Error', headers });
    return (await result) as ItineraryError;
  }

  it('posts the saved profile with an anonymous token and returns the points', async () => {
    const result = service.compute(REQUEST);
    const request = await expectPost();

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('access-token')).toBe('anon-1');
    expect(request.request.body).toEqual({
      start: '48.8566,2.3522',
      end: '48.8606,2.3376',
      mobility_profile: 1,
      wheelchair_width: 0.7,
      physical_strength: 1,
      is_accompanied: false,
    });
    request.flush({ points: POINTS }, { status: 201, statusText: 'Created' });

    await expect(result).resolves.toEqual({ points: POINTS });
  });

  it('keeps the anonymous token in memory for the next request', async () => {
    const first = service.compute(REQUEST);
    (await expectPost()).flush({ points: POINTS });
    await first;

    const second = service.compute(REQUEST);
    const request = await expectPost();
    expect(request.request.headers.get('access-token')).toBe('anon-1');
    request.flush({ points: POINTS });
    await second;
    expect(getAnonymousToken).toHaveBeenCalledTimes(1);
  });

  it('uses the account token when a session is open', async () => {
    session.start('account-jwt');
    const result = service.compute(REQUEST);
    const request = await expectPost();

    expect(request.request.headers.get('access-token')).toBe('account-jwt');
    request.flush({ points: POINTS });
    await result;
    expect(getAnonymousToken).not.toHaveBeenCalled();
  });

  it('does not call the API without a saved profile', async () => {
    profile.set(null);

    await expect(service.compute(REQUEST)).rejects.toMatchObject({ kind: 'no-profile' });
    httpMock.expectNone(URL);
  });

  it('on 401, gets a new anonymous token and retries once', async () => {
    const result = service.compute(REQUEST);
    (await expectPost()).flush(null, { status: 401, statusText: 'Unauthorized' });

    const retry = await expectPost();
    expect(retry.request.headers.get('access-token')).toBe('anon-2');
    retry.flush({ points: POINTS });

    // Un jeton anonyme refusé ne déconnecte personne : rien à annoncer.
    await expect(result).resolves.toEqual({ points: POINTS });
  });

  it('on 401 with an account token, ends the session and retries once anonymously', async () => {
    session.start('account-jwt');
    const result = service.compute(REQUEST);
    (await expectPost()).flush(null, { status: 401, statusText: 'Unauthorized' });

    const retry = await expectPost();
    expect(session.isAuthenticated()).toBe(false);
    expect(retry.request.headers.get('access-token')).toBe('anon-1');
    retry.flush({ points: POINTS });

    await expect(result).resolves.toEqual({ points: POINTS, sessionExpired: true });
  });

  it('gives up after a second 401', async () => {
    const result = service.compute(REQUEST).catch((error: unknown) => error);
    (await expectPost()).flush(null, { status: 401, statusText: 'Unauthorized' });
    (await expectPost()).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await result).toMatchObject({ kind: 'unauthorized' });
    httpMock.expectNone(URL);
  });

  it('maps 400 to invalid-request and only logs the API message', async () => {
    const error = await failWith(400, { error: 'Could not geocode "Rue des Zzzz"' });

    expect(error).toBeInstanceOf(ItineraryError);
    expect(error.kind).toBe('invalid-request');
    expect(error.message).not.toContain('geocode');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('400'),
      expect.stringContaining('Could not geocode'),
    );
  });

  it('maps 422 to unprocessable', async () => {
    expect((await failWith(422, { error: 'Point outside of the map' })).kind).toBe('unprocessable');
  });

  it('maps 429 to rate-limited with the Retry-After delay', async () => {
    const error = await failWith(429, null, { 'Retry-After': '30' });
    expect(error.kind).toBe('rate-limited');
    expect(error.details.retryAfterSeconds).toBe(30);
  });

  it('maps 500 to server and keeps the errorId for the report', async () => {
    const error = await failWith(500, {
      error: 'boom',
      errorId: '3f9a1c0b3f9a1c0b3f9a1c0b3f9a1c0b',
    });
    expect(error.kind).toBe('server');
    expect(error.details.errorId).toBe('3f9a1c0b3f9a1c0b3f9a1c0b3f9a1c0b');
  });

  it('maps a network failure to server', async () => {
    const result = service.compute(REQUEST).catch((error: unknown) => error);
    (await expectPost()).error(new ProgressEvent('error'), { status: 0 });
    expect(await result).toMatchObject({ kind: 'server' });
  });

  it('maps a body outside the contract to server', async () => {
    const result = service.compute(REQUEST).catch((error: unknown) => error);
    (await expectPost()).flush({ route: [] });
    expect(await result).toMatchObject({ kind: 'server' });
  });
});
