import type { FormatJSPluginOptions } from './types';

/**
 * 默认配置常量
 */
const DEFAULT_CONFIG: Readonly<FormatJSPluginOptions> = {
  // 插件特有选项
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  ignore: ['node_modules', 'dist'],
  outFile: 'src/locales/messages.json',
  debug: false,
  hotReload: true,
  extractOnBuild: true,

  // @formatjs/cli-lib 常用选项
  idInterpolationPattern: '[sha512:contenthash:base64:6]',
};

/**
 * 解析配置 - 主要导出函数
 * @param userConfig 用户提供的配置
 * @returns 完整的配置对象
 */
export function resolveConfig(
  userConfig: Partial<FormatJSPluginOptions> = {}
): FormatJSPluginOptions {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}
