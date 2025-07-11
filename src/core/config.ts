import type { FormatJSPluginOptions } from '../types';
import { logger } from '../utils/logger';

/**
 * 默认的 FormatJS 插件配置
 */
export const DEFAULT_CONFIG: FormatJSPluginOptions = {
  include: ['src/**/*.{ts,tsx,js,jsx,vue,hbs,gts,gjs}'],
  ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
  outFile: 'src/locals/messages.json',
  debug: false,
  hotReload: true,
  incremental: true,
  extractOnBuild: true,
};

/**
 * 验证文件路径模式
 */
function validateFilePatterns(
  patterns: string[] | undefined,
  field: string
): void {
  if (!patterns) return;

  if (!Array.isArray(patterns)) {
    throw new Error(logger.error(`配置错误：${field} 必须是字符串数组`));
  }

  if (patterns.length === 0) {
    throw new Error(logger.error(`配置错误：${field} 不能为空数组`));
  }

  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.trim() === '') {
      throw new Error(
        logger.error(`配置错误：${field} 中的每个模式必须是非空字符串`)
      );
    }
  }
}

/**
 * 验证输出路径
 */
function validateOutputPath(output: string | undefined): void {
  if (!output) return;

  if (typeof output !== 'string') {
    throw new Error(logger.error('配置错误：output 必须是字符串'));
  }

  if (output.trim() === '') {
    throw new Error(logger.error('配置错误：output 不能为空字符串'));
  }
}

/**
 * 验证提取选项
 */
function validateExtractOptions(options: FormatJSPluginOptions): void {
  validateFilePatterns(options.include, 'include');
  validateFilePatterns(options.ignore, 'ignore');
  validateOutputPath(options.outFile);

  if (options.debug !== undefined && typeof options.debug !== 'boolean') {
    throw new Error(logger.error('配置错误：debug 必须是布尔值'));
  }
}

/**
 * 验证插件选项
 */
export function validateOptions(options: FormatJSPluginOptions): void {
  if (!options || typeof options !== 'object') {
    throw new Error(logger.error('配置错误：options 必须是对象'));
  }

  if (!options || typeof options !== 'object') {
    throw new Error(logger.error('配置错误：extract 选项是必需的且必须是对象'));
  }

  validateExtractOptions(options);
}

/**
 * 合并用户配置和默认配置
 */
export function mergeConfig(
  userConfig: Partial<FormatJSPluginOptions>
): FormatJSPluginOptions {
  const merged: FormatJSPluginOptions = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  // 验证合并后的配置
  validateOptions(merged);

  return merged;
}

/**
 * 创建规范化的配置
 */
export function createConfig(
  options?: Partial<FormatJSPluginOptions>
): FormatJSPluginOptions {
  if (!options) {
    return DEFAULT_CONFIG;
  }

  return mergeConfig(options);
}
