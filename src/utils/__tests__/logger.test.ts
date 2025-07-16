import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLUGIN_NAME } from '../constant';
import {
  createLogger,
  defaultLogger,
  LogConfig,
  Logger,
  logger,
  LogLevel,
  resetDefaultLogger,
  setLogLevel,
} from '../logger';

// Mock console methods
const consoleSpy = {
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('Logger 测试', () => {
  beforeEach(() => {
    // 重置所有 console spy
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
    // 重置环境变量
    delete process.env.NODE_ENV;
    delete process.env.NO_COLOR;
    delete process.env.CI;
  });

  afterEach(() => {
    // 确保重置默认 logger 配置
    resetDefaultLogger();
  });

  describe('Logger 类构造函数和配置', () => {
    it('应该使用默认配置创建 Logger 实例', () => {
      const logger = new Logger();

      logger.info('测试消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain(`[${PLUGIN_NAME}]`);
      expect(callArgs[0]).toContain('[INFO]');
      expect(callArgs[0]).toContain('测试消息');
    });

    it('应该接受自定义配置', () => {
      const customConfig: LogConfig = {
        level: LogLevel.DEBUG,
        prefix: '[自定义前缀]',
        showTimestamp: true,
        colors: false,
        emojis: false,
      };

      const logger = new Logger(customConfig);

      logger.debug('调试消息');

      const callArgs = consoleSpy.debug.mock.calls[0];
      expect(callArgs[0]).toContain('[自定义前缀]');
      expect(callArgs[0]).toContain('[DEBUG]');
      expect(callArgs[0]).toContain('调试消息');
    });

    it('应该支持配置更新', () => {
      const logger = new Logger();

      // 更新配置
      logger.updateConfig({ level: LogLevel.ERROR });

      // INFO 级别应该被过滤
      logger.info('信息消息');
      expect(consoleSpy.info).not.toHaveBeenCalled();

      // ERROR 级别应该正常输出
      logger.error('错误消息');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('日志级别过滤', () => {
    it('应该根据设置的级别过滤日志', () => {
      const logger = new Logger({ level: LogLevel.WARN });

      logger.debug('调试消息');
      logger.info('信息消息');
      logger.warn('警告消息');
      logger.error('错误消息');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('应该正确处理 DEBUG 级别', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });

      logger.debug('调试消息');
      logger.info('信息消息');
      logger.warn('警告消息');
      logger.error('错误消息');

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('消息格式化', () => {
    it('应该包含正确的前缀和级别标签', () => {
      const logger = new Logger({ colors: false, emojis: false });

      logger.info('测试消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain(`[${PLUGIN_NAME}]`);
      expect(callArgs[0]).toContain('[INFO]');
      expect(callArgs[0]).toContain('测试消息');
    });

    it('应该在启用时显示时间戳', () => {
      const logger = new Logger({
        showTimestamp: true,
        colors: false,
        emojis: false,
      });

      logger.info('测试消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(callArgs[0]).toContain('测试消息');
    });

    it('应该在启用时显示表情符号', () => {
      const logger = new Logger({
        colors: false,
        emojis: true,
        level: LogLevel.DEBUG,
      });

      logger.debug('调试消息');
      logger.info('信息消息');
      logger.warn('警告消息');
      logger.error('错误消息');

      expect(consoleSpy.debug.mock.calls[0][0]).toContain('🔍');
      expect(consoleSpy.info.mock.calls[0][0]).toContain('ℹ️');
      expect(consoleSpy.warn.mock.calls[0][0]).toContain('⚠️');
      expect(consoleSpy.error.mock.calls[0][0]).toContain('❌');
    });

    it('应该支持多个参数', () => {
      const logger = new Logger();
      const obj = { key: 'value' };
      const arr = [1, 2, 3];

      logger.info('消息', obj, arr);

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain('消息');
      expect(callArgs[1]).toEqual(obj);
      expect(callArgs[2]).toEqual(arr);
    });
  });

  describe('颜色功能', () => {
    it('应该在测试环境中禁用颜色', () => {
      process.env.NODE_ENV = 'test';

      const logger = new Logger({ colors: true });
      logger.info('测试消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      // 检查是否不包含 ANSI 转义序列
      expect(callArgs[0]).not.toContain('\x1b[');
      expect(callArgs[0]).toContain('测试消息');
    });

    it('应该支持颜色开关配置', () => {
      const logger = new Logger({ colors: false });

      logger.info('测试消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).not.toContain('\x1b[');
      expect(callArgs[0]).toContain('测试消息');
    });
  });

  describe('特殊日志方法', () => {
    it('success() 应该使用绿色和 ✅ 表情', () => {
      const logger = new Logger({ colors: false, emojis: true });

      logger.success('成功消息');

      const callArgs = consoleSpy.log.mock.calls[0];
      expect(callArgs[0]).toContain('✅');
      expect(callArgs[0]).toContain('[SUCCESS]');
      expect(callArgs[0]).toContain('成功消息');
    });

    it('success() 应该遵循 INFO 级别过滤', () => {
      const logger = new Logger({ level: LogLevel.WARN });

      logger.success('成功消息');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('子 Logger', () => {
    it('应该创建带有扩展前缀的子 Logger', () => {
      const parentLogger = new Logger({ prefix: '[父级]' });
      const childLogger = parentLogger.child('子级');

      childLogger.info('子级消息');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain('[父级]:子级');
      expect(callArgs[0]).toContain('[INFO]');
      expect(callArgs[0]).toContain('子级消息');
    });

    it('应该继承父 Logger 的配置', () => {
      const parentLogger = new Logger({
        level: LogLevel.ERROR,
        colors: false,
        emojis: false,
      });
      const childLogger = parentLogger.child('子级');

      // INFO 级别应该被过滤
      childLogger.info('信息消息');
      expect(consoleSpy.info).not.toHaveBeenCalled();

      // ERROR 级别应该正常输出
      childLogger.error('错误消息');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('工厂函数和导出', () => {
    it('createLogger() 应该创建新的 Logger 实例', () => {
      const logger1 = createLogger();
      const logger2 = createLogger({ prefix: '[测试]' });

      expect(logger1).toBeInstanceOf(Logger);
      expect(logger2).toBeInstanceOf(Logger);
      expect(logger1).not.toBe(logger2);
    });

    it('defaultLogger 应该是 Logger 实例', () => {
      expect(defaultLogger).toBeInstanceOf(Logger);
    });

    it('logger 应该是 defaultLogger 的引用', () => {
      expect(logger).toBe(defaultLogger);
    });

    it('setLogLevel() 应该更新默认 logger 的级别', () => {
      setLogLevel(LogLevel.ERROR);

      logger.info('信息消息');
      logger.error('错误消息');

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空消息', () => {
      const logger = new Logger();

      logger.info('');

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO]');
      expect(callArgs[0]).toContain('');
    });

    it('应该处理包含特殊字符的消息', () => {
      const logger = new Logger();
      const specialMessage = '包含 \n 换行符和 \t 制表符的消息';

      logger.info(specialMessage);

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO]');
      expect(callArgs[0]).toContain(specialMessage);
    });

    it('应该处理 undefined 和 null 参数', () => {
      const logger = new Logger();

      logger.info('消息', undefined, null);

      const callArgs = consoleSpy.info.mock.calls[0];
      expect(callArgs[0]).toContain('消息');
      expect(callArgs[1]).toBeUndefined();
      expect(callArgs[2]).toBeNull();
    });
  });

  describe('性能测试', () => {
    it('应该在日志被过滤时避免不必要的处理', () => {
      const logger = new Logger({ level: LogLevel.ERROR });

      // 这些调用应该被快速过滤，不进行消息格式化
      logger.debug('调试消息');
      logger.info('信息消息');
      logger.warn('警告消息');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe('LogLevel 枚举', () => {
    it('应该有正确的数值', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });

    it('应该有正确的级别层次', () => {
      expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
      expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
      expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
    });
  });
});
