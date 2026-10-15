import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAnonymousToken should return mock token', () => {
    return new Promise((resolve) => {
      service.getAnonymousToken().subscribe((res) => {
        expect(res.accessToken).toContain('mock-token-');
        resolve(true);
      });
    });
  });
});
