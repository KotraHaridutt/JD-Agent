import crypto from 'crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzeRequest } from './api/analyze'
import { validateApiKey } from './api/middleware/auth'
import { checkRateLimit, extractClientIp } from './api/middleware/rateLimit'
import { validateAnalyzeRequest } from './api/lib/validation'

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

        const correlationId = crypto.randomUUID();
        const serverApiKey = process.env.API_KEY;

        if (!serverApiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'API_KEY is not configured on the server',
            code: 'SERVER_MISCONFIGURED',
            correlationId
          }));
          return;
        }

        const apiKeyHeader =
          (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : null) ??
          (typeof req.headers['X-API-Key'] === 'string' ? req.headers['X-API-Key'] : null);

        const authResult = validateApiKey(apiKeyHeader, serverApiKey);
        if (!authResult.valid) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: authResult.error,
            code: authResult.code,
            correlationId
          }));
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
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            correlationId
          }));
          return;
        }

        try {
          const bodyRaw = await readRequestBody(req);
          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(bodyRaw);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Invalid JSON request body',
              code: 'INVALID_JSON',
              correlationId
            }));
            return;
          }

          const validationResult = validateAnalyzeRequest(parsedBody);
          if (!validationResult.success) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Invalid request body',
              code: 'VALIDATION_ERROR',
              correlationId,
              details: validationResult.errors
            }));
            return;
          }

          const result = await analyzeRequest(validationResult.data);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...result, correlationId }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
          const code = (error as any)?.code ?? 'SERVER_ERROR';
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message, code, correlationId, details: (error as any)?.details }));
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
