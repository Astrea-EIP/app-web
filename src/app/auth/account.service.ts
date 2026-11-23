import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AccountError, AccountSession, LoginRequest, RegisterRequest } from './account.models';

/**
 * Port du service de compte (création de compte et connexion).
 *
 * L'implémentation par défaut est explicitement « non disponible » (utile dans les tests et tant
 * qu'aucun fournisseur n'est déclaré). L'application déclare `HttpAccountService` dans
 * `app.config.ts`, branché sur `POST /v0/auth/register` et `POST /v0/auth/login`.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => new UnavailableAccountService(),
})
export abstract class AccountService {
  abstract login(request: LoginRequest): Observable<AccountSession>;
  abstract register(request: RegisterRequest): Observable<AccountSession>;
}

/** Implémentation par défaut : renvoie toujours `AccountError('unavailable')`. */
@Injectable({ providedIn: 'root' })
export class UnavailableAccountService extends AccountService {
  login(): Observable<AccountSession> {
    return throwError(() => new AccountError('unavailable'));
  }

  register(): Observable<AccountSession> {
    return throwError(() => new AccountError('unavailable'));
  }
}
