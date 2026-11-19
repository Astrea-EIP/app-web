import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError, createApiError } from './api-error';

/** Per-call options. */
export interface RequestOptions {
  /** Extra headers sent with the request. */
  readonly headers?: Record<string, string>;
}

/**
 * Typed HTTP client for `api-back`.
 *
 * Responsibilities:
 * - resolves relative paths against `environment.apiUrl`;
 * - normalizes every failure into an {@link ApiError}.
 *
 * Endpoint-specific knowledge, including access-token handling, belongs in
 * feature services, not here.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  /** Performs a `GET` request. */
  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http
      .get<T>(this.resolve(path), { headers: this.buildHeaders(options) })
      .pipe(catchError((error: unknown) => this.toApiError(error)));
  }

  /** Performs a `POST` request. */
  post<T>(path: string, body: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http
      .post<T>(this.resolve(path), body, { headers: this.buildHeaders(options) })
      .pipe(catchError((error: unknown) => this.toApiError(error)));
  }

  /**
   * Joins `environment.apiUrl` with a path.
   *
   * A leading slash is always inserted, so callers may pass either
   * `'v0/auth/anonymous'` or `'/v0/auth/anonymous'`.
   */
  private resolve(path: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  }

  private buildHeaders(options: RequestOptions): HttpHeaders {
    return new HttpHeaders(options.headers ?? {});
  }

  private toApiError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      // status 0 means the request never reached the server: network failure,
      // CORS rejection, or the API being unreachable.
      return throwError(() => createApiError(error.status, error.error));
    }

    // A non-HTTP failure (e.g. a parsing error) is `unknown`, not `network`:
    // it must not be reported as an unreachable server.
    return throwError(() => createApiError(-1, error));
  }
}
