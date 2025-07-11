# vite-plugin-formatjs

一个 Vite 插件，用于自动从代码中提取 FormatJS 国际化消息，并支持热更新。

## 特性

- ✅ 基于 `@formatjs/cli-lib` 进行消息提取
- ✅ 支持 TypeScript、React、Vue 等多种框架
- ✅ 支持热更新（自动刷新）
- ✅ 自定义消息输出格式和位置
- ✅ 增量提取以提高性能

## 安装

```bash
# npm
npm install -D vite-plugin-formatjs

# yarn
yarn add -D vite-plugin-formatjs

# pnpm
pnpm add -D vite-plugin-formatjs
```

## 基本使用

在 `vite.config.ts` 中配置插件：

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { formatjs } from 'vite-plugin-formatjs';

export default defineConfig({
  plugins: [
    react(),
    formatjs({
      // 指定要扫描的文件
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      
      // 忽略的文件
      ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      
      // 输出文件路径
      outFile: 'src/i18n/messages.json',
      
      // 启用调试模式
      debug: false,
      
      // 是否在构建开始时执行提取
      extractOnBuild: true,
      
      // 是否启用热更新
      hotReload: true,
    }),
  ],
});
```

## 热更新功能

插件会自动监听文件变化并提取国际化消息。当文件内容变化时，插件会：

1. 检测变更文件是否符合配置中的 `include` 模式
2. 从变更文件中提取国际化消息
3. 合并到现有的消息文件中
4. 当检测到国际化消息变化时，自动刷新页面以加载最新的消息

这种方式简单有效，确保您的应用始终使用最新的国际化消息。如果您不希望在国际化消息变化时自动刷新页面，可以在配置中禁用热更新：

```ts
formatjs({
  // ... 其他配置
  hotReload: false,
})
```

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `include` | `string[]` | `['src/**/*.{ts,tsx,js,jsx,vue,hbs,gts,gjs}']` | 要扫描的文件匹配模式 |
| `ignore` | `string[]` | `['node_modules/**', '**/*.test.*', '**/*.spec.*']` | 要忽略的文件匹配模式 |
| `outFile` | `string` | `'src/locals/messages.json'` | 输出文件路径 |
| `debug` | `boolean` | `false` | 是否启用调试模式 |
| `hotReload` | `boolean` | `true` | 是否启用热更新（自动刷新） |
| `extractOnBuild` | `boolean` | `true` | 是否在构建开始时提取消息 |

插件还支持所有 `@formatjs/cli-lib` 的提取选项，例如：

- `idInterpolationPattern`
- `removeDefaultMessage`
- `additionalComponentNames`
- `format`
- `preserveWhitespace`

## License

MIT 