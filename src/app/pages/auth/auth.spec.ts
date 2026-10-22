import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { Auth } from './auth';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;
  let authService: { getAnonymousToken: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      getAnonymousToken: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a successful authentication result', () => {
    authService.getAnonymousToken.mockReturnValue(of({ accessToken: 'api-token' }));

    component.testAuthentication();
    fixture.detectChanges();

    expect(component.status()).toBe('success');
    expect(fixture.nativeElement.textContent).toContain('auth works');
    expect(authService.getAnonymousToken).toHaveBeenCalledOnce();
  });

  it('should show a failed authentication result', () => {
    authService.getAnonymousToken.mockReturnValue(
      throwError(() => new Error('Authentication service unavailable')),
    );

    component.testAuthentication();
    fixture.detectChanges();

    expect(component.status()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain("auth doesn't work");
  });

  it('should show a loading status while authentication is pending', () => {
    authService.getAnonymousToken.mockReturnValue(new Observable(() => undefined));

    component.testAuthentication();
    fixture.detectChanges();

    expect(component.status()).toBe('loading');
    expect(fixture.nativeElement.textContent).toContain('Contacting the backend...');
  });
});
