import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { ApiError } from '../core/http/api-error';
import { MobilityProfileHttp } from './mobility-profile.http';
import { ProfileResponse } from './mobility-profile.api';

const BASE = environment.apiUrl.replace(/\/+$/, '');
const PROFILE_URL = `${BASE}/v0/users/me/profile`;
const TOKEN = { 'access-token': 'jwt-1' };

const catalogueBody = {
  categories: [
    {
      id: 'manual',
      name: 'Manual wheelchairs',
      models: [
        {
          id: 'invacare-action-kuschall',
          brand: 'Invacare',
          range: 'Action, Küschall',
          width: { min: 0.6, max: 0.7 },
          length: { min: 0.9, max: 1.0 },
          recommended_wheelchair_width: 0.7,
        },
      ],
    },
    {
      id: 'electric',
      name: 'Electric wheelchairs',
      models: [
        {
          id: 'permobil-m3',
          brand: 'Permobil',
          range: 'M3',
          width: { min: 0.6, max: 0.68 },
          length: { min: 1.0, max: 1.1 },
          recommended_wheelchair_width: 0.68,
        },
      ],
    },
  ],
  accessibility_standards: {
    min_passage_width: 0.8,
    recommended_corridor_width: 0.9,
    turning_circle_diameter: 1.5,
  },
};

describe('MobilityProfileHttp', () => {
  let http: MobilityProfileHttp;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(MobilityProfileHttp);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const saved: ProfileResponse = {
    consent: true,
    app_profile: 'stroller',
    mobility_profile: 0,
    consent_given_at: '2026-11-21T10:00:00Z',
    updated_at: '2026-11-21T10:05:00Z',
  };

  it('loads the wheelchair models as a flat list with their recommended width', () => {
    let models: unknown;
    http.loadWheelchairModels('jwt-1').subscribe((m) => (models = m));

    const request = httpMock.expectOne(`${BASE}/v0/wheelchairs`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('access-token')).toBe('jwt-1');
    request.flush(catalogueBody);

    expect(models).toEqual([
      {
        id: 'invacare-action-kuschall',
        label: 'Invacare — Action, Küschall',
        category: 'manual',
        widthM: 0.7,
      },
      { id: 'permobil-m3', label: 'Permobil — M3', category: 'electric', widthM: 0.68 },
    ]);
  });

  it('loads the saved profile with the token', () => {
    let result: unknown;
    http.load('jwt-1', () => undefined).subscribe((r) => (result = r));

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('access-token')).toBe('jwt-1');
    request.flush(saved);

    expect(result).toEqual({
      version: 1,
      consentGivenAt: '2026-11-21T10:00:00Z',
      data: { profile: 'stroller' },
    });
  });

  it('returns null when the user has not saved a profile yet (404)', () => {
    let result: unknown = 'unset';
    http.load('jwt-1', () => undefined).subscribe((r) => (result = r));

    httpMock.expectOne(PROFILE_URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(result).toBeNull();
  });

  it('propagates the other load errors as ApiError', () => {
    let error: ApiError | undefined;
    http.load('jwt-1', () => undefined).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(PROFILE_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error?.kind).toBe('unauthorized');
  });

  it('saves the profile with PUT, consent included, and returns the stored profile', () => {
    let result: unknown;
    http.save({ profile: 'stroller' }, 'jwt-1', () => undefined).subscribe((r) => (result = r));

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('access-token')).toBe('jwt-1');
    expect(request.request.body).toEqual({
      consent: true,
      app_profile: 'stroller',
      mobility_profile: 0,
    });
    request.flush(saved);

    expect(result).toMatchObject({ consentGivenAt: '2026-11-21T10:00:00Z' });
  });

  it('withdraws the consent with DELETE on the profile', () => {
    let done = false;
    http.clear('jwt-1').subscribe({ complete: () => (done = true) });

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('access-token')).toBe(TOKEN['access-token']);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });
});
