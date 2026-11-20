import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AccountError, AccountSession } from '../../auth/account.models';
import { AccountService, UnavailableAccountService } from '../../auth/account.service';
import { Auth } from './auth';

describe('Auth', () => {
  let fixture: ComponentFixture<Auth>;
  let root: HTMLElement;
  let account: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

  async function setup(useReal = false) {
    account = { login: vi.fn(), register: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: useReal ? [] : [{ provide: AccountService, useValue: account }],
    }).compileComponents();
    fixture = TestBed.createComponent(Auth);
    root = fixture.nativeElement;
    fixture.detectChanges();
  }

  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const field = (label: string): HTMLInputElement => {
    const labels = Array.from(root.querySelectorAll('label.field__label'));
    const l = labels.find((x) => x.textContent?.includes(label))!;
    return root.querySelector<HTMLInputElement>(`#${l.getAttribute('for')}`)!;
  };
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const blur = (input: HTMLInputElement) => {
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const submit = () => {
    $('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const switchTo = (label: string) => {
    const radio = Array.from(root.querySelectorAll<HTMLInputElement>('input[type=radio]')).find(
      (r) => r.closest('label')?.textContent?.includes(label),
    )!;
    radio.click();
    fixture.detectChanges();
  };
  const errors = () =>
    Array.from(root.querySelectorAll('.field__error, .consent__error')).map((e) =>
      e.textContent!.trim(),
    );
  const fillLogin = () => {
    type(field('Adresse e-mail'), 'camille@exemple.fr');
    type(field('Mot de passe'), 'secret');
  };
  const fillRegister = () => {
    type(field('Nom'), 'Camille Durand');
    type(field('Adresse e-mail'), 'camille@exemple.fr');
    type(field('Mot de passe'), 'motdepasse1');
    type(field('Date de naissance'), '1999-05-17');
    const consent = $<HTMLInputElement>('.consent__input');
    consent.click();
    fixture.detectChanges();
  };

  describe('segmented control', () => {
    beforeEach(() => setup());

    it('starts on login and switches to register and back', () => {
      expect($('h1').textContent).toContain('Bon retour sur Astrea');
      expect(root.querySelectorAll('app-text-field').length).toBe(2);

      switchTo('Créer un compte');
      expect($('h1').textContent).toContain('Créer votre compte Astrea');
      expect(root.querySelectorAll('app-text-field').length).toBe(4);
      expect($('.consent__input')).not.toBeNull();

      switchTo('Se connecter');
      expect($('h1').textContent).toContain('Bon retour sur Astrea');
      expect(root.querySelector('.consent__input')).toBeNull();
    });

    it('clears errors when switching', () => {
      submit();
      expect(errors().length).toBeGreaterThan(0);
      switchTo('Créer un compte');
      expect(errors()).toEqual([]);
    });

    it('does not offer a Google button', () => {
      expect(root.textContent).not.toContain('Google');
    });
  });

  describe('login validation', () => {
    beforeEach(() => setup());

    it('shows required errors on submit and does not call the service', async () => {
      submit();
      await fixture.whenStable();
      TestBed.inject(ApplicationRef).tick();
      expect(errors()).toEqual([
        'Saisissez votre adresse e-mail.',
        'Saisissez votre mot de passe.',
      ]);
      expect(account.login).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(field('Adresse e-mail'));
    });

    it('flags an invalid e-mail once the field is left', () => {
      const email = field('Adresse e-mail');
      type(email, 'camille@');
      expect(errors()).toEqual([]);
      blur(email);
      expect(errors()[0]).toContain('semble invalide');
      expect(email.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not impose the strength rule on login', () => {
      account.login.mockReturnValue(of({ accessToken: 't' }));
      fillLogin();
      submit();
      expect(errors()).toEqual([]);
    });
  });

  describe('register validation', () => {
    beforeEach(async () => {
      await setup();
      switchTo('Créer un compte');
    });

    it('shows every required error on an empty submit, including consent', () => {
      submit();
      const list = errors();
      expect(list).toHaveLength(5);
      expect(list[0]).toBe('Saisissez votre nom.');
      expect(list[4]).toContain('vous devez accepter');
      expect(account.register).not.toHaveBeenCalled();
    });

    it('rejects a weak password', () => {
      const password = field('Mot de passe');
      type(password, 'abc');
      blur(password);
      expect(errors()[0]).toContain('trop faible');
      type(password, 'abcdefgh');
      expect(errors()[0]).toContain('trop faible');
      type(password, 'abcdefg1');
      expect(errors()).toEqual([]);
    });

    it('rejects a future birth date', () => {
      const date = field('Date de naissance');
      type(date, '2999-01-01');
      blur(date);
      expect(errors()[0]).toContain('date de naissance valide');
    });

    it('requires consent with an icon and text', () => {
      fillRegister();
      $<HTMLInputElement>('.consent__input').click();
      fixture.detectChanges();
      submit();
      const error = $('.consent__error');
      expect(error.querySelector('svg')).not.toBeNull();
      expect(error.textContent).toContain('vous devez accepter');
      expect($('.consent__input').getAttribute('aria-invalid')).toBe('true');
      expect(account.register).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    beforeEach(() => setup());

    it('calls login with the form values and shows success', () => {
      account.login.mockReturnValue(of({ accessToken: 't' } satisfies AccountSession));
      fillLogin();
      submit();
      expect(account.login).toHaveBeenCalledWith({
        email: 'camille@exemple.fr',
        password: 'secret',
      });
      expect(root.textContent).toContain('Vous êtes connecté');
    });

    it('calls register with trimmed name and consent', () => {
      account.register.mockReturnValue(of({ accessToken: 't' }));
      switchTo('Créer un compte');
      fillRegister();
      submit();
      expect(account.register).toHaveBeenCalledWith({
        name: 'Camille Durand',
        email: 'camille@exemple.fr',
        password: 'motdepasse1',
        birthDate: '1999-05-17',
        consent: true,
      });
    });

    it('shows a loading state and blocks double submission', () => {
      const pending = new Subject<AccountSession>();
      account.login.mockReturnValue(pending as Observable<AccountSession>);
      fillLogin();
      submit();
      const button = $<HTMLButtonElement>('button[type=submit]');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.textContent).toContain('Connexion en cours');
      submit();
      expect(account.login).toHaveBeenCalledTimes(1);
      pending.next({ accessToken: 't' });
      pending.complete();
      fixture.detectChanges();
      expect(button.getAttribute('aria-busy')).toBeNull();
    });

    it('shows a reassuring error alert when the service fails', () => {
      account.login.mockReturnValue(throwError(() => new AccountError('invalid-credentials')));
      fillLogin();
      submit();
      const alert = $('app-alert');
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.textContent).toContain('pas reconnu cette adresse e-mail');
    });

    it('maps an unknown failure to a generic message', () => {
      account.login.mockReturnValue(throwError(() => new Error('boom')));
      fillLogin();
      submit();
      expect($('app-alert').textContent).toContain('Un problème est survenu');
    });
  });

  describe('default service', () => {
    beforeEach(() => setup(true));

    it('is the unavailable implementation and surfaces a typed error', () => {
      expect(TestBed.inject(AccountService)).toBeInstanceOf(UnavailableAccountService);
      fillLogin();
      submit();
      const alert = $('app-alert');
      expect(alert.classList).toContain('alert--error');
      expect(alert.textContent).toContain('ne sont pas encore disponibles');
    });
  });
});
