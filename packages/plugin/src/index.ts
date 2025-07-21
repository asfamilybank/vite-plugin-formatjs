// 主要插件导出
export { formatjs as VitePluginFormatJS } from './plugin';

// 核心功能导出
export { resolveConfig } from './core/config';

// 类型定义导出
export type { VitePluginFormatJSOptions } from './core/types';

// 默认导出
export { formatjs as default } from './plugin';
