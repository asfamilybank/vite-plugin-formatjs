// 主要插件导出
export { formatjs } from './plugin';

// 核心功能导出
export { resolveConfig } from ':core/config';
export { clearCache } from ':core/extract';

// 类型定义导出
export type { FormatJSPluginOptions } from ':core/types';

// 默认导出
export { formatjs as default } from './plugin';
