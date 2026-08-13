import crypto from 'crypto';
import { AppError } from './AppError.js';

export interface SanitizedErrorResponseBody {
  error: string;
  code: string;
  correlationId: string;
}

export interface SanitizedErrorResult {
  status: number;
  body: SanitizedErrorResponseBody;
}

export interface RequestMetadata {
  method?: string;
  url?: string;
  clientIp?: string;
}

/**
 * Extracts an incoming X-Correlation-ID header if present and valid,
 * or generates a new UUID v4 correlation ID.
 */
export function getOrGenerateCorrelationId(req?: any): string {
  const incomingId =
    (typeof req?.headers?.['x-correlation-id'] === 'string' ? req.headers['x-correlation-id'] : null) ??
    (typeof req?.headers?.['X-Correlation-ID'] === 'string' ? req.headers['X-Correlation-ID'] : null) ??
    (typeof req?.headers?.get === 'function' ? req.headers.get('x-correlation-id') || req.headers.get('X-Correlation-ID') : null);

  if (incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0) {
    const trimmed = incomingId.trim();
    if (/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) {
      return trimmed;
    }
  }

  return crypto.randomUUID();
}

/**
 * Sanitizes any thrown error into a safe client response body containing ONLY error, code, and correlationId.
 * Never leaks stack traces, file paths, raw upstream text, or API keys.
 */
export function sanitizeErrorResponse(error: unknown, correlationId: string): SanitizedErrorResult {
  const err = error as any;
  const status = typeof err?.status === 'number' ? err.status : 500;
  const code = typeof err?.code === 'string' ? err.code : 'SERVER_ERROR';
  const isTrustedAppError = error instanceof AppError || err?.name === 'AppError';

  // Upstream OpenAI errors (4xx, 5xx, or specific OpenAI codes) - evaluated BEFORE generic status code checks
  if (
    status === 502 ||
    code.startsWith('OPENAI_') ||
    code === 'SERVICE_ERROR' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('openai'))
  ) {
    return {
      status: 502,
      body: {
        error: 'Analysis service temporarily unavailable',
        code: 'SERVICE_ERROR',
        correlationId
      }
    };
  }

  // Auth Errors (401)
  if (status === 401 || code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') {
    return {
      status: 401,
      body: {
        error: typeof err?.message === 'string' && !err.message.includes('API_KEY')
          ? err.message
          : 'Authentication failed. Valid API key required.',
        code: code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? code : 'AUTH_INVALID',
        correlationId
      }
    };
  }

  // Rate Limit Errors (429)
  if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return {
      status: 429,
      body: {
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        correlationId
      }
    };
  }

  // Input Validation Errors (400)
  if (status === 400 || code === 'VALIDATION_ERROR' || code === 'INVALID_INPUT' || code === 'INVALID_JSON') {
    return {
      status: 400,
      body: {
        error: code === 'INVALID_JSON' ? 'Invalid JSON request body' : 'Invalid request body',
        code: code === 'INVALID_JSON' ? 'INVALID_JSON' : 'VALIDATION_ERROR',
        correlationId
      }
    };
  }

  // Default / Internal Server Errors (500)
  return {
    status: isTrustedAppError && typeof err?.status === 'number' ? err.status : 500,
    body: {
      error: isTrustedAppError && typeof err?.message === 'string' && err.message.trim() ? err.message : 'Unexpected server error',
      code: isTrustedAppError && typeof err?.code === 'string' ? err.code : 'SERVER_ERROR',
      correlationId
    }
  };
}

/**
 * Logs full error details to console.error in structured JSON format.
 * Ensures resume text, PII, and API keys are never included.
 */
export function logServerError(error: unknown, correlationId: string, meta?: RequestMetadata): void {
  const err = error as any;

  const logPayload = {
    timestamp: new Date().toISOString(),
    correlationId,
    level: 'ERROR',
    error: {
      name: err?.name || 'Error',
      message: err?.message || String(error),
      code: err?.code || 'UNKNOWN_ERROR',
      status: err?.status || 500,
      stack: err?.stack || undefined
    },
    req: {
      method: meta?.method || 'POST',
      url: meta?.url || '/api/analyze',
      clientIp: meta?.clientIp || '127.0.0.1'
    }
  };

  try {
    const jsonLog = JSON.stringify(logPayload, (key, value) => {
      if (key === 'OPENAI_API_KEY' || key === 'API_KEY' || key === 'authorization') {
        return '[REDACTED]';
      }
      return value;
    });
    console.error(jsonLog);
  } catch (logErr) {
    console.error(`[CorrelationId: ${correlationId}] Error logging failed:`, err?.message || error);
  }
}
