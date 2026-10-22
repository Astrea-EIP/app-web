import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TokenResponse } from './auth.models';
import { AuthFetcher } from './auth.fetcher';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authFetcher = inject(AuthFetcher);

  getAnonymousToken(): Observable<TokenResponse> {
    return this.authFetcher.getAnonymousToken();
  }
}
