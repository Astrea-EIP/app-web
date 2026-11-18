import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AccountError, AccountSession, LoginRequest, RegisterRequest } from './account.models';

/**
 * Port du service de compte (création de compte et connexion).
 *
 * api-back n'expose pour l'instant que `GET /v0/auth/anonymous` : aucune route d'inscription ni de
 * connexion n'existe. L'implémentation par défaut est donc explicitement « non disponible ».
 * Quand les routes existeront, fournir une implémentation HTTP à la place (voir docs/decisions/0002).
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
