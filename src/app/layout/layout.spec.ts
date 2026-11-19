import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Layout } from './layout';
import { routes } from '../app.routes';
import { provideTestI18n } from '../i18n/testing';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [provideRouter(routes), provideTestI18n()],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche les libellés de navigation traduits en français', () => {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
      (link) => link.textContent?.trim(),
    );
    expect(labels).toEqual([
      'Authentification',
      'Profil',
      'Saisie de trajet',
      'Carte',
      'Historique',
    ]);
  });
});
