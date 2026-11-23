import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SessionService } from './session.service';

describe('SessionService', () => {
  it('démarre sans session', () => {
    const session = TestBed.inject(SessionService);
    expect(session.accessToken()).toBeNull();
    expect(session.isAuthenticated()).toBe(false);
  });

  it('garde le jeton après start() et l’oublie après end()', () => {
    const session = TestBed.inject(SessionService);

    session.start('jeton');
    expect(session.accessToken()).toBe('jeton');
    expect(session.isAuthenticated()).toBe(true);

    session.end();
    expect(session.accessToken()).toBeNull();
    expect(session.isAuthenticated()).toBe(false);
  });

  it('n’écrit le jeton dans aucun stockage du navigateur', () => {
    const session = TestBed.inject(SessionService);
    session.start('jeton-secret');

    expect(JSON.stringify({ ...localStorage })).not.toContain('jeton-secret');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('jeton-secret');
    expect(document.cookie).not.toContain('jeton-secret');
  });
});
