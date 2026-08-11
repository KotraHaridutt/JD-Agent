/**
 * Custom AppError class extending standard Error with status, code, and optional details properties.
 * Provides type safety for error handling across the application.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;

    // Restore prototype chain for ES5 / TypeScript custom Error subclasses
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Type guard to check if a value is an instance of AppError or has AppError properties.
   */
  static isAppError(error: unknown): error is AppError {
    if (error instanceof AppError) {
      return true;
    }

    if (error !== null && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      return (
        err.name === 'AppError' ||
        (typeof err.status === 'number' && typeof err.code === 'string' && typeof err.message === 'string')
      );
    }

    return false;
  }
}
