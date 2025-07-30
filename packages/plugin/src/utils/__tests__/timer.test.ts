import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '../logger';
import { Timer } from '../timer';

describe('Timer', () => {
  let mockLogger: Logger;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = new Logger({ colors: false, emojis: false });
    debugSpy = vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});

    // Mock Date.now for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create timer with name and start timing', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      expect(debugSpy).toHaveBeenCalledWith('test-operation started...');
      expect(timer).toBeDefined();
    });

    it('should create timer with default logger when not provided', () => {
      const timer = new Timer('test-operation');

      expect(timer).toBeDefined();
      // Should not throw error with default logger
    });

    it('should initialize with zero duration before ending', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      // Duration should be very small initially (just created)
      expect(timer.duration).toBe(0);
    });
  });

  describe('Duration calculation', () => {
    it('should calculate duration dynamically before end', () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      // Advance time by 500ms
      vi.setSystemTime(startTime + 500);
      expect(timer.duration).toBe(500);

      // Advance time by another 300ms
      vi.setSystemTime(startTime + 800);
      expect(timer.duration).toBe(800);
    });

    it('should return fixed duration after end is called', () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      // Advance time and end the timer
      vi.setSystemTime(startTime + 1500);
      timer.end();

      expect(timer.duration).toBe(1500);

      // Advance time further - duration should remain the same
      vi.setSystemTime(startTime + 2000);
      expect(timer.duration).toBe(1500);
    });
  });

  describe('End method', () => {
    it('should log completion message when ended', () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      vi.setSystemTime(startTime + 750);
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith(
        'test-operation completed in 750ms'
      );
    });

    it('should not log multiple times when end is called repeatedly', () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      vi.setSystemTime(startTime + 500);
      timer.end();
      timer.end(); // Call end again
      timer.end(); // Call end a third time

      // Should only log completion once
      expect(debugSpy).toHaveBeenCalledTimes(2); // Once for start, once for end
      expect(debugSpy).toHaveBeenNthCalledWith(
        2,
        'test-operation completed in 500ms'
      );
    });

    it('should handle zero duration correctly', () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      const timer = new Timer('test-operation', mockLogger);

      // End immediately without advancing time
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith('test-operation completed in 0ms');
      expect(timer.duration).toBe(0);
    });
  });

  describe('State management', () => {
    it('should track ended state correctly', () => {
      const timer = new Timer('test-operation', mockLogger);

      // Initially should be active (can continue timing)
      vi.advanceTimersByTime(100);
      expect(timer.duration).toBe(100);

      timer.end();

      // After end, duration should be fixed
      const endDuration = timer.duration;
      vi.advanceTimersByTime(200);
      expect(timer.duration).toBe(endDuration);
    });
  });

  describe('Integration with different loggers', () => {
    it('should work with custom logger configuration', () => {
      const customLogger = new Logger({
        level: 0, // DEBUG
        prefix: '[CUSTOM-PREFIX]',
        colors: false,
        emojis: false,
      });

      const customDebugSpy = vi
        .spyOn(customLogger, 'debug')
        .mockImplementation(() => {});

      const timer = new Timer('custom-operation', customLogger);
      timer.end();

      expect(customDebugSpy).toHaveBeenCalledWith(
        'custom-operation started...'
      );
      expect(customDebugSpy).toHaveBeenCalledWith(
        'custom-operation completed in 0ms'
      );
    });

    it('should work with logger that has higher log level', () => {
      const warnLogger = new Logger({
        level: 2, // WARN - should not show debug messages
      });

      const warnDebugSpy = vi
        .spyOn(warnLogger, 'debug')
        .mockImplementation(() => {});

      const timer = new Timer('warn-level-operation', warnLogger);
      timer.end();

      // Debug messages should be called but not actually output due to log level
      expect(warnDebugSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle typical operation timing', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const timer = new Timer('file-processing', mockLogger);

      // Simulate processing time
      vi.setSystemTime(startTime + 1250);

      // Check duration before ending
      expect(timer.duration).toBe(1250);

      timer.end();

      expect(debugSpy).toHaveBeenCalledWith('file-processing started...');
      expect(debugSpy).toHaveBeenCalledWith(
        'file-processing completed in 1250ms'
      );
    });

    it('should handle very short operations', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const timer = new Timer('quick-check', mockLogger);

      // Very short operation - 5ms
      vi.setSystemTime(startTime + 5);
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith('quick-check completed in 5ms');
    });

    it('should handle long-running operations', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const timer = new Timer('long-build', mockLogger);

      // Long operation - 30 seconds
      vi.setSystemTime(startTime + 30000);
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith('long-build completed in 30000ms');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty timer name', () => {
      const timer = new Timer('', mockLogger);
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith(' started...');
      expect(debugSpy).toHaveBeenCalledWith(' completed in 0ms');
    });

    it('should handle timer name with special characters', () => {
      const specialName = 'operation-with-spaces & symbols!@#';
      const timer = new Timer(specialName, mockLogger);
      timer.end();

      expect(debugSpy).toHaveBeenCalledWith(`${specialName} started...`);
      expect(debugSpy).toHaveBeenCalledWith(`${specialName} completed in 0ms`);
    });
  });
});
