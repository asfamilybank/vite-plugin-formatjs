import { PLUGIN_NAME } from './constant';

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
 * ANSI 颜色代码
 */
const COLORS = {
  RESET: '\x1b[0m',
  GRAY: '\x1b[90m',
  BLUE: '\x1b[34m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
} as const;

/**
 * 日志级别颜色映射
 */
const LEVEL_COLORS = {
  [LogLevel.DEBUG]: COLORS.GRAY,
  [LogLevel.INFO]: COLORS.BLUE,
  [LogLevel.WARN]: COLORS.YELLOW,
  [LogLevel.ERROR]: COLORS.RED,
} as const;

/**
 * 日志级别表情映射
 */
const LEVEL_EMOJIS = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
} as const;

/**
 * 日志配置接口
 */
export interface LogConfig {
  level?: LogLevel;
  prefix?: string;
  showTimestamp?: boolean;
  colors?: boolean;
  emojis?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<LogConfig> = {
  level: LogLevel.INFO,
  prefix: `[${PLUGIN_NAME}]`,
  showTimestamp: false,
  colors: true,
  emojis: true,
};

/**
 * 检测是否支持颜色输出
 */
function supportsColor(): boolean {
  if (typeof process === 'undefined') return false;
  if (process.env.NODE_ENV === 'test') return false;
  if (process.env.NO_COLOR || process.env.CI) return false;
  return Boolean(process.stdout?.isTTY);
}

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
  public updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 为文本添加颜色
   */
  private colorize(text: string, color: string): string {
    if (!this.config.colors || !supportsColor()) {
      return text;
    }
    return `${color}${text}${COLORS.RESET}`;
  }

  /**
   * 格式化消息
   */
  private formatMessage(level: LogLevel, message: string): string {
    const levelName = LogLevel[level].toLowerCase();
    const emoji = this.config.emojis ? `${LEVEL_EMOJIS[level]} ` : '';
    const timestamp = this.config.showTimestamp
      ? `[${new Date().toISOString()}] `
      : '';

    // 构建级别标签
    const levelLabel = `[${levelName.toUpperCase()}]`;
    const coloredLevelLabel = this.colorize(levelLabel, LEVEL_COLORS[level]);

    // 构建前缀
    const coloredPrefix = this.colorize(
      this.config.prefix,
      LEVEL_COLORS[level]
    );

    return `${timestamp}${emoji}${coloredPrefix} ${coloredLevelLabel} ${message}`;
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
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }

  /**
   * 成功日志（绿色）
   */
  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const emoji = this.config.emojis ? '✅ ' : '';
      const timestamp = this.config.showTimestamp
        ? `[${new Date().toISOString()}] `
        : '';
      const coloredPrefix = this.colorize(this.config.prefix, COLORS.GREEN);
      const coloredLevel = this.colorize('[SUCCESS]', COLORS.GREEN);
      const formattedMessage = `${timestamp}${emoji}${coloredPrefix} ${coloredLevel} ${message}`;

      console.log(formattedMessage, ...args);
    }
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
 * 设置日志级别
 */
export const setLogLevel = (level: LogLevel): void => {
  defaultLogger.updateConfig({ level });
};

/**
 * 重置默认logger配置
 */
export const resetDefaultLogger = (): void => {
  defaultLogger.updateConfig(DEFAULT_CONFIG);
};

/**
 * 便捷的日志实例
 */
export const logger = defaultLogger;
