import type { Plugin } from 'vite';

export interface FormatJSOptions {
  // 后续会添加具体配置选项
  include?: string[];
  exclude?: string[];
}

export function formatjs(options: FormatJSOptions = {}): Plugin {
  return {
    name: 'vite-plugin-formatjs',
    configResolved() {
      // 插件初始化逻辑
      // TODO: 实现 FormatJS 功能
      void options; // 暂时使用 options 避免未使用变量警告
    },
  };
}

export default formatjs;
