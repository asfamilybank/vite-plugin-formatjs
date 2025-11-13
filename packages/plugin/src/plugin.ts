import type { Plugin } from 'vite';

import {
  compileMessageFile,
  compileMessages,
  isMessageFile,
  resolveConfig,
  validateConfig,
  extractMessages,
  isFileInInclude,
  type PartialConfig,
  type VitePluginFormatJSOptions,
  extractMessage,
  isCompiledMessageFile,
} from ':core';
import { PLUGIN_NAME, Timer, logger, setDebug } from ':utils';

/**
 * FormatJS Vite 插件
 */
export function formatjs(
  options: PartialConfig<VitePluginFormatJSOptions> = {}
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inProgress = false;
  const pendingExtract = new Set<string>();

  const config = resolveConfig(options);
  validateConfig(config);

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    inProgress = false;
    pendingExtract.clear();
  }

  async function debouncedExtract() {
    if (inProgress) return;
    inProgress = true;
    try {
      const timer = new Timer('Processing messages');
      logger.progress('Processing messages...');
      const extractFiles = [...pendingExtract];
      logger.debug('Extracting messages:', extractFiles);
      await extractMessage(extractFiles, config.extract);
      await compileMessageFile(config.extract.outFile!, config.compile);
      timer.end();
      logger.success(`Processed messages in ${timer.duration}ms`);
    } catch (error) {
      logger.error('Processing messages failed');
      logger.debug('', error);
    } finally {
      inProgress = false;
      pendingExtract.clear();
    }
  }

  async function compile(file: string) {
    try {
      logger.debug('Compiling message file: ', file);
    const timer = new Timer('Compiling message file');
    logger.progress('Compiling message file...');
    await compileMessageFile(file, config.compile);
    timer.end();
    logger.success(`Compiled message file in ${timer.duration}ms`);
    } catch (error) {
      logger.error('Compiling message file failed');
      logger.debug('', error);
    }
  }

  return {
    name: PLUGIN_NAME,

    configureServer(server) {
      server.watcher.on('add', file => {
        logger.debug('Add message file: ', file);
        if (
          isMessageFile(file, config.compile.inputDir, config.extract.outFile!)
        ) {
            void compile(file);
        }
      });
    },
    configResolved() {
      setDebug(config.debug);
    },

    async buildStart() {
      // 构建开始时提取消息（如果启用）
      if (config.extractOnBuild) {
        const timer = new Timer('Processing messages on build');
        logger.progress('Processing messages on build...');
        try {
          await extractMessages(config.extract);
          await compileMessages(config.compile);
          logger.success(`Processed messages in ${timer.duration}ms`);
        } catch (error) {
          logger.error('Processing messages failed');
          logger.debug('', error);
        }
      }
    },

    async handleHotUpdate(ctx) {
      const { file, read, server } = ctx;
      logger.debug('Handling hot update: ', file);

      // 检查是否是消息文件（需要编译的翻译文件）
      if (
        isMessageFile(file, config.compile.inputDir, config.extract.outFile!)
      ) {
        try {
          await compile(file);
        } catch (error) {
          logger.error('Compiling message file failed');
          logger.debug('', error);
        } 
        return;
      }

      // 检查文件是否匹配 include 模式（用于 extract）
      if (
        config.autoExtract &&
        isFileInInclude(file, config.extract.include, config.extract.ignore!)
      ) {
        logger.debug('Extracting message: ', file);

        clear();
        pendingExtract.add(file);
        timer = setTimeout(() => {
          void debouncedExtract();
        }, config.debounceTime);
        return;
      }

      if (isCompiledMessageFile(file, config.compile.outputDir)) {
        const language = file.split('/').pop()?.split('.').shift();
        try {
          const messages = JSON.parse(await read()) as Record<string, string>;
          server.ws.send({
            type: 'custom',
            event: 'vite-plugin-formatjs:update-messages',
            data: { file, language, messages },
          });
        } catch (error) {
          logger.error('Parsing message file failed');
          logger.debug('', error);
        }

        return [];
      }
      return;
    },

    buildEnd() {
      clear();
    },
  } satisfies Plugin;
}
