import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';

const BASE = environment.apiUrl.replace(/\/+$/, '');

describe('ApiClient', () => {
  let client: ApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    client = TestBed.inject(ApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('resolves the path against environment.apiUrl', () => {
    client.get('v0/auth/anonymous').subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/auth/anonymous`);
    expect(request.request.method).toBe('GET');
    request.flush({ accessToken: 'abc' });
  });

  it('tolerates a leading slash in the path', () => {
    client.get('/v0/auth/anonymous').subscribe();

    httpMock.expectOne(`${BASE}/v0/auth/anonymous`).flush({});
  });

  it('sends no access-token header by default', () => {
    client.get('v0/itineraries').subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/itineraries`);
    expect(request.request.headers.has('access-token')).toBe(false);
    request.flush({});
  });

  it('sends a POST body', () => {
    client.post('v0/itineraries', { origin: 'a' }).subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/itineraries`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ origin: 'a' });
    request.flush({});
  });

  it('sends the headers provided by the caller', () => {
    client
      .get('v0/itineraries', { headers: { 'access-token': 'token-123', 'x-trace': 'abc' } })
      .subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/itineraries`);
    expect(request.request.headers.get('access-token')).toBe('token-123');
    expect(request.request.headers.get('x-trace')).toBe('abc');
    request.flush({});
  });

  it('maps a 400 ErrorResponse to a validation error carrying the backend message', () => {
    let received: ApiError | undefined;
    client.get('v0/itineraries').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock
      .expectOne(`${BASE}/v0/itineraries`)
      .flush({ error: 'Origin is required.' }, { status: 400, statusText: 'Bad Request' });

    expect(received?.kind).toBe('validation');
    expect(received?.status).toBe(400);
    expect(received?.message).toBe('Origin is required.');
  });

  it('maps a 401 to an unauthorized error', () => {
    let received: ApiError | undefined;
    client.get('v0/itineraries').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock
      .expectOne(`${BASE}/v0/itineraries`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(received?.kind).toBe('unauthorized');
    expect(received?.status).toBe(401);
  });

  it('maps a 500 ServerErrorResponse to a server error carrying errorId', () => {
    let received: ApiError | undefined;
    client.get('v0/itineraries').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock
      .expectOne(`${BASE}/v0/itineraries`)
      .flush(
        { error: 'boom', errorId: 'err-1' },
        { status: 500, statusText: 'Internal Server Error' },
      );

    expect(received?.kind).toBe('server');
    expect(received?.status).toBe(500);
    expect(received?.message).toBe('boom');
    expect(received?.errorId).toBe('err-1');
  });

  it('maps a 404 to a not-found error', () => {
    let received: ApiError | undefined;
    client.get('v0/missing').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock.expectOne(`${BASE}/v0/missing`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(received?.kind).toBe('not-found');
  });

  it('maps a transport failure to a network error with status 0', () => {
    let received: ApiError | undefined;
    client.get('v0/itineraries').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock
      .expectOne(`${BASE}/v0/itineraries`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(received?.kind).toBe('network');
    expect(received?.status).toBe(0);
  });

  it('falls back to a generic message when the body carries none', () => {
    let received: ApiError | undefined;
    client.get('v0/itineraries').subscribe({ error: (error: ApiError) => (received = error) });

    httpMock
      .expectOne(`${BASE}/v0/itineraries`)
      .flush(null, { status: 400, statusText: 'Bad Request' });

    expect(received?.kind).toBe('validation');
    expect(received?.message).toBe('The request was rejected.');
  });

  it('sends a PUT body', () => {
    client.put('v0/users/me/profile', { consent: true }).subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/users/me/profile`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ consent: true });
    request.flush({});
  });

  it('sends a DELETE request with the caller headers', () => {
    client.delete('v0/users/me', { headers: { 'access-token': 'token-123' } }).subscribe();

    const request = httpMock.expectOne(`${BASE}/v0/users/me`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('access-token')).toBe('token-123');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('normalizes errors of PUT and DELETE like the other methods', () => {
    const received: ApiError[] = [];
    client.put('v0/users/me/profile', {}).subscribe({ error: (e: ApiError) => received.push(e) });
    client.delete('v0/users/me').subscribe({ error: (e: ApiError) => received.push(e) });

    httpMock
      .expectOne((r) => r.method === 'PUT')
      .flush({ error: 'Consent is required.' }, { status: 400, statusText: 'Bad Request' });
    httpMock
      .expectOne((r) => r.method === 'DELETE')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(received.map((e) => e.kind)).toEqual(['validation', 'unauthorized']);
    expect(received[0].message).toBe('Consent is required.');
  });

  it('maps a 409 to a conflict error carrying the backend message', () => {
    let received: ApiError | undefined;
    client.post('v0/auth/register', {}).subscribe({ error: (e: ApiError) => (received = e) });

    httpMock
      .expectOne(`${BASE}/v0/auth/register`)
      .flush({ error: 'Email already used.' }, { status: 409, statusText: 'Conflict' });

    expect(received?.kind).toBe('conflict');
    expect(received?.status).toBe(409);
    expect(received?.message).toBe('Email already used.');
  });

  it('reads the Retry-After header of a 429', () => {
    let received: ApiError | undefined;
    client.post('v0/itinerary', {}).subscribe({ error: (e: ApiError) => (received = e) });

    httpMock.expectOne(`${BASE}/v0/itinerary`).flush(null, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'Retry-After': '20' },
    });

    expect(received?.kind).toBe('rate-limited');
    expect(received?.retryAfterSeconds).toBe(20);
  });
});
