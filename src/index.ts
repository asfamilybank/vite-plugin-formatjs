import type { HmrContext, Plugin } from 'vite';

import { createConfig } from './core/config';
import { MessageExtractor } from './core/extract';
import type { FormatJSPluginOptions } from './types';
import { defaultLogger, logger, LogLevel } from './utils/logger';

export function formatjs(options: Partial<FormatJSPluginOptions> = {}): Plugin {
  // 创建配置
  const config = createConfig(options);

  // 创建消息提取器
  let extractor: MessageExtractor;

  return {
    name: 'vite-plugin-formatjs',

    configResolved(resolvedConfig) {
      // 获取项目根路径
      const root = resolvedConfig.root;

      // 设置日志级别
      if (config.debug) {
        // debug 模式下显示所有日志
        defaultLogger.updateConfig({ level: LogLevel.DEBUG });
        logger.debug('调试模式已启用');
      } else {
        // 非 debug 模式下只显示 INFO 及以上级别的日志
        defaultLogger.updateConfig({ level: LogLevel.INFO });
      }

      // 初始化提取器
      extractor = new MessageExtractor(config, root);

      // 日志输出插件启动信息
      logger.debug(`FormatJS 插件已启动`);

      // 只在调试模式下输出详细配置信息
      logger.debug(`配置信息: ${JSON.stringify(options, null, 2)}`);
    },

    // 在构建开始时提取消息
    async buildStart() {
      if (config.extractOnBuild) {
        logger.debug('开始提取国际化消息...');
        try {
          const result = await extractor.extractAll();
          logger.success(
            `✅ 提取完成，共处理 ${result.filesProcessed} 个文件，提取 ${Object.keys(result.messages).length} 条消息，耗时 ${result.duration.toFixed(2)}ms`
          );

          if (result.errors.length > 0) {
            logger.warn(`提取过程中发生了 ${result.errors.length} 个错误`);
            result.errors.forEach((err, index) => {
              logger.error(`错误 ${index + 1}:`, err);
            });
          }
        } catch (error) {
          logger.error('提取过程中发生错误:', error);
        }
      }
    },

    // 实现热更新功能
    async handleHotUpdate(ctx: HmrContext) {
      // 如果未启用热更新，则跳过
      if (!config.hotReload) {
        return;
      }

      const { file, server } = ctx;

      try {
        // 执行增量提取
        const result = await extractor.extractIncremental([file]);

        // 只有当有消息被提取出来时才处理
        if (Object.keys(result.messages).length > 0) {
          logger.info(
            `🔄 热更新: 从 ${file} 提取了 ${Object.keys(result.messages).length} 条消息，耗时 ${result.duration.toFixed(2)}ms`
          );

          // 检测到国际化消息变化，触发页面全量刷新
          if (server?.ws) {
            logger.debug('检测到国际化消息变化，触发页面刷新');
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      } catch (error) {
        logger.error('热更新处理过程中发生错误:', error);
      }

      // 返回 undefined 以允许其他插件继续处理此更新
      return undefined;
    },
  };
}

export default formatjs;
