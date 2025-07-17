import type { CompileOpts, ExtractCLIOptions } from '@formatjs/cli-lib';

import type { FormatJSPluginOptions } from './types';

/**
 * 默认配置常量
 */
const DEFAULT_CONFIG: Readonly<FormatJSPluginOptions> = {
  // 插件特有选项
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  ignore: ['node_modules', 'dist'],
  outFile: 'src/lang/en.json',
  debug: false,
  hotReload: true,
  extractOnBuild: false,

  // Extract 相关配置
  idInterpolationPattern: '[sha512:contenthash:base64:6]',
  throws: true,

  // Compile 相关配置
  compileAst: true,
  compileFolder: 'src/lang',
  outFolder: 'src/compiled-lang',
  compileOnBuild: true,
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

/**
 * 获取 Extract 专用配置
 * @param config 完整配置对象
 * @returns Extract 相关配置
 */
export function getExtractConfig(
  config: FormatJSPluginOptions
): ExtractCLIOptions {
  const {
    // 插件特有选项，需要排除
    include: _include,
    debug: _debug,
    hotReload: _hotReload,
    extractOnBuild: _extractOnBuild,
    compileFolder: _compileFolder,
    compileOnBuild: _compileOnBuild,
    compileAst: _compileAst,
    skipErrors: _skipErrors,
    compileFormat: _compileFormat,
    pseudoLocale: _pseudoLocale,
    ignoreTag: _ignoreTag,
    outFolder: _outFolder,

    // 重命名 extractFormat 为 format
    extractFormat,
    // 重命名 extractAst 为 ast
    extractAst,

    ...extractConfig
  } = config;

  return {
    ...extractConfig,
    format: extractFormat,
    ast: extractAst,
  };
}

/**
 * 获取 Compile 专用配置
 * @param config 完整配置对象
 * @returns Compile 相关配置
 */
export function getCompileConfig(config: FormatJSPluginOptions): CompileOpts {
  const {
    compileAst: ast,
    skipErrors,
    compileFormat: format,
    pseudoLocale,
    ignoreTag,
  } = config;

  return {
    ast,
    skipErrors,
    format,
    pseudoLocale,
    ignoreTag,
  };
}
