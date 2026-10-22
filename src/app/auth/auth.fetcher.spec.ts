import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthFetcher } from './auth.fetcher';

describe('AuthFetcher', () => {
  let fetcher: AuthFetcher;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fetcher = TestBed.inject(AuthFetcher);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should fetch an anonymous token from api-back', () => {
    fetcher.getAnonymousToken().subscribe((response) => {
      expect(response).toEqual({ accessToken: 'api-token' });
    });

    const request = httpTestingController.expectOne('http://localhost:5217/v0/auth/anonymous');
    expect(request.request.method).toBe('GET');
    request.flush({ accessToken: 'api-token' }, { status: 202, statusText: 'Accepted' });
  });

  it('should expose API errors to the caller', () => {
    let receivedError = false;

    fetcher.getAnonymousToken().subscribe({
      error: (error: unknown) => {
        receivedError = Boolean(error);
      },
    });

    const request = httpTestingController.expectOne('http://localhost:5217/v0/auth/anonymous');
    request.flush(
      { error: 'Authentication service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(receivedError).toBe(true);
  });
});
