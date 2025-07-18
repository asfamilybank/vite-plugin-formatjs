import type { Plugin, ResolvedConfig } from 'vite';

import {
  compileMessageFile,
  compileMessages,
  isMessageFile,
} from ':core/compile';
import { resolveConfig, validateConfig } from ':core/config';
import { extractMessages, isFileInInclude } from ':core/extract';
import type { UserFormatJSConfig } from ':core/types';
import { PLUGIN_NAME } from ':utils/constant';
import { logger, LogLevel } from ':utils/logger';

/**
 * FormatJS Vite 插件
 */
export function formatjs(options: UserFormatJSConfig = {}): Plugin {
  const config = resolveConfig(options);
  let _resolvedConfig: ResolvedConfig;

  // Extract 防抖状态
  let extractDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let extractionInProgress = false;
  const pendingExtractFiles = new Set<string>();

  /**
   * 防抖执行提取
   */
  async function debouncedExtract() {
    // 如果正在提取，直接返回
    if (extractionInProgress) {
      return;
    }

    extractionInProgress = true;

    try {
      const duration = await extractMessages(config.extract);

      logger.debug('防抖提取消息完成', {
        pendingFiles: Array.from(pendingExtractFiles),
        duration,
      });
    } catch (error) {
      logger.error('防抖提取消息失败', { error });
    } finally {
      extractionInProgress = false;
      pendingExtractFiles.clear();
    }
  }

  /**
   * 编译消息文件（直接编译，无需防抖）
   */
  async function compileMessageFileDirectly(file: string): Promise<number> {
    try {
      const duration = await compileMessageFile(file, config.compile);

      logger.debug('消息文件编译完成', {
        file,
        duration,
      });
      logger.success(`消息文件编译完成，耗时 ${duration}ms`);
      return duration;
    } catch (error) {
      logger.error('编译消息文件失败', { file, error });
      return 0;
    }
  }

  return {
    name: PLUGIN_NAME,

    configResolved(resolvedConfig) {
      _resolvedConfig = resolvedConfig;

      // 验证配置
      try {
        validateConfig(config);
        if (config.debug) logger.updateConfig({ level: LogLevel.DEBUG });
      } catch (error) {
        logger.error('插件配置验证失败', { error });
        throw error;
      }
    },

    async buildStart() {
      // 构建开始时提取消息（如果启用）
      if (config.build.extractOnBuild || _resolvedConfig.command === 'serve') {
        try {
          const duration = await extractMessages(config.extract);
          logger.success(`构建开始时提取消息完成，耗时 ${duration}ms`);
        } catch (error) {
          logger.error('构建开始时提取消息失败', { error });
        }
      }

      // 构建开始时编译消息（如果启用）
      if (config.build.compileOnBuild || _resolvedConfig.command === 'serve') {
        try {
          const duration = await compileMessages(config.compile);
          logger.success(`构建开始时编译消息完成，耗时 ${duration}ms`);
        } catch (error) {
          logger.error('构建开始时编译消息失败', { error });
        }
      }
    },

    async handleHotUpdate(ctx) {
      const { file } = ctx;

      // 检查是否是消息文件（需要编译的翻译文件）
      if (isMessageFile(file, config)) {
        logger.debug('检测到消息文件变化', { file });

        // 直接编译，无需防抖
        await compileMessageFileDirectly(file);

        // 使用 vite 默认 HMR 行为
        return;
      }

      // 检查文件是否匹配 include 模式（用于 extract）
      if (
        isFileInInclude(
          file,
          config.extract.include,
          config.extract.ignore ?? []
        )
      ) {
        logger.debug('检测到源代码文件变化', { file });

        // 将文件添加到待提取队列
        pendingExtractFiles.add(file);

        // 清除之前的提取防抖计时器
        if (extractDebounceTimer) {
          clearTimeout(extractDebounceTimer);
        }

        // 设置新的提取防抖计时器
        extractDebounceTimer = setTimeout(() => {
          void debouncedExtract();
        }, config.dev.debounceTime);

        // 使用 vite 默认 HMR 行为
        return;
      }

      // 其他文件使用默认行为
      return;
    },

    buildEnd() {
      // 构建结束时清理提取防抖计时器
      if (extractDebounceTimer) {
        clearTimeout(extractDebounceTimer);
        extractDebounceTimer = null;
      }

      pendingExtractFiles.clear();
      extractionInProgress = false;
      logger.debug('构建结束，已清理所有资源');
    },
  };
}
