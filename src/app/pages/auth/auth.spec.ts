import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from './auth';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a successful authentication result', () => {
    fixture.componentInstance.testAuthentication();

    const request = httpTestingController.expectOne('http://localhost:5217/v0/auth/anonymous');
    request.flush({ accessToken: 'api-token' }, { status: 202, statusText: 'Accepted' });

    expect(component.status()).toBe('success');
  });

  it('should show a failed authentication result', () => {
    fixture.componentInstance.testAuthentication();

    const request = httpTestingController.expectOne('http://localhost:5217/v0/auth/anonymous');
    request.flush({ error: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(component.status()).toBe('error');
  });
});
