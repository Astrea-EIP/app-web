import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFetcher {
  private readonly baseUrl = 'http://localhost:5217/v0/auth';
  private readonly http = inject(HttpClient);

  getAnonymousToken(): Observable<TokenResponse> {
    return this.http
      .get<TokenResponse>(`${this.baseUrl}/anonymous`)
      .pipe(tap((result) => console.log(result)));
  }
}
