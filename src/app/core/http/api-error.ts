/**
 * Error contract shared with `api-back`.
 *
 * Mirrors the backend error DTOs, serialized in camelCase by `Program.cs`:
 * - `Shared/Errors/ErrorResponse.cs` → `ErrorResponse` (400)
 * - `Shared/Errors/ServerErrorResponse.cs` → `ServerErrorResponse` (500)
 */

/** Payload of `Shared.Errors.ErrorResponse` — returned with 400 on validation failures. */
export interface ApiErrorPayload {
  readonly error: string;
}

/**
 * Payload of `Shared.Errors.ServerErrorResponse`, returned with 500 by
 * `ExceptionHandlingMiddleware`.
 */
export interface ApiServerErrorPayload extends ApiErrorPayload {
  readonly errorId: string;
}

/**
 * How an API call failed.
 *
 * `status` is the HTTP status code, or `0` when the request never reached the server
 * (network failure, CORS rejection, offline).
 */
export type ApiErrorKind =
  'validation' | 'unauthorized' | 'not-found' | 'server' | 'network' | 'unknown';

/**
 * Normalized error surfaced by every client call, so callers never inspect a
 * raw `HttpErrorResponse`.
 */
export interface ApiError {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Human-readable message. Falls back to a generic label when the body carries none. */
  readonly message: string;
  /** Correlation id, present on 500 responses from `ExceptionHandlingMiddleware`. */
  readonly errorId?: string;
  /** Raw parsed body, kept for diagnostics. */
  readonly body?: unknown;
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  validation: 'The request was rejected.',
  unauthorized: 'Authentication is required.',
  'not-found': 'The requested resource was not found.',
  server: 'The server encountered an error.',
  network: 'The server could not be reached.',
  unknown: 'An unexpected error occurred.',
};

/**
 * Maps an HTTP status code to an {@link ApiErrorKind}.
 *
 * `0` is a transport failure. Any other unmapped status — including the `-1`
 * sentinel used for non-HTTP failures — resolves to `unknown`.
 */
export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 0) {
    return 'network';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  if (status === 401 || status === 403) {
    return 'unauthorized';
  }
  if (status === 404) {
    return 'not-found';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Narrows a raw body to {@link ApiErrorPayload} without trusting its shape. */
export function isApiErrorPayload(body: unknown): body is ApiErrorPayload {
  return isRecord(body) && typeof body['error'] === 'string';
}

/** Narrows a raw body to {@link ApiServerErrorPayload} without trusting its shape. */
export function isApiServerErrorPayload(body: unknown): body is ApiServerErrorPayload {
  return isRecord(body) && typeof body['error'] === 'string' && typeof body['errorId'] === 'string';
}

/** Builds a normalized {@link ApiError} from a status code and raw response body. */
export function createApiError(status: number, body: unknown): ApiError {
  const kind = kindFromStatus(status);

  let message = FALLBACK_MESSAGES[kind];
  let errorId: string | undefined;

  if (isApiErrorPayload(body) && body.error.trim().length > 0) {
    message = body.error;
  }

  if (isApiServerErrorPayload(body) && body.errorId.trim().length > 0) {
    errorId = body.errorId;
  }

  return { kind, status, message, ...(errorId ? { errorId } : {}), body };
}
