import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { AccountError, AccountSession } from './account.models';
import { HttpAccountService } from './http-account.service';

const BASE = environment.apiUrl.replace(/\/+$/, '');

describe('HttpAccountService', () => {
  let service: HttpAccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HttpAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const register = () =>
    service.register({
      name: 'Camille',
      email: 'camille@exemple.fr',
      password: 'motdepasse1',
      birthDate: '1999-05-17',
      consent: true,
    });

  it('posts the registration in snake_case, without consent, and returns the token', () => {
    let session: AccountSession | undefined;
    register().subscribe((s) => (session = s));

    const request = httpMock.expectOne(`${BASE}/v0/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Camille',
      email: 'camille@exemple.fr',
      password: 'motdepasse1',
      birth_date: '1999-05-17',
    });
    request.flush({ accessToken: 'jwt-1' }, { status: 201, statusText: 'Created' });

    expect(session).toEqual({ accessToken: 'jwt-1' });
  });

  it('posts the credentials on login and returns the token', () => {
    let session: AccountSession | undefined;
    service
      .login({ email: 'camille@exemple.fr', password: 'motdepasse1' })
      .subscribe((s) => (session = s));

    const request = httpMock.expectOne(`${BASE}/v0/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'camille@exemple.fr',
      password: 'motdepasse1',
    });
    request.flush({ accessToken: 'jwt-2' });

    expect(session).toEqual({ accessToken: 'jwt-2' });
  });

  it('maps a 409 on register to email-already-used', () => {
    let error: unknown;
    register().subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${BASE}/v0/auth/register`)
      .flush({ error: 'Email already used.' }, { status: 409, statusText: 'Conflict' });

    expect(error).toBeInstanceOf(AccountError);
    expect((error as AccountError).code).toBe('email-already-used');
  });

  it('maps a 401 on login to invalid-credentials', () => {
    let error: unknown;
    service.login({ email: 'a@b.fr', password: 'x' }).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${BASE}/v0/auth/login`)
      .flush({ error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

    expect((error as AccountError).code).toBe('invalid-credentials');
  });

  it('maps an unreachable API to unavailable', () => {
    let error: unknown;
    register().subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${BASE}/v0/auth/register`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect((error as AccountError).code).toBe('unavailable');
  });

  it('maps a 400 and a 500 to unknown, keeping the backend message', () => {
    const errors: AccountError[] = [];
    register().subscribe({ error: (e) => errors.push(e) });
    register().subscribe({ error: (e) => errors.push(e) });

    const [first, second] = httpMock.match(`${BASE}/v0/auth/register`);
    first.flush({ error: 'Password too weak.' }, { status: 400, statusText: 'Bad Request' });
    second.flush(
      { error: 'boom', errorId: 'e1' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(errors.map((e) => e.code)).toEqual(['unknown', 'unknown']);
    expect(errors[0].message).toBe('Password too weak.');
  });
});
