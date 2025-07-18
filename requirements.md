# vite-plugin-formatjs 需求文档

## 项目概述

**项目名称**: `vite-plugin-formatjs`  
**项目目标**: 将 formatjs 的消息提取和编译功能无缝集成到 vite 构建流程中，借助 vite 的文件监听和热更新能力，提供更好的国际化开发体验。

**核心价值**:
- 统一工具链：将 formatjs 的多个独立工具整合到单一 vite 插件中
- 开发效率：借助 vite 的 handleHotUpdate 钩子实现实时消息提取和编译
- 配置简化：减少多个工具的配置复杂度
- 实时体验：开发时实时看到翻译效果

## 功能需求

### 1. 消息提取功能

**基础能力**:
- 使用 `@formatjs/cli-lib` 的 `extractAndWrite` API 进行消息提取
- 支持多种文件类型：`.vue`, `.hbs`, `.gjs`, `.gts`, `.jsx`, `.tsx`
- 输出格式：仅支持 JSON 格式
- 全量提取：每次变化都进行全量提取并覆盖

**触发机制**:
- 开发时：通过 `handleHotUpdate` 钩子监听源码文件变化
- 构建时：可配置是否在构建开始时执行提取
- 防抖处理：300ms 防抖时间，避免频繁提取

**重要说明**:
- **extract 之后消息文件内容可能不会变化**
- **不需要 extract 之后主动触发 compile**
- **compile 由消息文件变化后被动调用**

**配置项**:
```typescript
import type { ExtractCLIOptions } from '@formatjs/cli-lib'

interface ExtractOptions extends ExtractCLIOptions {
  include: string[]           // 输入文件 minimatch
  ignore?: string[]           // 忽略文件 minimatch
  // ExtractCLIOptions 包含了 outFile
}
```

### 2. 消息编译功能

**基础能力**:
- 使用 `@formatjs/cli-lib` 的 `compile` API 进行消息编译
- 输入：包含元数据的翻译 JSON 文件
- 输出：精简的运行时 JSON 文件
- 支持多语言并行编译

**编译模式**:
1. **全量编译**：编译所有语言的消息文件
   - 用于 `buildStart` 时的初始化
   - 扫描整个 `inputDir` 目录
   - 并行编译所有语言文件

2. **单个文件编译**：编译特定的消息文件
   - 用于 `handleHotUpdate` 时的增量更新
   - 只编译变化的单个文件
   - 保持高效的开发体验

**触发机制**:
- **被动触发**：只有当翻译文件实际变化时才编译
- 全量编译：构建开始时执行
- 单个编译：翻译文件变化时通过 `handleHotUpdate` 触发

**配置项**:
```typescript
import type { CompileOpts } from '@formatjs/cli-lib';

interface CompileOptions extends CompileOpts {
  inputDir: string             // 翻译文件目录
  outputDir: string            // 编译结果输出目录
}
```

### 3. 热更新功能

**基础能力**:
- 源码变化时：防抖提取消息（如果消息文件变化，vite 会自动检测并触发编译）
- 翻译文件变化时：直接编译该文件
- **使用 vite 默认 HMR 行为，无需自定义精确更新**

**实现方式**:
- 使用 vite 的 `handleHotUpdate` 钩子监听文件变化
- 对于源码文件：执行提取，返回 `undefined` 使用默认 HMR
- 对于翻译文件：执行编译，返回 `undefined` 使用默认 HMR
- 防抖机制：避免同时保存多个文件时的重复处理

**配置项**:
```typescript
interface DevOptions {
  hotReload: boolean           // 是否启用热更新
  autoExtract: boolean         // 是否自动提取新消息
  debounceTime: number         // 防抖时间 (默认: 300ms)
}
```

## 技术需求

### 1. 核心依赖

```json
{
  "dependencies": {
    "@formatjs/cli-lib": "^x.x.x"
  },
  "peerDependencies": {
    "vite": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0"
  }
}
```

### 2. 插件配置接口

```typescript
interface ViteFormatJSConfig {
  // 消息提取配置
  extract: ...
  
  // 消息编译配置
  compile: ...
  
  // 开发配置
  dev: ...
  
  // 构建配置
  build: {
    extractOnBuild: boolean      // 构建时是否提取消息 (默认: true)
    compileOnBuild: boolean      // 构建时是否编译消息 (默认: true)
  }
  
  // 调试配置
  debug: boolean                 // 是否启用调试日志 (默认: false)
}
```

### 3. 插件实现结构

```typescript
export function formatjs(options: Partial<ViteFormatJSConfig>): Plugin {
  // 验证插件配置
  
  return {
    name: 'vite-plugin-formatjs',

    // 验证插件配置
    configResolved(): void
    
    // 构建开始时执行初始提取和全量编译
    buildStart(): Promise<void>
    
    // 处理文件变化的热更新
    handleHotUpdate(ctx: HmrContext): Promise<void>
    
    // 构建结束时清理资源
    buildEnd(): void
  }
}
```

### 4. 编译功能实现

