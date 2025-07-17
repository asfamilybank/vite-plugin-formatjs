import type { Plugin, ResolvedConfig } from 'vite';

import {
  compileMessageFile,
  compileMessages,
  isMessageFile,
} from ':core/compile';
import { resolveConfig } from ':core/config';
import { extractMessages, isFileInInclude } from ':core/extract';
import type { FormatJSPluginOptions } from ':core/types';
import { PLUGIN_NAME } from ':utils/constant';
import { logger } from ':utils/logger';

/**
 * FormatJS Vite 插件
 */
export function formatjs(options: Partial<FormatJSPluginOptions> = {}): Plugin {
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
      const result = await extractMessages(config);

      if (config.debug) {
        logger.debug('防抖提取消息完成', {
          pendingFiles: Array.from(pendingExtractFiles),
          messageCount: Object.keys(result.messages).length,
          duration: result.duration,
          isChanged: result.isChanged,
        });
      }
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
  async function compileMessageFileDirectly(file: string) {
    try {
      const result = await compileMessageFile(file, config);

      if (config.debug) {
        logger.debug('消息文件编译完成', {
          outFile: result.outFile,
          duration: result.duration,
        });
      }
      logger.info(
        `消息文件编译完成: ${result.outFile}，耗时 ${result.duration}ms`
      );
      return result;
    } catch (error) {
      logger.error('编译消息文件失败', { file, error });
      return { success: false, messageFile: file, outFile: '', duration: 0 };
    }
  }

  return {
    name: PLUGIN_NAME,

    configResolved(config) {
      _resolvedConfig = config;
    },

    async buildStart() {
      // 构建开始时提取消息（如果启用）
      if (config.extractOnBuild || _resolvedConfig.command === 'serve') {
        try {
          const result = await extractMessages(config);
          logger.success(`构建开始时提取消息完成，耗时 ${result.duration}ms`);
        } catch (error) {
          logger.error('构建开始时提取消息失败', { error });
        }
      }

      // 构建开始时编译消息（如果启用）
      if (config.compileOnBuild || _resolvedConfig.command === 'serve') {
        if (config.compileFolder) {
          try {
            const result = await compileMessages(config);
            if (result.compiledCount > 0) {
              logger.success(
                `构建开始时编译消息完成，处理了 ${result.compiledCount} 个文件，耗时 ${result.duration}ms`
              );
            }
          } catch (error) {
            logger.error('构建开始时编译消息失败', { error });
          }
        }
      }

      // 在 buildStart 中添加配置检查
      if (config.compileOnBuild && !config.compileFolder) {
        logger.warn('启用了 compileOnBuild 但未配置 compileFolder');
        return;
      }
    },

    async handleHotUpdate(ctx) {
      const { file } = ctx;

      // 检查是否是消息文件（extract 的产物）
      if (isMessageFile(file, config)) {
        if (config.debug) {
          logger.debug('检测到消息文件变化', { file });
        }

        // 直接编译，无需防抖
        const { outFile, success } = await compileMessageFileDirectly(file);

        // 热更新编译后的消息文件
        if (outFile) {
          if (success) {
            // 让 Vite 重新扫描编译后的文件
            const module = ctx.server.moduleGraph.getModuleById(outFile);
            return module ? [module] : [];
          }
        }
        return [];
      }

      // 检查文件是否匹配 include 模式（用于 extract）
      if (isFileInInclude(file, config.include ?? [])) {
        if (config.debug) {
          logger.debug('检测到源代码文件变化', { file });
        }

        // 将文件添加到待提取队列
        pendingExtractFiles.add(file);

        // 清除之前的提取防抖计时器
        if (extractDebounceTimer) {
          clearTimeout(extractDebounceTimer);
        }

        // 设置新的提取防抖计时器（延迟 300ms）
        extractDebounceTimer = setTimeout(() => {
          void debouncedExtract();
        }, 300);

        // 返回空数组，让 Vite 跳过默认的热更新处理
        return [];
      }

      return [];
    },

    buildEnd() {
      // 构建结束时清理提取防抖计时器
      if (extractDebounceTimer) {
        clearTimeout(extractDebounceTimer);
        extractDebounceTimer = null;
      }

      pendingExtractFiles.clear();
      extractionInProgress = false;

      if (config.debug) {
        logger.debug('构建结束，已清理所有资源');
      }
    },
  };
}
