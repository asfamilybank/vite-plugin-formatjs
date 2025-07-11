/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志配置接口
 */
export interface LogConfig {
  /**
   * 是否启用调试模式
   */
  debug?: boolean;

  /**
   * 日志级别
   */
  level?: LogLevel;

  /**
   * 日志前缀
   */
  prefix?: string;

  /**
   * 是否显示时间戳
   */
  showTimestamp?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<LogConfig> = {
  debug: false,
  level: LogLevel.INFO,
  prefix: '[vite-plugin-formatjs]',
  showTimestamp: false,
};

/**
 * 日志工具类
 */
export class Logger {
  private config: Required<LogConfig>;

  constructor(config: LogConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 格式化消息
   */
  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];

    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(this.config.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: any[]): string {
    const msg = this.formatMessage('debug', message);
    if (this.config.debug && this.shouldLog(LogLevel.DEBUG)) {
      console.log(msg, ...args);
    }
    return this.formatMessage('debug', message);
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]): string {
    const msg = this.formatMessage('info', message);
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(msg, ...args);
    }
    return msg;
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): string {
    const msg = this.formatMessage('warn', message);
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(msg, ...args);
    }
    return msg;
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): string {
    const msg = this.formatMessage('error', message);
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(msg, ...args);
    }
    return msg;
  }

  /**
   * 成功日志（绿色）
   */
  success(message: string, ...args: any[]): string {
    const msg = this.formatMessage('success', message);
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`\x1b[32m${msg}\x1b[0m`, ...args);
    }
    return msg;
  }

  /**
   * 性能日志
   */
  perf(name: string, startTime: number, ...args: any[]): string {
    if (this.config.debug && this.shouldLog(LogLevel.DEBUG)) {
      const duration = Date.now() - startTime;
      const msg = this.formatMessage('perf', `${name} 耗时 ${duration}ms`);
      console.log(msg, ...args);
      return msg;
    }
    return '';
  }

  /**
   * 创建子logger
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix}:${prefix}`,
    });
  }
}

/**
 * 创建默认logger实例
 */
export const createLogger = (config: LogConfig = {}): Logger => {
  return new Logger(config);
};

/**
 * 默认logger实例
 */
export const defaultLogger = createLogger();

/**
 * 便捷的日志函数
 */
export const logger = {
  debug: (message: string, ...args: any[]) =>
    defaultLogger.debug(message, ...args),
  info: (message: string, ...args: any[]) =>
    defaultLogger.info(message, ...args),
  warn: (message: string, ...args: any[]) =>
    defaultLogger.warn(message, ...args),
  error: (message: string, ...args: any[]) =>
    defaultLogger.error(message, ...args),
  success: (message: string, ...args: any[]) =>
    defaultLogger.success(message, ...args),
  perf: (name: string, startTime: number, ...args: any[]) =>
    defaultLogger.perf(name, startTime, ...args),
};

/**
 * 启用调试模式
 */
export const enableDebug = (): void => {
  defaultLogger.updateConfig({ debug: true });
};

/**
 * 禁用调试模式
 */
export const disableDebug = (): void => {
  defaultLogger.updateConfig({ debug: false });
};

/**
 * 设置日志级别
 */
export const setLogLevel = (level: LogLevel): void => {
  defaultLogger.updateConfig({ level });
};

/**
 * 性能计时器
 */
export const createTimer = (name: string) => {
  const startTime = Date.now();
  return {
    end: (...args: any[]) => {
      defaultLogger.perf(name, startTime, ...args);
    },
    get duration() {
      return Date.now() - startTime;
    },
  };
};
