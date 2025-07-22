import type { Logger } from './logger';
import { logger as defaultLogger } from './logger';

/**
 * 计时器类（独立于Logger）
 */
export class Timer {
  private _name: string;
  private _logger: Logger;
  private _startTime: number;
  private _duration: number;
  private _isEnded: boolean;

  constructor(name: string, logger: Logger = defaultLogger) {
    this._name = name;
    this._logger = logger;
    this._startTime = Date.now();
    this._duration = 0;
    this._isEnded = false;
    this._logger.debug(`${this._name} started...`);
  }

  /**
   * 结束计时
   */
  end(): void {
    if (this._isEnded) return;
    this._isEnded = true;
    this._duration = Date.now() - this._startTime;
    this._logger.debug(`${this._name} completed in ${this._duration}ms`);
  }

  /**
   * 获取当前耗时（动态）
   */
  get duration(): number {
    if (this._isEnded) return this._duration;
    return Date.now() - this._startTime;
  }
}
