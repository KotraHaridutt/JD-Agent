import { validateApiKey } from './middleware/auth';
import { checkRateLimit, extractClientIp, RateLimitResult } from './middleware/rateLimit';
import { validateAnalyzeRequest, AnalyzeRequest } from '../src/schemas';
import {
  getOrGenerateCorrelationId,
  sanitizeErrorResponse,
  logServerError
} from './lib/errorHandler';
import { AppError } from './lib/AppError';

export default async function handler(req: any, res: any): Promise<void> {
  const correlationId = getOrGenerateCorrelationId(req);
  setResponseHeader(res, 'X-Correlation-ID', correlationId);

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      correlationId
    });
    return;
  }

  const serverApiKey = process.env.API_KEY;
  if (!serverApiKey) {
    const errObj = new AppError('API_KEY is not configured on the server', 500, 'SERVER_MISCONFIGURED');
    logServerError(errObj, correlationId, { method: req.method, url: req.url });
    const sanitized = sanitizeErrorResponse(errObj, correlationId);
    sendJson(res, sanitized.status, sanitized.body);
    return;
  }

  const apiKeyHeader =
    (typeof req.headers?.['x-api-key'] === 'string' ? req.headers['x-api-key'] : null) ??
    (typeof req.headers?.['X-API-Key'] === 'string' ? req.headers['X-API-Key'] : null) ??
    (typeof req.headers?.get === 'function' ? req.headers.get('x-api-key') || req.headers.get('X-API-Key') : null);

  const authResult = validateApiKey(apiKeyHeader, serverApiKey);
  if (!authResult.valid) {
    const errObj = new AppError(authResult.error, 401, authResult.code);
    const sanitized = sanitizeErrorResponse(errObj, correlationId);
    sendJson(res, sanitized.status, sanitized.body);
    return;
  }

  const clientIp = extractClientIp(req);
  const rateLimitResult = await checkRateLimit(clientIp);
  setRateLimitHeaders(res, rateLimitResult);

  if (!rateLimitResult.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
    setResponseHeader(res, 'Retry-After', String(retryAfterSeconds));
    const errObj = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    const sanitized = sanitizeErrorResponse(errObj, correlationId);
    sendJson(res, sanitized.status, sanitized.body);
    return;
  }

  try {
    const rawBody = await readBody(req);
    const validationResult = validateAnalyzeRequest(rawBody);

    if (!validationResult.success) {
      sendJson(res, 400, {
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validationResult.errors,
        correlationId
      });
      return;
    }

    const result = await analyzeRequest(validationResult.data);
    sendJson(res, 200, { ...result, correlationId });
  } catch (error: unknown) {
    logServerError(error, correlationId, { method: req.method, url: req.url, clientIp });
    const sanitized = sanitizeErrorResponse(error, correlationId);
    sendJson(res, sanitized.status, sanitized.body);
  }
}

export async function analyzeRequest(body: AnalyzeRequest): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError('OPENAI_API_KEY is not configured on the server', 500, 'OPENAI_KEY_MISSING');
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const payload: Record<string, unknown> = {
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: body.system }]
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: body.message }]
      }
    ],
    temperature: 0.2
  };

  if (body.useWebSearch) {
    payload.tools = [{ type: 'web_search_preview' }];
  } else {
    payload.text = {
      format: {
        type: 'json_object'
      }
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(
      `OpenAI API error: ${response.status} ${response.statusText}`,
      response.status,
      'OPENAI_API_ERROR',
      errorText
    );
  }

  const data = await response.json();
  const rawText = extractResponseText(data);

  if (!rawText) {
    throw new AppError('No text returned in the OpenAI API response', 502, 'OPENAI_EMPTY_RESPONSE');
  }

  const cleanText = rawText.replace(/```json|```/g, '').trim();

  try {
    return parseJsonResponse(cleanText);
  } catch (error: unknown) {
    const detailsMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new AppError('Unable to parse JSON response', 502, 'OPENAI_PARSE_ERROR', detailsMessage);
  }
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const message = data?.output?.find((item: any) => item.type === 'message');
  if (!message) {
    return '';
  }

  const textPart = message.content?.find((part: any) => part.type === 'output_text' && typeof part.text === 'string');
  return textPart?.text ?? '';
}

function parseJsonResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error(`Unable to parse JSON response: ${text.slice(0, 500)}`);
  }
}

async function readBody(req: any): Promise<unknown> {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return req.body;
    }
  }

  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return req.body.toString('utf8');
    }
  }

  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function setResponseHeader(res: any, name: string, value: string): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader(name, value);
  } else if (res.headers && typeof res.headers.set === 'function') {
    res.headers.set(name, value);
  }
}

function setRateLimitHeaders(res: any, result: RateLimitResult): void {
  const resetEpochSeconds = Math.ceil(result.reset / 1000);
  setResponseHeader(res, 'X-RateLimit-Limit', String(result.limit));
  setResponseHeader(res, 'X-RateLimit-Remaining', String(result.remaining));
  setResponseHeader(res, 'X-RateLimit-Reset', String(resetEpochSeconds));
}

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status;
  setResponseHeader(res, 'Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}