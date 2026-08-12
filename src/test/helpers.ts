export interface MockRequestOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export function createMockRequest(options: MockRequestOptions = {}): any {
  const headers = options.headers ?? {};
  const normalizedHeaders: Record<string, string> = {};

  for (const [key, val] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = val;
  }

  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/api/analyze',
    headers: normalizedHeaders,
    body: options.body ?? {},
    [Symbol.asyncIterator]: async function* () {
      if (options.body !== undefined) {
        const str = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        yield Buffer.from(str, 'utf8');
      }
    }
  };
}

export function createMockResponse(): any {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let bodyString = '';
  let ended = false;

  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(code: number) {
      statusCode = code;
    },
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = String(value);
    },
    end(data?: unknown) {
      ended = true;
      if (data !== undefined) {
        bodyString = typeof data === 'string' ? data : JSON.stringify(data);
      }
    },
    _isEnded() {
      return ended;
    },
    _getBodyString() {
      return bodyString;
    },
    _getJsonBody() {
      return bodyString ? JSON.parse(bodyString) : null;
    }
  };
}
