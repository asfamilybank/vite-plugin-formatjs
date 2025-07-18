import type { CompileOpts, ExtractCLIOptions } from '@formatjs/cli-lib';

// 消息提取配置
export interface ExtractOptions extends ExtractCLIOptions {
  include: string[]; // 输入文件 minimatch（必填）
  // ExtractCLIOptions 包含了 outFile
}

// 消息编译配置
export interface CompileOptions extends CompileOpts {
  inputDir: string; // 翻译文件目录
  outputDir: string; // 编译结果输出目录
}

// 开发配置
export interface DevOptions {
  hotReload: boolean; // 是否启用热更新
  autoExtract: boolean; // 是否自动提取新消息
  debounceTime: number; // 防抖时间 (默认: 300ms)
}

// 构建配置
export interface BuildOptions {
  extractOnBuild: boolean; // 构建时是否提取消息 (默认: true)
  compileOnBuild: boolean; // 构建时是否编译消息 (默认: true)
}

// 主配置接口
export interface VitePluginFormatJSOptions {
  // 消息提取配置
  extract: ExtractOptions;

  // 消息编译配置
  compile: CompileOptions;

  // 开发配置
  dev: DevOptions;

  // 构建配置
  build: BuildOptions;

  // 调试配置
  debug: boolean; // 是否启用调试日志 (默认: false)
}

// 用户配置类型（所有字段都可选）
export type UserFormatJSConfig = Partial<{
  extract: Partial<ExtractOptions>;
  compile: Partial<CompileOptions>;
  dev: Partial<DevOptions>;
  build: Partial<BuildOptions>;
  debug: boolean;
}>;
