import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { TokenResponse, AuthErrorResponse } from './auth.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/v0/auth`;

  constructor(private http: HttpClient) {}

  getAnonymousToken(): Observable<TokenResponse> {
    // Mock-up : fondation uniquement, conforme au contrat api-back (anonymous)
    return of({ accessToken: 'mock-token-' + Date.now() });
  }
}
