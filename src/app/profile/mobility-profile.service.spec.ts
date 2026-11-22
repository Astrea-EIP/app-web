import { TestBed } from '@angular/core/testing';
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
