import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { ApiClient } from '../core/http/api-client';
import { ApiError } from '../core/http/api-error';
import {
  AccountError,
  AccountErrorCode,
  AccountSession,
  LoginRequest,
  RegisterRequest,
} from './account.models';
import { AccountService } from './account.service';

/** Réponse de `POST /v0/auth/register` et `POST /v0/auth/login` (docs/contracts/accounts.md). */
interface TokenResponse {
  readonly accessToken: string;
}

/**
 * Service de compte branché sur api-back.
 *
 * - `POST /v0/auth/register` : le contrat attend `birth_date` en snake_case et ne reçoit pas le
 *   consentement, qui se donne sur le profil (`PUT /v0/users/me/profile`).
 * - `POST /v0/auth/login` : renvoie le même jeton que l'accès anonyme ; il s'envoie ensuite dans
 *   l'en-tête `access-token`.
 */
@Injectable({ providedIn: 'root' })
export class HttpAccountService extends AccountService {
  private readonly api = inject(ApiClient);

  login(request: LoginRequest): Observable<AccountSession> {
    return this.api.post<TokenResponse>('v0/auth/login', request).pipe(
      map(({ accessToken }) => ({ accessToken })),
      catchError((error: ApiError) => throwError(() => toAccountError(error, 'login'))),
    );
  }

  register(request: RegisterRequest): Observable<AccountSession> {
    const body = {
      name: request.name,
      email: request.email,
      password: request.password,
      birth_date: request.birthDate,
    };
    return this.api.post<TokenResponse>('v0/auth/register', body).pipe(
      map(({ accessToken }) => ({ accessToken })),
      catchError((error: ApiError) => throwError(() => toAccountError(error, 'register'))),
    );
  }
}

function toAccountError(error: ApiError, action: 'login' | 'register'): AccountError {
  let code: AccountErrorCode = 'unknown';
  if (error.kind === 'network') {
    code = 'unavailable';
  } else if (error.kind === 'conflict' && action === 'register') {
    code = 'email-already-used';
  } else if (error.kind === 'unauthorized' && action === 'login') {
    code = 'invalid-credentials';
  }
  return new AccountError(code, error.message);
}
