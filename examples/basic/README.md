# Vite Plugin FormatJS - 基础示例

这是一个展示如何使用 `vite-plugin-formatjs` 的最简单示例项目。该示例使用 React + Vite + TypeScript + react-intl 的技术栈。

## 项目特性

- ✅ **React 18** - 现代化的 React 框架
- ✅ **Vite** - 快速的构建工具和开发服务器
- ✅ **TypeScript** - 类型安全的开发体验
- ✅ **react-intl** - React 国际化库
- ✅ **vite-plugin-formatjs** - 自动消息提取和编译
- ✅ **热重载** - 开发时实时更新翻译

## 目录结构

```
examples/basic/
├── src/
│   ├── components/          # React 组件
│   │   ├── Counter.tsx      # 计数器组件（演示消息提取）
│   │   └── LanguageSwitcher.tsx  # 语言切换组件
│   ├── i18n/               # 国际化配置
│   │   └── index.ts        # 消息加载逻辑
│   ├── lang/               # 翻译文件（插件输入）
│   │   ├── en.json         # 英文翻译
│   │   └── zh.json         # 中文翻译
│   ├── compiled-lang/      # 编译后的翻译文件（插件输出）
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # React 入口
├── vite.config.ts          # Vite 配置（包含插件配置）
└── package.json
```

## 插件功能演示

### 1. 消息自动提取

插件会自动从 `src/**/*.{ts,tsx,js,jsx}` 文件中提取 `<FormattedMessage>` 组件的消息，并将结果保存到 `src/lang/en.json`。

例如，当你在组件中写：

```tsx
<FormattedMessage
  id="app.title"
  defaultMessage="Vite Plugin FormatJS Example"
/>
```

插件会自动提取这个消息并更新消息文件。

### 2. 消息自动编译

插件会将 `src/lang/` 目录中的翻译文件编译为运行时优化的格式，输出到 `src/compiled-lang/` 目录。

### 3. 开发时热重载

- 修改源代码中的消息时，插件会自动重新提取
- 修改翻译文件时，插件会自动重新编译
- 支持实时查看翻译效果

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173 查看示例。

### 3. 测试插件功能

尝试以下操作来体验插件的功能：

1. **测试消息提取**：

   - 修改 `src/App.tsx` 中的 `defaultMessage`
   - 保存文件后查看 `src/lang/en.json` 是否自动更新

2. **测试消息编译**：

   - 修改 `src/lang/zh.json` 中的翻译
   - 保存文件后查看 `src/compiled-lang/zh.json` 是否自动更新

3. **测试热重载**：
   - 修改翻译文件
   - 浏览器中的内容应该自动更新（如果实现了语言切换功能）

## 插件配置

本示例使用插件的默认配置：

```typescript
// vite.config.ts
import { formatjs } from "vite-plugin-formatjs";

export default defineConfig({
  plugins: [
    react(),
    formatjs(), // 使用默认配置
  ],
});
```

默认配置相当于：

```typescript
formatjs({
  extract: {
    include: ["src/**/*.{ts,tsx,js,jsx,vue,hbs,gjs,gts}"],
    outFile: "src/lang/en.json",
    // 其他默认选项...
  },
  compile: {
    inputDir: "src/lang",
    outputDir: "src/compiled-lang",
  },
  dev: {
    hotReload: true,
    autoExtract: true,
    debounceTime: 300,
  },
});
```

## 构建生产版本

```bash
pnpm build
```

构建时插件会：

1. 执行最终的消息提取
2. 编译所有翻译文件
3. 优化生产版本

## 扩展此示例

基于这个基础示例，你可以：

1. **添加更多语言**：在 `src/lang/` 目录添加新的语言文件
2. **实现语言切换**：完善 `LanguageSwitcher` 组件的功能
3. **添加复杂的消息**：支持复数、日期格式化等
4. **自定义插件配置**：根据项目需要调整插件设置

## 故障排除

如果遇到问题：

1. 确保所有依赖已正确安装
2. 检查控制台输出的插件日志
3. 验证翻译文件的 JSON 格式是否正确
4. 确认文件路径符合插件的配置模式

## 了解更多

- [vite-plugin-formatjs 文档](../../README.md)
- [react-intl 文档](https://formatjs.io/docs/react-intl/)
- [Vite 文档](https://vitejs.dev/)
