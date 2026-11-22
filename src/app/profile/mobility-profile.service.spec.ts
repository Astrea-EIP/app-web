import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SessionService } from '../auth/session.service';
import { MobilityProfileService } from './mobility-profile.service';
import { MOBILITY_PROFILE_STORE, StoredMobilityProfile } from './mobility-profile.store';
import { SESSION_STORAGE_KEY, SessionMobilityProfileStore } from './session-mobility-profile.store';

describe('SessionMobilityProfileStore', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns null when nothing is stored or the content is invalid', () => {
    const store = new SessionMobilityProfileStore();
    expect(store.load()).toBeNull();
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'pas du json');
    expect(store.load()).toBeNull();
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ version: 1, consentGivenAt: 'x', data: { profile: 'inconnu' } }),
    );
    expect(store.load()).toBeNull();
  });

  it('saves, loads and clears', () => {
    const store = new SessionMobilityProfileStore();
    const record: StoredMobilityProfile = {
      version: 1,
      consentGivenAt: '2026-11-18T10:00:00.000Z',
      data: { profile: 'stroller' },
    };
    store.save(record);
    expect(store.load()).toEqual(record);
    store.clear();
    expect(store.load()).toBeNull();
  });
});

describe('MobilityProfileService', () => {
  beforeEach(() => sessionStorage.clear());

  it('has no profile and no mobility_profile at first', () => {
    const service = TestBed.inject(MobilityProfileService);
    expect(service.profile()).toBeNull();
    expect(service.mobilityProfile()).toBeNull();
  });

  it('refuses to save without consent and writes nothing', () => {
    const service = TestBed.inject(MobilityProfileService);
    expect(() => service.save({ profile: 'stroller' }, false)).toThrow();
    expect(service.profile()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('exposes the numeric mobility_profile after saving', () => {
    const service = TestBed.inject(MobilityProfileService);
    service.save({ profile: 'assisted-walking', canClimbStairs: false }, true);
    expect(service.mobilityProfile()).toBe(2);
    service.save({ profile: 'visually-impaired', accompanied: false }, true);
    expect(service.mobilityProfile()).toBe(3);
  });

  it('reloads the saved profile on creation (new service instance)', () => {
    TestBed.inject(MobilityProfileService).save(
      {
        profile: 'pedestrian',
        stairsOrSlopes: 'none',
        preferWidePaths: true,
        preferLitStreets: false,
        requireBenches: false,
      },
      true,
    );
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(MobilityProfileService);
    expect(reloaded.profile()?.profile).toBe('pedestrian');
    expect(reloaded.mobilityProfile()).toBe(0);
  });

  it('clear removes the profile', () => {
    const service = TestBed.inject(MobilityProfileService);
    service.save({ profile: 'stroller' }, true);
    service.clear();
    expect(service.profile()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('uses a replacement store provided through the port', () => {
    const saved: StoredMobilityProfile[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MOBILITY_PROFILE_STORE,
          useValue: {
            load: () => null,
            save: (p: StoredMobilityProfile) => saved.push(p),
            clear: () => undefined,
          },
        },
      ],
    });
    TestBed.inject(MobilityProfileService).save({ profile: 'stroller' }, true);
    expect(saved).toHaveLength(1);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('MobilityProfileService with an account', () => {
  const BASE = environment.apiUrl.replace(/\/+$/, '');
  const PROFILE_URL = `${BASE}/v0/users/me/profile`;
  const stored = {
    consent: true,
    app_profile: 'pedestrian',
    mobility_profile: 0,
    path_preferences: 4,
    consent_given_at: '2026-11-23T10:00:00.000Z',
    updated_at: '2026-11-23T10:00:00.000Z',
  };
  let http: HttpTestingController;

  /** Ouvre la session : le service charge le catalogue puis le profil du compte. */
  async function connect(profile: object | null) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(MobilityProfileService);
    TestBed.inject(SessionService).start('jeton');
    TestBed.tick();
    http.expectOne(`${BASE}/v0/wheelchairs`).flush({ categories: [] });
    await Promise.resolve();
    const request = http.expectOne(PROFILE_URL);
    if (profile) {
      request.flush(profile);
    } else {
      request.flush({ error: 'none' }, { status: 404, statusText: 'Not Found' });
    }
    return service;
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => http.verify());

  it('loads the account profile on login and keeps a local copy', async () => {
    const service = await connect(stored);
    expect(service.profile()).toMatchObject({ profile: 'pedestrian', preferWidePaths: true });
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps the local profile when the account has none yet (404)', async () => {
    const service = await connect(null);
    expect(service.profile()).toBeNull();
  });

  it('sends the profile with the account token', async () => {
    const service = await connect(null);
    let done = false;
    service.saveAndSync({ profile: 'stroller' }, true).subscribe(() => (done = true));
    const put = http.expectOne(PROFILE_URL);
    expect(put.request.method).toBe('PUT');
    expect(put.request.headers.get('access-token')).toBe('jeton');
    put.flush({ ...stored, app_profile: 'stroller' });
    expect(done).toBe(true);
    expect(service.profile()?.profile).toBe('stroller');
  });

  it('writes nothing, locally or remotely, without consent', async () => {
    const service = await connect(null);
    expect(() => service.saveAndSync({ profile: 'stroller' }, false)).toThrow();
    http.expectNone(PROFILE_URL);
    expect(service.profile()).toBeNull();
  });

  it('ends the session when the API answers 401', async () => {
    const service = await connect(null);
    let error: unknown;
    service.saveAndSync({ profile: 'stroller' }, true).subscribe({ error: (e) => (error = e) });
    http
      .expectOne(PROFILE_URL)
      .flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    expect(error).toMatchObject({ kind: 'unauthorized' });
    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
  });

  it('only saves locally without an account', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(MobilityProfileService);
    let done = false;
    service.saveAndSync({ profile: 'stroller' }, true).subscribe(() => (done = true));
    expect(done).toBe(true);
    expect(service.profile()?.profile).toBe('stroller');
    http.expectNone(PROFILE_URL);
  });

  it('asks the API to delete the profile on clear', async () => {
    const service = await connect(stored);
    service.clear();
    const del = http.expectOne(PROFILE_URL);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.profile()).toBeNull();
  });
});
