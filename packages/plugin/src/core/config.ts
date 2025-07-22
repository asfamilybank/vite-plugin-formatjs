import type { CompileOpts, ExtractCLIOptions } from '@formatjs/cli-lib';

import type {
  CompileOptions,
  ExtractOptions,
  UserFormatJSConfig,
  VitePluginFormatJSOptions,
} from './types';

/**
 * 默认提取配置
 */
const DEFAULT_EXTRACT_CONFIG: ExtractOptions = {
  include: ['src/**/*.{ts,tsx,js,jsx,vue,hbs,gjs,gts}'],
  ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
  outFile: 'src/i18n/lang/en.json',
  idInterpolationPattern: '[sha512:contenthash:base64:6]',
  throws: true,
};

/**
 * 默认编译配置
 */
const DEFAULT_COMPILE_CONFIG: CompileOptions = {
  inputDir: 'src/i18n/lang',
  outputDir: 'src/i18n/compiled-lang',
};

/**
 * 默认调试配置
 */
const DEFAULT_DEBUG = false;
const DEFAULT_AUTO_EXTRACT = true;
const DEFAULT_DEBOUNCE_TIME = 300;
const DEFAULT_EXTRACT_ON_BUILD = false;

/**
 * 完整默认配置
 */
export const DEFAULT_CONFIG: VitePluginFormatJSOptions = {
  extract: DEFAULT_EXTRACT_CONFIG,
  compile: DEFAULT_COMPILE_CONFIG,
  debug: DEFAULT_DEBUG,
  autoExtract: DEFAULT_AUTO_EXTRACT,
  debounceTime: DEFAULT_DEBOUNCE_TIME,
  extractOnBuild: DEFAULT_EXTRACT_ON_BUILD,
};

/**
 * 解析配置 - 主要导出函数
 * @param userConfig 用户提供的配置
 * @returns 完整的配置对象
 */
export function resolveConfig(
  userConfig: UserFormatJSConfig = {}
): VitePluginFormatJSOptions {
  return {
    extract: {
      ...DEFAULT_EXTRACT_CONFIG,
      ...userConfig.extract,
    },
    compile: {
      ...DEFAULT_COMPILE_CONFIG,
      ...userConfig.compile,
    },
    debug: userConfig.debug ?? DEFAULT_DEBUG,
    autoExtract: userConfig.autoExtract ?? DEFAULT_AUTO_EXTRACT,
    debounceTime: userConfig.debounceTime ?? DEFAULT_DEBOUNCE_TIME,
    extractOnBuild: userConfig.extractOnBuild ?? DEFAULT_EXTRACT_ON_BUILD,
  };
}

/**
 * 获取 Extract 专用配置
 * @param config 完整配置对象
 * @returns Extract 相关配置
 */
export function getExtractConfig(config: ExtractOptions): ExtractCLIOptions {
  const { include: _include, ...extractConfig } = config;

  // include 字段由插件内部处理，不传递给 formatjs
  return extractConfig;
}

/**
 * 获取 Compile 专用配置
 * @param config 完整配置对象
 * @returns Compile 相关配置
 */
export function getCompileConfig(config: CompileOptions): CompileOpts {
  const {
    inputDir: _inputDir,
    outputDir: _outputDir,
    ...compileConfig
  } = config;

  return compileConfig;
}

/**
 * 验证配置是否合法
 * @param config 配置对象
 * @throws 如果配置不合法则抛出错误
 */
export function validateConfig(config: VitePluginFormatJSOptions): void {
  // 验证 extract 配置
  if (!config.extract.include || config.extract.include.length === 0) {
    throw new Error('extract.include 必须是非空数组');
  }

  if (!config.extract.outFile) {
    throw new Error('extract.outFile 不能为空');
  }

  // 验证 compile 配置
  if (!config.compile.inputDir) {
    throw new Error('compile.inputDir 不能为空');
  }

  if (!config.compile.outputDir) {
    throw new Error('compile.outputDir 不能为空');
  }

  // 验证 dev 配置
  if (config.debounceTime < 0) {
    throw new Error('dev.debounceTime 必须大于等于 0');
  }
}
