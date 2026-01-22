import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ErrorType,
  handleError,
  shouldRetry,
  logError,
  createTimeoutPromise,
} from '../errorHandler';

describe('errorHandler utilities', () => {
  describe('AppError class', () => {
    it('creates custom error with type and message', () => {
      const error = new AppError('Test error', ErrorType.NETWORK);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.name).toBe('AppError');
    });

    it('stores original error when provided', () => {
      const originalError = new Error('Original');
      const appError = new AppError('Wrapped', ErrorType.API, originalError);
      expect(appError.originalError).toBe(originalError);
    });
  });

  describe('handleError', () => {
    it('returns AppError as-is if already an AppError', () => {
      const appError = new AppError('Test', ErrorType.VALIDATION);
      const result = handleError(appError);
      expect(result).toBe(appError);
    });

    it('classifies network errors correctly', () => {
      const networkError = new TypeError('fetch failed');
      const result = handleError(networkError);
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.message).toContain('koneksi internet');
    });

    it('classifies 403 forbidden errors correctly', () => {
      const forbiddenError = new Error('403 Forbidden');
      const result = handleError(forbiddenError);
      expect(result.type).toBe(ErrorType.FORBIDDEN);
      expect(result.message).toContain('API key');
    });

    it('classifies quota exceeded errors correctly', () => {
      const quotaError = new Error('QUOTA_EXCEEDED');
      const result = handleError(quotaError);
      expect(result.type).toBe(ErrorType.RATE_LIMIT);
      expect(result.message).toContain('Quota API');
    });

    it('classifies 429 rate limit errors correctly', () => {
      const rateLimitError = new Error('429 Too Many Requests');
      const result = handleError(rateLimitError);
      expect(result.type).toBe(ErrorType.RATE_LIMIT);
      expect(result.message).toContain('Terlalu banyak permintaan');
    });

    it('classifies validation errors correctly', () => {
      const validationError = new Error('Nomor surah tidak valid');
      const result = handleError(validationError);
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.message).toBe('Nomor surah tidak valid');
    });

    it('classifies API errors correctly', () => {
      const apiError = new Error('API request failed');
      const result = handleError(apiError);
      expect(result.type).toBe(ErrorType.API);
      expect(result.message).toContain('kesalahan saat mengambil data');
    });

    it('handles unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      const result = handleError(unknownError);
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('handles non-Error objects', () => {
      const result = handleError('string error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('shouldRetry', () => {
    it('returns false when max retries exceeded', () => {
      const error = new AppError('Test', ErrorType.NETWORK);
      expect(shouldRetry(error, 3, 3)).toBe(false);
      expect(shouldRetry(error, 5, 3)).toBe(false);
    });

    it('returns true for network errors within retry limit', () => {
      const error = new AppError('Test', ErrorType.NETWORK);
      expect(shouldRetry(error, 0, 3)).toBe(true);
      expect(shouldRetry(error, 2, 3)).toBe(true);
    });

    it('returns true for rate limit errors within retry limit', () => {
      const error = new AppError('Test', ErrorType.RATE_LIMIT);
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('returns false for non-retryable error types', () => {
      const validationError = new AppError('Test', ErrorType.VALIDATION);
      const apiError = new AppError('Test', ErrorType.API);
      const forbiddenError = new AppError('Test', ErrorType.FORBIDDEN);

      expect(shouldRetry(validationError, 0, 3)).toBe(false);
      expect(shouldRetry(apiError, 0, 3)).toBe(false);
      expect(shouldRetry(forbiddenError, 0, 3)).toBe(false);
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('logs error to console with proper structure', () => {
      const error = new AppError('Test error', ErrorType.NETWORK);
      const context = { userId: '123', action: 'fetch' };

      logError(error, context);

      expect(console.error).toHaveBeenCalledWith(
        '[AppError]',
        expect.objectContaining({
          type: ErrorType.NETWORK,
          message: 'Test error',
          context,
          timestamp: expect.any(String),
        })
      );
    });

    it('logs without context if not provided', () => {
      const error = new AppError('Test', ErrorType.API);
      logError(error);

      expect(console.error).toHaveBeenCalledWith(
        '[AppError]',
        expect.objectContaining({
          type: ErrorType.API,
          message: 'Test',
        })
      );
    });
  });

  describe('createTimeoutPromise', () => {
    it('rejects with network error after timeout', async () => {
      vi.useFakeTimers();

      const timeoutPromise = createTimeoutPromise(5000);

      // Fast-forward time
      vi.advanceTimersByTime(5000);

      await expect(timeoutPromise).rejects.toThrow(AppError);
      await expect(timeoutPromise).rejects.toMatchObject({
        type: ErrorType.NETWORK,
      });

      vi.useRealTimers();
    });

    it('uses correct timeout duration', async () => {
      vi.useFakeTimers();

      const timeoutPromise = createTimeoutPromise(3000);

      // Should not reject before timeout
      vi.advanceTimersByTime(2999);

      // Give a tick for promise resolution
      await Promise.resolve();

      // Should reject after timeout
      vi.advanceTimersByTime(1);

      await expect(timeoutPromise).rejects.toThrow();

      vi.useRealTimers();
    });
  });
});
