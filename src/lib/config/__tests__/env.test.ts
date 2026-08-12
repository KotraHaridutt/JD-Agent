import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getServerConfig, ConfigError } from '../env';
import {
  validEnvWithModel,
  validEnvWithoutModel,
  invalidEnvMissingKey,
  invalidEnvEmptyKey,
  invalidEnvWhitespaceKey
} from './fixtures/envFixtures';

describe('getServerConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid ServerConfig when all env vars are provided', () => {
    const config = getServerConfig(validEnvWithModel);
    expect(config.apiKey).toBe('sk-test-mock-api-key-12345');
    expect(config.model).toBe('gpt-4o');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('applies default model "gpt-4o-mini" when OPENAI_MODEL is absent', () => {
    const config = getServerConfig(validEnvWithoutModel);
    expect(config.apiKey).toBe('sk-test-mock-api-key-12345');
    expect(config.model).toBe('gpt-4o-mini');
  });

  it('throws ConfigError when OPENAI_API_KEY is missing', () => {
    expect(() => getServerConfig(invalidEnvMissingKey)).toThrow(ConfigError);
    expect(() => getServerConfig(invalidEnvMissingKey)).toThrow(/OPENAI_API_KEY environment variable is required/);
  });

  it('throws ConfigError when OPENAI_API_KEY is empty string', () => {
    expect(() => getServerConfig(invalidEnvEmptyKey)).toThrow(ConfigError);
  });

  it('throws ConfigError when OPENAI_API_KEY contains only whitespace', () => {
    expect(() => getServerConfig(invalidEnvWhitespaceKey)).toThrow(ConfigError);
  });

  it('reads from process.env when envOverrides is not provided', () => {
    process.env.OPENAI_API_KEY = 'sk-from-process-env';
    process.env.OPENAI_MODEL = 'gpt-4';

    const config = getServerConfig();
    expect(config.apiKey).toBe('sk-from-process-env');
    expect(config.model).toBe('gpt-4');
  });

  it('falls back to process.env if envOverrides contains undefined for key', () => {
    process.env.OPENAI_API_KEY = 'sk-fallback-env';
    const config = getServerConfig({ OPENAI_API_KEY: undefined });
    expect(config.apiKey).toBe('sk-fallback-env');
  });
});
