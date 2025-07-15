import type { Logger } from './logger';
import { defaultLogger } from './logger';

/**
 * 计时器类（独立于Logger）
 */
export class Timer {
  private _name: string;
  private _logger: Logger;
  private _startTime: number;
  private _duration: number;
  private _isEnded: boolean;

  constructor(name: string, logger: Logger) {
    this._name = name;
    this._logger = logger;
    this._startTime = Date.now();
    this._duration = 0;
    this._isEnded = false;
  }

  /**
   * 结束计时
   */
  end(): void {
    if (this._isEnded) return;
    this._isEnded = true;
    this._duration = Date.now() - this._startTime;
    this._logger.info(`${this._name} 耗时 ${this._duration}ms`);
  }

  /**
   * 获取当前耗时（动态）
   */
  get duration(): number {
    if (this._isEnded) return this._duration;
    return Date.now() - this._startTime;
  }
}

/**
 * 创建计时器（使用自定义logger）
 */
export const createTimerWithLogger = (name: string, logger: Logger): Timer => {
  return new Timer(name, logger);
};

/**
 * 创建计时器（默认使用defaultLogger）
 */
export const createTimer = (name: string): Timer => {
  return new Timer(name, defaultLogger);
};
