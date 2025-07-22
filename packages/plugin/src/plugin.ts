import path from 'node:path';

import type { Plugin, ResolvedConfig } from 'vite';

import {
  compileMessageFile,
  compileMessages,
  isMessageFile,
  resolveConfig,
  validateConfig,
  extractMessages,
  isFileInInclude,
} from ':core';
import type { UserFormatJSConfig } from ':core';
import { PLUGIN_NAME, Timer, logger, setDebug } from ':utils';

class DebounceFactory {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _inProgress = false;
  private readonly _callback: () => void | Promise<void>;
  private readonly _delay: number;

  constructor(callback: () => void | Promise<void>, delay: number) {
    this._callback = callback;
    this._delay = delay;
  }

  public start() {
    this.clear();

    this._timer = setTimeout(() => {
      void (async () => {
        if (this._inProgress) return;
        this._inProgress = true;
        try {
          await this._callback();
        } finally {
          this._inProgress = false;
        }
      })();
    }, this._delay);
  }

  public clear() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._inProgress = false;
  }
}

/**
 * FormatJS Vite 插件
 */
export function formatjs(options: UserFormatJSConfig = {}) {
  const config = resolveConfig(options);
  validateConfig(config);
  let resolvedConfig: ResolvedConfig;

  /**
   * 防抖执行提取
   */
  async function extract() {
    const timer = new Timer('Processing messages');
    logger.progress('Processing messages...');
    await extractMessages(config.extract);
    await compileMessageFile(config.extract.outFile!, config.compile);
    timer.end();
    logger.success(`Processed messages in ${timer.duration}ms`);
  }
  const extractDebounce = new DebounceFactory(extract, config.debounceTime);

  return {
    name: PLUGIN_NAME,

    configResolved(_resolvedConfig) {
      resolvedConfig = _resolvedConfig;
      setDebug(config.debug);
    },

    async buildStart() {
      // 构建开始时提取消息（如果启用）
      if (config.extractOnBuild || resolvedConfig.command === 'serve') {
        const timer = new Timer('Processing messages on build');
        logger.progress('Processing messages on build...');
        try {
          await extractMessages(config.extract);
          await compileMessages(config.compile);
          timer.end();
          logger.success(`Processed messages in ${timer.duration}ms`);
        } catch (error) {
          logger.error('Processing messages failed', { error });
        }
      }
    },

    async handleHotUpdate(ctx) {
      const { file } = ctx;

      // 检查是否是消息文件（需要编译的翻译文件）
      if (isMessageFile(file, config.compile.inputDir)) {
        const fn = path.basename(file);
        const extractOutFileName = path.basename(config.extract.outFile!);
        if (fn === extractOutFileName) {
          logger.debug('Skip compiling message file', { file });
          return;
        }

        logger.debug('Compiling message file', file);
        const timer = new Timer('Compiling message file');
        logger.progress('Compiling message file...');
        await compileMessageFile(file, config.compile);
        timer.end();
        logger.success(`Compiled message file in ${timer.duration}ms`);
        return;
      }

      // 检查文件是否匹配 include 模式（用于 extract）
      if (
        isFileInInclude(file, config.extract.include, config.extract.ignore!)
      ) {
        logger.debug('Extracting messages', file);
        extractDebounce.start();
        return;
      }

      return;
    },

    buildEnd() {
      extractDebounce.clear();
    },
  } satisfies Plugin;
}
