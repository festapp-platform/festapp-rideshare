/**
 * Shared AuthError class for Edge Functions.
 * Maps directly to HTTP response status codes for clean error handling.
 */
export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
