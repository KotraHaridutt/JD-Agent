import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzeRequest } from './api/analyze'
import { validateApiKey } from './api/middleware/auth'
import { checkRateLimit, extractClientIp } from './api/middleware/rateLimit'
import { validateAnalyzeRequest } from './api/lib/validation'
import {
  getOrGenerateCorrelationId,
  sanitizeErrorResponse,
  logServerError
} from './api/lib/errorHandler'

function devAnalyzePlugin(mode: string): Plugin {
  return {
    name: 'dev-analyze-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      process.env.API_KEY = env.API_KEY ?? process.env.API_KEY;
      process.env.OPENAI_API_KEY = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
      process.env.OPENAI_MODEL = env.OPENAI_MODEL ?? process.env.OPENAI_MODEL;
      process.env.SKIP_RATE_LIMIT = env.SKIP_RATE_LIMIT ?? process.env.SKIP_RATE_LIMIT;

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/analyze' || req.method !== 'POST') {
          next();
          return;
        }

        const correlationId = getOrGenerateCorrelationId(req);
        res.setHeader('X-Correlation-ID', correlationId);

        const serverApiKey = process.env.API_KEY;

        if (!serverApiKey) {
          const errObj = { status: 500, code: 'SERVER_MISCONFIGURED', message: 'API_KEY is not configured on the server' };
          logServerError(errObj, correlationId, { method: req.method, url: req.url });
          const sanitized = sanitizeErrorResponse(errObj, correlationId);
          res.statusCode = sanitized.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sanitized.body));
          return;
        }

        const apiKeyHeader =
          (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : null) ??
          (typeof req.headers['X-API-Key'] === 'string' ? req.headers['X-API-Key'] : null);

        const authResult = validateApiKey(apiKeyHeader, serverApiKey);
        if (!authResult.valid) {
          const sanitized = sanitizeErrorResponse(
            { status: 401, code: authResult.code, message: authResult.error },
            correlationId
          );
          res.statusCode = sanitized.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sanitized.body));
          return;
        }

        const clientIp = extractClientIp(req);
        const rateLimitResult = await checkRateLimit(clientIp);

        const resetEpochSeconds = Math.ceil(rateLimitResult.reset / 1000);
        res.setHeader('X-RateLimit-Limit', String(rateLimitResult.limit));
        res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

        if (!rateLimitResult.success) {
          const retryAfterSeconds = Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
          res.setHeader('Retry-After', String(retryAfterSeconds));
          const sanitized = sanitizeErrorResponse(
            { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' },
            correlationId
          );
          res.statusCode = sanitized.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sanitized.body));
          return;
        }

        try {
          const bodyRaw = await readRequestBody(req);
          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(bodyRaw);
          } catch {
            const sanitized = sanitizeErrorResponse(
              { status: 400, code: 'INVALID_JSON', message: 'Invalid JSON request body' },
              correlationId
            );
            res.statusCode = sanitized.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(sanitized.body));
            return;
          }

          const validationResult = validateAnalyzeRequest(parsedBody);
          if (!validationResult.success) {
            const sanitized = sanitizeErrorResponse(
              { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid request body' },
              correlationId
            );
            res.statusCode = sanitized.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(sanitized.body));
            return;
          }

          const result = await analyzeRequest(validationResult.data);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...result, correlationId }));
        } catch (error) {
          logServerError(error, correlationId, { method: req.method, url: req.url, clientIp });
          const sanitized = sanitizeErrorResponse(error, correlationId);
          res.statusCode = sanitized.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sanitized.body));
        }
      });
    }
  };
}

async function readRequestBody(req: NodeJS.ReadableStream): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
  }

  return chunks.join('');
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), devAnalyzePlugin(mode)],
}))
