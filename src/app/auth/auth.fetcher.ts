import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFetcher {
  private readonly baseUrl = `${environment.apiUrl}/v0/auth`;
  private readonly http = inject(HttpClient);

  getAnonymousToken(): Observable<TokenResponse> {
    return this.http.get<TokenResponse>(`${this.baseUrl}/anonymous`);
  }
}
