export interface ServerConfig {
  apiKey: string;
  model: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export function getServerConfig(
  envOverrides?: Record<string, string | undefined>
): ServerConfig {
  const getVal = (key: string): string | undefined => {
    if (envOverrides && Object.prototype.hasOwnProperty.call(envOverrides, key)) {
      const overrideVal = envOverrides[key];
      if (overrideVal !== undefined && overrideVal !== '') {
        return overrideVal;
      }
    }
    return process.env[key];
  };

  const rawApiKey = getVal('OPENAI_API_KEY');
  const apiKey = rawApiKey ? rawApiKey.trim() : '';

  if (!apiKey) {
    throw new ConfigError(
      'OPENAI_API_KEY environment variable is required but not set. Ensure it is configured in your .env file or Vercel environment settings.'
    );
  }

  const rawModel = getVal('OPENAI_MODEL');
  const model = rawModel && rawModel.trim() ? rawModel.trim() : 'gpt-4o-mini';

  return Object.freeze({
    apiKey,
    model
  });
}