```typescript
// 全量编译：用于 buildStart
async function compileAllMessages(config: ViteFormatJSConfig): Promise<void> {
  // 扫描所有翻译文件
  const messageFiles = await scanMessageFiles(config.compile.inputDir, config.compile.locales);
  
  // 并行编译所有文件
  await Promise.all(messageFiles.map(file => compileMessageFile(file, config)));
}

// 单个文件编译：用于 handleHotUpdate
async function compileMessageFile(filePath: string, config: ViteFormatJSConfig): Promise<void> {
  // 编译单个文件
  const result = await compile(filePath, {
    out: getOutputPath(filePath, config),
    // 其他编译选项
  });
  
  return result;
}
```

## 实现路线图

### Phase 1: 基础插件框架 (Week 1-2)
- [x] 创建插件基础结构
- [x] 集成 `@formatjs/cli-lib` 依赖
- [x] 实现配置解析和验证
- [x] 建立日志和错误处理机制

### Phase 2: 消息提取功能 (Week 3-4)
- [x] 封装 `extractAndWrite` API
- [x] 实现 `handleHotUpdate` 钩子（源码文件处理）
- [x] 支持多种文件类型识别
- [x] 实现防抖机制

### Phase 3: 消息编译功能 (Week 5-6)
- [ ] 实现全量编译功能（用于 buildStart）
- [ ] 实现单个文件编译功能（用于 handleHotUpdate）
- [ ] 添加翻译文件监听逻辑
- [ ] 实现编译结果缓存

### Phase 4: 热更新集成 (Week 7-8)
- [ ] 完善 `handleHotUpdate` 钩子（翻译文件处理）
- [ ] 集成防抖提取触发机制
- [ ] 添加可配置的热更新开关
- [ ] 使用 vite 默认 HMR 行为

### Phase 5: 测试和优化 (Week 9-10)
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 性能优化和内存管理
- [ ] 错误处理完善

### Phase 6: 文档和发布 (Week 11-12)
- [ ] 编写使用文档
- [ ] 创建示例项目
- [ ] 配置 CI/CD 流程
- [ ] 发布到 npm 仓库

## 技术实现要点

### 1. 文件监听策略

```typescript
// 使用 vite 的 handleHotUpdate，采用默认 HMR 行为
async handleHotUpdate(ctx) {
  const { file } = ctx;
  
  // 处理翻译文件变化
  if (isMessageFile(file, config)) {
    await compileMessageFile(file, config);
    // 返回 undefined 使用默认 HMR 行为
    return;
  }
  
  // 处理源码文件变化
  if (isFileInInclude(file, config.extract.include)) {
    debouncedExtract(); // 防抖提取
    // 返回 undefined 使用默认 HMR 行为
    return;
  }
  
  // 其他文件使用默认行为
  return;
}
```

### 2. 防抖提取机制

```typescript
let extractDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedExtract() {
  if (extractDebounceTimer) {
    clearTimeout(extractDebounceTimer);
  }
  
  extractDebounceTimer = setTimeout(async () => {
    await extractAndWrite(config.extract);
    // 不主动触发 compile，让消息文件变化后被动触发
  }, config.dev.debounceTime);
}
```

### 3. 编译功能实现

```typescript
// buildStart 时的全量编译
async function buildStart() {
  if (config.build.extractOnBuild) {
    await extractAndWrite(config.extract);
  }
  
  if (config.build.compileOnBuild) {
    await compileAllMessages(config);
  }
}

// handleHotUpdate 时的单个文件编译
async function handleTranslationFileChange(filePath: string) {
  await compileMessageFile(filePath, config);
  // 让 vite 处理默认的 HMR 行为
}
```

## 工作流程

### 开发时流程
1. 用户修改源码文件
2. `handleHotUpdate` 检测到变化
3. 防抖执行 `extractAndWrite`
4. 如果消息文件内容变化，vite 自动检测到翻译文件变化
5. `handleHotUpdate` 再次触发，编译变化的翻译文件
6. vite 执行默认 HMR 更新

### 构建时流程
1. `buildStart` 触发
2. 执行全量消息提取（如果启用）
3. 执行全量消息编译（如果启用）
4. 正常构建流程

## 使用示例

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { formatjs } from 'vite-plugin-formatjs'

export default defineConfig({
  plugins: [
    formatjs({
      extract: {
        sourceDir: ['src'],
        outputFile: 'locales/messages.json',
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        exclude: ['src/**/*.test.*']
      },
      compile: {
        inputDir: 'locales',
        outputDir: 'compiled-locales',
        locales: ['en', 'zh', 'ja']
      },
      dev: {
        hotReload: true,
        autoExtract: true
      }
    })
  ]
})
```

## 非功能需求

- **性能**: 使用防抖机制和缓存避免不必要的重复操作
- **兼容性**: 支持 vite 3.0+ 版本，支持主流前端框架
- **可扩展性**: 预留扩展点，方便后续功能添加
- **易用性**: 最小化配置，智能默认值
- **稳定性**: 完善的错误处理和日志记录

---

该需求文档基于最新的技术讨论，重点强调了：
1. 使用 vite 默认 HMR 行为
2. extract 和 compile 的分离触发机制
3. compile 的两种模式（全量和单个文件）
4. 被动触发的编译逻辑 