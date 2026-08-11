import { describe, it, expect } from 'vitest';
import { sanitizeString, validateAnalyzeRequest } from '../../api/lib/validation';
import {
  VALID_ANALYZE_PAYLOAD,
  MISSING_SYSTEM_PAYLOAD,
  MISSING_MESSAGE_PAYLOAD,
  EMPTY_FIELDS_PAYLOAD,
  OVERSIZED_MESSAGE_PAYLOAD,
  OVERSIZED_SYSTEM_PAYLOAD,
  HTML_AND_CONTROL_CHARS_PAYLOAD
} from '../fixtures/validation.fixtures';

describe('Validation Library Unit Tests (api/lib/validation.ts)', () => {
  describe('sanitizeString', () => {
    it('should strip HTML tags from input string', () => {
      const input = '<script>alert("xss")</script>Hello <div>world</div>';
      expect(sanitizeString(input)).toBe('alert("xss")Hello world');
    });

    it('should remove control characters while preserving newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed \x00Null \x07Bell \x1FUnit';
      expect(sanitizeString(input)).toBe('Line 1\nLine 2\tTabbed Null Bell Unit');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '   \n  padded string \t  ';
      expect(sanitizeString(input)).toBe('padded string');
    });
  });

  describe('validateAnalyzeRequest Schema', () => {
    it('should validate a correct payload and pass through values', () => {
      const result = validateAnalyzeRequest(VALID_ANALYZE_PAYLOAD);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.system).toBe('You are a career counselor and job description analyzer.');
        expect(result.data.message).toBe('Analyze this job description for Senior Software Engineer.');
        expect(result.data.useWebSearch).toBe(true);
      }
    });

    it('should default useWebSearch to false when omitted', () => {
      const payload = {
        system: 'System prompt',
        message: 'Job message'
      };
      const result = validateAnalyzeRequest(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.useWebSearch).toBe(false);
      }
    });

    it('should sanitize HTML and control characters during schema parsing', () => {
      const result = validateAnalyzeRequest(HTML_AND_CONTROL_CHARS_PAYLOAD);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.system).toBe('alert("xss") System Prompt  with control char');
        expect(result.data.message).toBe('Job Description Text  with newlines \n and tabs \t preserved');
      }
    });

    it('should reject requests with missing system prompt', () => {
      const result = validateAnalyzeRequest(MISSING_SYSTEM_PAYLOAD);
      expect(result.success).toBe(false);
      if (!result.success) {
        const systemErr = result.errors.find((e) => e.field === 'system');
        expect(systemErr).toBeDefined();
        expect(systemErr?.message).toContain('required');
      }
    });

    it('should reject requests with missing message', () => {
      const result = validateAnalyzeRequest(MISSING_MESSAGE_PAYLOAD);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messageErr = result.errors.find((e) => e.field === 'message');
        expect(messageErr).toBeDefined();
        expect(messageErr?.message).toContain('required');
      }
    });

    it('should reject empty or whitespace-only fields', () => {
      const result = validateAnalyzeRequest(EMPTY_FIELDS_PAYLOAD);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should reject requests exceeding max 100,000 characters in message field', () => {
      const result = validateAnalyzeRequest(OVERSIZED_MESSAGE_PAYLOAD);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messageErr = result.errors.find((e) => e.field === 'message');
        expect(messageErr).toBeDefined();
        expect(messageErr?.message).toContain('100,000 characters');
      }
    });

    it('should reject requests exceeding max 10,000 characters in system field', () => {
      const result = validateAnalyzeRequest(OVERSIZED_SYSTEM_PAYLOAD);
      expect(result.success).toBe(false);
      if (!result.success) {
        const systemErr = result.errors.find((e) => e.field === 'system');
        expect(systemErr).toBeDefined();
        expect(systemErr?.message).toContain('10,000 characters');
      }
    });
  });
});
