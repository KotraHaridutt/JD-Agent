export const MOCK_OPENAI_401_ERROR = {
  status: 401,
  code: 'OPENAI_API_ERROR',
  message: 'OpenAI API error: 401 Unauthorized',
  details: '{"error": {"message": "Incorrect API key provided: sk-proj-...1234", "type": "invalid_request_error"}}'
};

export const MOCK_OPENAI_429_ERROR = {
  status: 429,
  code: 'OPENAI_API_ERROR',
  message: 'OpenAI API error: 429 Too Many Requests',
  details: '{"error": {"message": "You exceeded your current quota", "type": "insufficient_quota"}}'
};

export const MOCK_OPENAI_PARSE_ERROR = {
  status: 502,
  code: 'OPENAI_PARSE_ERROR',
  message: 'Unable to parse JSON response',
  details: 'SyntaxError: Unexpected token < in JSON at position 0 in file C:/server/api/analyze.ts:150'
};

export const MOCK_INTERNAL_STACK_ERROR = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'TypeError: Cannot read property "foo" of undefined at processRequest (C:\\app\\server\\handler.ts:42:15)',
  stack: 'TypeError: Cannot read property "foo" of undefined\n    at processRequest (C:\\app\\server\\handler.ts:42:15)\n    at Layer.handle [as handle_request]'
};
