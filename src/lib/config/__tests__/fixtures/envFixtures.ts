export const validEnvWithModel = {
  OPENAI_API_KEY: 'sk-test-mock-api-key-12345',
  OPENAI_MODEL: 'gpt-4o'
};

export const validEnvWithoutModel = {
  OPENAI_API_KEY: 'sk-test-mock-api-key-12345'
};

export const invalidEnvMissingKey = {
  OPENAI_MODEL: 'gpt-4o-mini'
};

export const invalidEnvEmptyKey = {
  OPENAI_API_KEY: '',
  OPENAI_MODEL: 'gpt-4o-mini'
};

export const invalidEnvWhitespaceKey = {
  OPENAI_API_KEY: '   ',
  OPENAI_MODEL: 'gpt-4o-mini'
};
