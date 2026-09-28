/**
 * Structured error helper. Every API error response is
 * `{ error: { code, message, details? } }` per SPEC.md.
 * Shared by the API layer and providers.
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message = 'Resource not found') =>
  new ApiError(404, 'NOT_FOUND', message);
export const validationError = (message, details) =>
  new ApiError(400, 'VALIDATION_ERROR', message, details);
export const providerError = (message, details) =>
  new ApiError(502, 'PROVIDER_ERROR', message, details);
export const notConfirmed = (message = 'Refusing to publish without explicit confirmation') =>
  new ApiError(400, 'NOT_CONFIRMED', message);
export const unsupported = (message) =>
  new ApiError(501, 'UNSUPPORTED', message);
