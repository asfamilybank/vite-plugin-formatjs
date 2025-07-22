import type { CompileOpts, ExtractCLIOptions } from '@formatjs/cli-lib';

// 消息提取配置
export interface ExtractOptions extends ExtractCLIOptions {
  include: string[]; // 输入文件 minimatch（必填）
}

// 消息编译配置
export interface CompileOptions extends CompileOpts {
  inputDir: string; // 翻译文件目录
  outputDir: string; // 编译结果输出目录
}

// 主配置接口
export interface VitePluginFormatJSOptions {
  // 消息提取配置
  extract: ExtractOptions;

  // 消息编译配置
  compile: CompileOptions;

  // 调试配置
  debug: boolean; // 是否启用调试日志 (默认: false)
  autoExtract: boolean; // 是否自动提取新消息 (默认: true)
  debounceTime: number; // 防抖时间 (默认: 300ms)
  extractOnBuild: boolean; // 构建时是否提取消息 (默认: false)
}

// 用户配置类型（所有字段都可选）
export type UserFormatJSConfig = Partial<
  VitePluginFormatJSOptions & Partial<ExtractOptions> & Partial<CompileOptions>
>;
