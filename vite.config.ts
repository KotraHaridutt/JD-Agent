import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzeRequest } from './api/analyze'

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
          const result = await analyzeRequest(JSON.parse(body));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message, details: (error as any)?.details }));
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
