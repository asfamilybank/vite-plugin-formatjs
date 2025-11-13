import { PLUGIN_NAME } from './constant';

/**
 * 日志级别枚举
 */
enum LogLevel {
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
  CYAN: '\x1b[36m',
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
  [LogLevel.DEBUG]: '🐞',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
} as const;

/**
 * 日志配置接口
 */
interface LogConfig {
  level?: LogLevel;
  prefix?: string;
  showTime?: boolean;
  colors?: boolean;
  emojis?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<LogConfig> = {
  level: LogLevel.INFO,
  prefix: `[${PLUGIN_NAME}]`,
  showTime: true,
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

  private formatTime(): string {
    return this.config.showTime
      ? `${this.colorize(new Date().toLocaleTimeString(), COLORS.GRAY)} `
      : '';
  }

  /**
   * 格式化消息
   */
  private formatMessage(
    label: string,
    emoji: string,
    color: string,
    message: string
  ): string {
    const _emoji = this.config.emojis ? emoji : '';
    const timestamp = this.formatTime();

    // 构建前缀
    const coloredPrefix = this.colorize(this.config.prefix, COLORS.CYAN);

    const coloredLabel = this.colorize(`[${label.toUpperCase()}]`, color);

    return `${timestamp}${coloredPrefix} ${_emoji}${coloredLabel} ${message}`;
  }

  private formatMessageWithLevel(level: LogLevel, message: string): string {
    return this.formatMessage(
      LogLevel[level].toLowerCase(),
      LEVEL_EMOJIS[level],
      LEVEL_COLORS[level],
      message
    );
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
      console.debug(
        this.formatMessageWithLevel(LogLevel.DEBUG, message),
        ...args
      );
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(
        this.formatMessageWithLevel(LogLevel.INFO, message),
        ...args
      );
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(
        this.formatMessageWithLevel(LogLevel.WARN, message),
        ...args
      );
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(
        this.formatMessageWithLevel(LogLevel.ERROR, message),
        ...args
      );
    }
  }

  /**
   * 成功日志（绿色）
   */
  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const emoji = this.config.emojis ? '✅' : '';

      console.log(
        this.formatMessage('success', emoji, COLORS.GREEN, message),
        ...args
      );
    }
  }

  progress(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(
        this.formatMessage('progress', '♻️', COLORS.BLUE, message),
        ...args
      );
    }
  }
}

/**
 * 默认logger实例
 */
const defaultLogger = new Logger();

/**
 * 重置默认logger配置
 */
export const resetDefaultLogger = (): void => {
  defaultLogger.updateConfig(DEFAULT_CONFIG);
};

export const setDebug = (debug: boolean): void => {
  defaultLogger.updateConfig({ level: debug ? LogLevel.DEBUG : LogLevel.INFO });
};

/**
 * 便捷的日志实例
 */
export const logger = defaultLogger;
