import { describe, it, expect } from 'vitest';
import {
  isValidSurahNumber,
  isValidAyahNumber,
  validateSurahNumber,
  validateAyahNumber,
  sanitizeInput,
  isValidLanguage,
  validateSearchQuery,
  validatePageNumber,
} from '../validation';

describe('validation utilities', () => {
  describe('isValidSurahNumber', () => {
    it('returns true for valid surah numbers (1-114)', () => {
      expect(isValidSurahNumber(1)).toBe(true);
      expect(isValidSurahNumber(57)).toBe(true);
      expect(isValidSurahNumber(114)).toBe(true);
    });

    it('returns false for numbers outside valid range', () => {
      expect(isValidSurahNumber(0)).toBe(false);
      expect(isValidSurahNumber(115)).toBe(false);
      expect(isValidSurahNumber(-1)).toBe(false);
    });

    it('returns false for non-integer values', () => {
      expect(isValidSurahNumber(1.5)).toBe(false);
      expect(isValidSurahNumber(NaN)).toBe(false);
      expect(isValidSurahNumber(Infinity)).toBe(false);
    });
  });

  describe('isValidAyahNumber', () => {
    it('returns true for positive integers', () => {
      expect(isValidAyahNumber(1)).toBe(true);
      expect(isValidAyahNumber(100)).toBe(true);
      expect(isValidAyahNumber(286)).toBe(true);
    });

    it('returns false for zero and negative numbers', () => {
      expect(isValidAyahNumber(0)).toBe(false);
      expect(isValidAyahNumber(-1)).toBe(false);
    });

    it('returns false for non-integer values', () => {
      expect(isValidAyahNumber(1.5)).toBe(false);
      expect(isValidAyahNumber(NaN)).toBe(false);
    });
  });

  describe('validateSurahNumber', () => {
    it('does not throw for valid surah numbers', () => {
      expect(() => validateSurahNumber(1)).not.toThrow();
      expect(() => validateSurahNumber(114)).not.toThrow();
    });

    it('throws error for invalid surah numbers', () => {
      expect(() => validateSurahNumber(0)).toThrow('Nomor surah tidak valid');
      expect(() => validateSurahNumber(115)).toThrow('Nomor surah tidak valid');
      expect(() => validateSurahNumber(-5)).toThrow('Nomor surah tidak valid');
    });
  });

  describe('validateAyahNumber', () => {
    it('does not throw for valid ayah numbers', () => {
      expect(() => validateAyahNumber(1)).not.toThrow();
      expect(() => validateAyahNumber(286)).not.toThrow();
    });

    it('throws error for invalid ayah numbers', () => {
      expect(() => validateAyahNumber(0)).toThrow('Nomor ayat tidak valid');
      expect(() => validateAyahNumber(-1)).toThrow('Nomor ayat tidak valid');
    });
  });

  describe('sanitizeInput', () => {
    it('trims whitespace from input', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\n\ttest\n')).toBe('test');
    });

    it('removes HTML tags to prevent XSS', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello bWorld/b');
      expect(sanitizeInput('<>test<>')).toBe('test');
    });

    it('limits input length to 500 characters', () => {
      const longString = 'a'.repeat(600);
      const result = sanitizeInput(longString);
      expect(result.length).toBe(500);
    });

    it('handles empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });

  describe('isValidLanguage', () => {
    it('returns true for supported languages', () => {
      expect(isValidLanguage('id')).toBe(true);
      expect(isValidLanguage('en')).toBe(true);
    });

    it('returns false for unsupported languages', () => {
      expect(isValidLanguage('fr')).toBe(false);
      expect(isValidLanguage('es')).toBe(false);
      expect(isValidLanguage('')).toBe(false);
    });
  });

  describe('validateSearchQuery', () => {
    it('returns sanitized query for valid input', () => {
      expect(validateSearchQuery('  patience  ')).toBe('patience');
      expect(validateSearchQuery('charity and kindness')).toBe('charity and kindness');
    });

    it('throws error for queries shorter than 2 characters', () => {
      expect(() => validateSearchQuery('a')).toThrow('Query terlalu pendek');
      expect(() => validateSearchQuery('')).toThrow('Query terlalu pendek');
      expect(() => validateSearchQuery('  ')).toThrow('Query terlalu pendek');
    });

    it('sanitizes input while validating', () => {
      expect(validateSearchQuery('  <script>test</script>  ')).toBe('scripttest/script');
    });
  });

  describe('validatePageNumber', () => {
    it('does not throw for valid page numbers', () => {
      expect(() => validatePageNumber(1)).not.toThrow();
      expect(() => validatePageNumber(10)).not.toThrow();
      expect(() => validatePageNumber(100)).not.toThrow();
    });

    it('throws error for invalid page numbers', () => {
      expect(() => validatePageNumber(0)).toThrow('Nomor halaman tidak valid');
      expect(() => validatePageNumber(-1)).toThrow('Nomor halaman tidak valid');
      expect(() => validatePageNumber(1.5)).toThrow('Nomor halaman tidak valid');
    });
  });
});
