import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthFetcher } from './auth.fetcher';

describe('AuthService', () => {
  let service: AuthService;
  let authFetcher: { getAnonymousToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authFetcher = {
      getAnonymousToken: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthFetcher,
          useValue: authFetcher,
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate anonymous token requests to the fetcher', () => {
    const tokenResponse = { accessToken: 'api-token' };
    authFetcher.getAnonymousToken.mockReturnValue(of(tokenResponse));

    service.getAnonymousToken().subscribe((response) => {
      expect(response).toEqual(tokenResponse);
    });

    expect(authFetcher.getAnonymousToken).toHaveBeenCalledOnce();
  });
});
