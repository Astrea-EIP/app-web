import {
  createApiError,
  isApiErrorPayload,
  isApiServerErrorPayload,
  kindFromStatus,
  parseRetryAfter,
} from './api-error';

describe('kindFromStatus', () => {
  it('treats 0 as a network failure', () => {
    expect(kindFromStatus(0)).toBe('network');
  });

  it('treats 400 and 422 as validation failures', () => {
    expect(kindFromStatus(400)).toBe('validation');
    expect(kindFromStatus(422)).toBe('validation');
  });

  it('treats 401 and 403 as unauthorized', () => {
    expect(kindFromStatus(401)).toBe('unauthorized');
    expect(kindFromStatus(403)).toBe('unauthorized');
  });

  it('treats 404 as not found', () => {
    expect(kindFromStatus(404)).toBe('not-found');
  });

  it('treats 5xx as a server failure', () => {
    expect(kindFromStatus(500)).toBe('server');
    expect(kindFromStatus(503)).toBe('server');
  });

  it('maps 409 to conflict', () => {
    expect(kindFromStatus(409)).toBe('conflict');
  });

  it('maps 429 to rate-limited', () => {
    expect(kindFromStatus(429)).toBe('rate-limited');
  });

  it('falls back to unknown for unmapped statuses', () => {
    expect(kindFromStatus(418)).toBe('unknown');
  });
});

describe('isApiErrorPayload', () => {
  it('accepts an object with a string error field', () => {
    expect(isApiErrorPayload({ error: 'boom' })).toBe(true);
  });

  it('rejects a non-string error field', () => {
    expect(isApiErrorPayload({ error: 42 })).toBe(false);
  });

  it('rejects null and primitives', () => {
    expect(isApiErrorPayload(null)).toBe(false);
    expect(isApiErrorPayload('boom')).toBe(false);
  });

  it('rejects an object without an error field', () => {
    expect(isApiErrorPayload({ message: 'boom' })).toBe(false);
  });
});

describe('isApiServerErrorPayload', () => {
  it('accepts an object with string error and errorId fields', () => {
    expect(isApiServerErrorPayload({ error: 'boom', errorId: 'x' })).toBe(true);
  });

  it('rejects a missing errorId', () => {
    expect(isApiServerErrorPayload({ error: 'boom' })).toBe(false);
  });

  it('rejects a non-string errorId', () => {
    expect(isApiServerErrorPayload({ error: 'boom', errorId: 7 })).toBe(false);
  });
});

describe('createApiError', () => {
  it('reads the camelCase error field emitted by Program.cs', () => {
    const error = createApiError(400, { error: 'Invalid payload.' });

    expect(error.message).toBe('Invalid payload.');
    expect(error.kind).toBe('validation');
  });

  it('extracts errorId from a ServerErrorResponse', () => {
    const error = createApiError(500, { error: 'boom', errorId: 'abc123' });

    expect(error.errorId).toBe('abc123');
  });

  it('omits errorId when absent', () => {
    const error = createApiError(500, { error: 'boom' });

    expect(error.errorId).toBeUndefined();
  });

  it('omits errorId when blank', () => {
    const error = createApiError(500, { error: 'boom', errorId: '   ' });

    expect(error.errorId).toBeUndefined();
  });

  it('falls back to a generic message when error is missing', () => {
    expect(createApiError(401, null).message).toBe('Authentication is required.');
  });

  it('falls back to a generic message when error is not a string', () => {
    expect(createApiError(400, { error: 42 }).message).toBe('The request was rejected.');
  });

  it('falls back to a generic message when the body is not an object', () => {
    expect(createApiError(500, 'plain text').message).toBe('The server encountered an error.');
  });

  it('keeps the raw body for diagnostics', () => {
    const body = { error: 'boom', errorId: 'x' };
    expect(createApiError(500, body).body).toBe(body);
  });

  it('preserves the status code', () => {
    expect(createApiError(503, null).status).toBe(503);
  });
});

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-11-25T10:00:00Z');

  it('reads a number of seconds', () => {
    expect(parseRetryAfter('30', now)).toBe(30);
  });

  it('reads an HTTP date as the seconds left, rounded up', () => {
    expect(parseRetryAfter('Wed, 25 Nov 2026 10:01:30 GMT', now)).toBe(90);
  });

  it('never returns a negative delay for a past date', () => {
    expect(parseRetryAfter('Wed, 25 Nov 2026 09:00:00 GMT', now)).toBe(0);
  });

  it('ignores a missing or unreadable value', () => {
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter('', now)).toBeUndefined();
    expect(parseRetryAfter('soon', now)).toBeUndefined();
    expect(parseRetryAfter('-5', now)).toBeUndefined();
  });
});

describe('createApiError with Retry-After', () => {
  it('keeps the delay of a 429', () => {
    const error = createApiError(429, null, 12);
    expect(error.kind).toBe('rate-limited');
    expect(error.retryAfterSeconds).toBe(12);
  });

  it('omits the delay when the header is absent', () => {
    expect(createApiError(429, null)).not.toHaveProperty('retryAfterSeconds');
  });
});
