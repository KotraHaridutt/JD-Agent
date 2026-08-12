import { vi } from 'vitest';

export interface OpenAIMockOptions {
  status?: number;
  statusText?: string;
  outputText?: string;
  outputMessageText?: string;
  rawResponse?: any;
  errorText?: string;
}

export function createOpenAIMock(options: OpenAIMockOptions = {}) {
  const status = options.status ?? 200;
  const statusText = options.statusText ?? (status === 200 ? 'OK' : 'Error');

  let bodyText: string;

  if (status >= 400) {
    bodyText = options.errorText ?? JSON.stringify({ error: { message: 'OpenAI API Error' } });
  } else if (options.rawResponse) {
    bodyText = typeof options.rawResponse === 'string' ? options.rawResponse : JSON.stringify(options.rawResponse);
  } else if (options.outputMessageText !== undefined) {
    bodyText = JSON.stringify({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: options.outputMessageText
            }
          ]
        }
      ]
    });
  } else {
    const text = options.outputText ?? JSON.stringify({ message: 'Default Mock Response' });
    bodyText = JSON.stringify({
      output_text: text
    });
  }

  const mockFetch = vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    if (urlString.includes('api.openai.com')) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText,
        text: () => Promise.resolve(bodyText),
        json: () => Promise.resolve(JSON.parse(bodyText))
      });
    }

    return Promise.reject(new Error(`Unhandled fetch request to: ${urlString}`));
  });

  return mockFetch;
}
