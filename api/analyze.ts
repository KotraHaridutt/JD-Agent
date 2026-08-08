type AnalyzeRequest = {
  system?: string;
  message?: string;
  useWebSearch?: boolean;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured on the server' }, 500);
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const body = (await request.json()) as AnalyzeRequest;

  if (!body.system || !body.message) {
    return jsonResponse({ error: 'Missing system or message' }, 400);
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
    return jsonResponse(
      {
        error: `OpenAI API error: ${response.status} ${response.statusText}`,
        details: errorText
      },
      response.status
    );
  }

  const data = await response.json();
  const rawText = extractResponseText(data);

  if (!rawText) {
    return jsonResponse({ error: 'No text returned in the OpenAI API response' }, 502);
  }

  const cleanText = rawText.replace(/```json|```/g, '').trim();

  try {
    return jsonResponse(parseJsonResponse(cleanText));
  } catch (error: any) {
    return jsonResponse(
      {
        error: 'Unable to parse JSON response',
        details: error?.message ?? 'Unknown parsing error'
      },
      502
    );
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}