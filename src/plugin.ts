import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

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

  // 防抖状态
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let extractionInProgress = false;
  const pendingFiles = new Set<string>();

  /**
   * 防抖执行提取
   */
  async function debouncedExtract(server: ViteDevServer) {
    // 如果正在提取，直接返回
    if (extractionInProgress) {
      return;
    }

    extractionInProgress = true;

    try {
      const result = await extractMessages(config);

      if (config.debug) {
        logger.debug('防抖提取消息完成', {
          pendingFiles: Array.from(pendingFiles),
          messageCount: Object.keys(result.messages).length,
          duration: result.duration,
          isChanged: result.isChanged,
        });
      }

      // 如果消息内容发生变化且启用热更新，触发页面重载
      if (result.isChanged && config.hotReload) {
        logger.info(`检测到消息变化，重新提取消息，耗时 ${result.duration}ms`);

        // 发送重载信号给客户端
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    } catch (error) {
      logger.error('防抖提取消息失败', { error });
    } finally {
      extractionInProgress = false;
      pendingFiles.clear();
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
    },

    handleHotUpdate(ctx) {
      const { file, server } = ctx;

      // 检查文件是否匹配 include 模式
      if (!isFileInInclude(file, config.include ?? [])) {
        return;
      }

      // 将文件添加到待处理队列
      pendingFiles.add(file);

      // 清除之前的防抖计时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 设置新的防抖计时器（延迟 300ms）
      debounceTimer = setTimeout(() => {
        void debouncedExtract(server);
      }, 300);

      // 返回空数组，让 Vite 跳过默认的热更新处理
      return [];
    },

    buildEnd() {
      // 构建结束时清理防抖计时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (config.debug) {
        logger.debug('构建结束');
      }
    },
  };
}
