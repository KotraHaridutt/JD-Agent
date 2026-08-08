import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import analyzeHandler from './api/analyze'

function devAnalyzePlugin(mode: string): Plugin {
  return {
    name: 'dev-analyze-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      process.env.OPENAI_API_KEY = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
      process.env.OPENAI_MODEL = env.OPENAI_MODEL ?? process.env.OPENAI_MODEL;

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/analyze' || req.method !== 'POST') {
          next();
          return;
        }

        try {
          const body = await readRequestBody(req);
          const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
            method: 'POST',
            headers: req.headers as HeadersInit,
            body
          });

          const response = await analyzeHandler(request);
          res.statusCode = response.status;

          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (error) {
          next(error as Error);
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
