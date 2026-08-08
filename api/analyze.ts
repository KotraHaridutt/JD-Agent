type AnalyzeRequest = {
  system?: string;
  message?: string;
  useWebSearch?: boolean;
};

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = (await readBody(req)) as AnalyzeRequest;
    const result = await analyzeRequest(body);
    sendJson(res, 200, result);
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    sendJson(res, status, {
      error: error?.message ?? 'Unexpected server error',
      details: error?.details
    });
  }
}

export async function analyzeRequest(body: AnalyzeRequest): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error: any = new Error('OPENAI_API_KEY is not configured on the server');
    error.status = 500;
    throw error;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  if (!body.system || !body.message) {
    const error: any = new Error('Missing system or message');
    error.status = 400;
    throw error;
  }

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
    const error: any = new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.details = errorText;
    throw error;
  }

  const data = await response.json();
  const rawText = extractResponseText(data);

  if (!rawText) {
    const error: any = new Error('No text returned in the OpenAI API response');
    error.status = 502;
    throw error;
  }

  const cleanText = rawText.replace(/```json|```/g, '').trim();

  try {
    return parseJsonResponse(cleanText);
  } catch (error: any) {
    const parseError: any = new Error('Unable to parse JSON response');
    parseError.status = 502;
    parseError.details = error?.message ?? 'Unknown parsing error';
    throw parseError;
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

async function readBody(req: any): Promise<AnalyzeRequest> {
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as AnalyzeRequest;
  }

  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8')) as AnalyzeRequest;
  }

  if (req.body && typeof req.body === 'object') {
    return req.body as AnalyzeRequest;
  }

  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  return JSON.parse(raw) as AnalyzeRequest;
}

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}