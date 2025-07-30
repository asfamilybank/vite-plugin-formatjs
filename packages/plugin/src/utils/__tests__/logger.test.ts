import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger, logger, resetDefaultLogger, setDebug } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    };

    // Reset environment variables
    delete process.env.NO_COLOR;
    delete process.env.CI;
    delete process.env.NODE_ENV;

    // Reset default logger
    resetDefaultLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger constructor and configuration', () => {
    it('should create logger with default configuration', () => {
      const testLogger = new Logger();
      testLogger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[vite-plugin-formatjs]')
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('test message')
      );
    });

    it('should create logger with custom configuration', () => {
      const testLogger = new Logger({
        prefix: '[CUSTOM]',
        showTime: false,
        colors: false,
        emojis: false,
      });

      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('[CUSTOM]');
      expect(call).toContain('[INFO]');
      expect(call).toContain('test message');
      // Should not contain time when showTime is false
      expect(call).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should update configuration', () => {
      const testLogger = new Logger({ emojis: false });
      testLogger.updateConfig({ emojis: true });

      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('ℹ️');
    });
  });

  describe('Log level filtering', () => {
    it('should respect log level - DEBUG level', () => {
      const testLogger = new Logger({ level: 0 }); // DEBUG

      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect log level - INFO level', () => {
      const testLogger = new Logger({ level: 1 }); // INFO

      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect log level - WARN level', () => {
      const testLogger = new Logger({ level: 2 }); // WARN

      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect log level - ERROR level', () => {
      const testLogger = new Logger({ level: 3 }); // ERROR

      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Color support detection', () => {
    it('should disable colors when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const testLogger = new Logger({ colors: true });

      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      // Should not contain ANSI color codes
      expect(call).not.toContain('\x1b');
    });

    it('should disable colors when CI is set', () => {
      process.env.CI = 'true';
      const testLogger = new Logger({ colors: true });

      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      // Should not contain ANSI color codes
      expect(call).not.toContain('\x1b');
    });

    it('should disable colors when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      const testLogger = new Logger({ colors: true });

      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      // Should not contain ANSI color codes
      expect(call).not.toContain('\x1b');
    });
  });

  describe('Log methods', () => {
    let testLogger: Logger;

    beforeEach(() => {
      testLogger = new Logger({
        level: 0, // DEBUG - allow all logs
        colors: false, // Disable colors for easier testing
      });
    });

    it('should log debug messages', () => {
      testLogger.debug('debug message', { extra: 'data' });

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        { extra: 'data' }
      );
    });

    it('should log info messages', () => {
      testLogger.info('info message', { extra: 'data' });

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        { extra: 'data' }
      );
    });

    it('should log warn messages', () => {
      testLogger.warn('warn message', { extra: 'data' });

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        { extra: 'data' }
      );
    });

    it('should log error messages', () => {
      testLogger.error('error message', { extra: 'data' });

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        { extra: 'data' }
      );
    });

    it('should log success messages', () => {
      testLogger.success('success message', { extra: 'data' });

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS]'),
        { extra: 'data' }
      );
    });

    it('should log progress messages', () => {
      testLogger.progress('progress message', { extra: 'data' });

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[PROGRESS]'),
        { extra: 'data' }
      );
    });
  });

  describe('Message formatting', () => {
    let testLogger: Logger;

    beforeEach(() => {
      testLogger = new Logger({
        colors: false,
        showTime: false,
        emojis: false,
      });
    });

    it('should format message without emoji when emojis disabled', () => {
      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain('ℹ️');
      expect(call).toContain('[INFO]');
    });

    it('should format message with emoji when emojis enabled', () => {
      testLogger.updateConfig({ emojis: true });
      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('ℹ️');
    });

    it('should include timestamp when showTime is enabled', () => {
      testLogger.updateConfig({ showTime: true });
      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should not include timestamp when showTime is disabled', () => {
      testLogger.updateConfig({ showTime: false });
      testLogger.info('test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('Default logger and utilities', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should reset default logger configuration', () => {
      logger.updateConfig({ level: 3 }); // ERROR
      logger.info('should not be logged');
      expect(consoleSpy.info).not.toHaveBeenCalled();

      resetDefaultLogger();
      logger.info('should be logged');
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should set debug mode', () => {
      setDebug(true);
      logger.debug('debug message');
      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);

      setDebug(false);
      consoleSpy.debug.mockClear();
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty messages', () => {
      const testLogger = new Logger();
      testLogger.info('');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined and null arguments', () => {
      const testLogger = new Logger();
      testLogger.info('test', undefined, null);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        null
      );
    });

    it('should handle complex objects as arguments', () => {
      const testLogger = new Logger();
      const complexObj = { nested: { data: [1, 2, 3] } };
      testLogger.info('test', complexObj);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.any(String),
        complexObj
      );
    });
  });
});
