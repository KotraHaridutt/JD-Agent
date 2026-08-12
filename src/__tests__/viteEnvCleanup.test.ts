import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('vite-env.d.ts cleanup', () => {
  const envFilePath = path.resolve(__dirname, '../vite-env.d.ts');

  it('exists at src/vite-env.d.ts', () => {
    expect(fs.existsSync(envFilePath)).toBe(true);
  });

  it('contains Vite client type reference', () => {
    const content = fs.readFileSync(envFilePath, 'utf8');
    expect(content).toContain('/// <reference types="vite/client" />');
  });

  it('does not contain stale VITE_GEMINI, VITE_OPENAI, or ImportMetaEnv declarations', () => {
    const content = fs.readFileSync(envFilePath, 'utf8');
    expect(content).not.toContain('VITE_GEMINI');
    expect(content).not.toContain('VITE_OPENAI');
    expect(content).not.toContain('ImportMetaEnv');
  });
});
