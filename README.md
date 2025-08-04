# vite-plugin-formatjs

A powerful Vite plugin that integrates FormatJS for automatic message extraction, compilation, and build-time optimization with hot reload support.

[![npm version](https://badge.fury.io/js/vite-plugin-formatjs.svg)](https://badge.fury.io/js/vite-plugin-formatjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Automatic Message Extraction** - Extract i18n messages from source code automatically
- ⚡ **Hot Reload Support** - Real-time message updates during development
- 🎯 **Multi-Framework Support** - Works with React, Vue, TypeScript, JavaScript, and more
- 🚀 **Performance Optimized** - Debounced processing and intelligent caching
- 📦 **Build Integration** - Seamless integration with Vite build process
- 🛠️ **Flexible Configuration** - Extensive customization options
- 📊 **Rich Logging** - Detailed debug information and performance metrics
- 🔧 **TypeScript Support** - Full TypeScript support with detailed type definitions

## 🚀 Quick Start

### Installation

```bash
# npm
npm install -D vite-plugin-formatjs

# yarn
yarn add -D vite-plugin-formatjs

# pnpm
pnpm add -D vite-plugin-formatjs
```

### Basic Setup

#### 1. Configure the Plugin

Add the plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { formatjs } from "vite-plugin-formatjs";

export default defineConfig({
  plugins: [
    // Configure React with babel-plugin-formatjs for runtime optimization
    react({
      babel: {
        plugins: [
          [
            "formatjs",
            {
              idInterpolationPattern: "[sha512:contenthash:base64:6]",
              ast: true,
              removeDefaultMessage: process.env.NODE_ENV === "production",
            },
          ],
        ],
      },
    }),

    // Configure vite-plugin-formatjs for build-time processing
    formatjs({
      extract: {
        include: ["src/**/*.{ts,tsx,js,jsx}"],
        outFile: "src/i18n/lang/en.json",
        idInterpolationPattern: "[sha512:contenthash:base64:6]",
      },
      compile: {
        inputDir: "src/i18n/lang",
        outputDir: "src/i18n/compiled-lang",
      },
      debug: process.env.NODE_ENV === "development",
    }),
  ],
});
```

#### 2. Create Your i18n Setup

```typescript
// src/i18n/index.ts
export const supportedLocales = ["en", "zh", "fr"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export async function loadMessages(locale: string) {
  const normalizedLocale = supportedLocales.includes(locale as SupportedLocale)
    ? locale
    : "en";

  try {
    const messages = await import(`./compiled-lang/${normalizedLocale}.json`);
    return messages.default || messages;
  } catch (error) {
    console.warn(`Failed to load messages for ${normalizedLocale}`, error);
    return {};
  }
}
```

#### 3. Use in Your Components

```tsx
// src/components/Welcome.tsx
import { FormattedMessage } from "react-intl";

export function Welcome() {
  return (
    <div>
      <h1>
        <FormattedMessage
          id="welcome.title"
          defaultMessage="Welcome to our app!"
        />
      </h1>
      <p>
        <FormattedMessage
          id="welcome.description"
          defaultMessage="This message will be automatically extracted and compiled."
        />
      </p>
    </div>
  );
}
```

## 🔧 Configuration

### Complete Configuration Example

```typescript
import { formatjs } from "vite-plugin-formatjs";

formatjs({
  // Message extraction configuration
  extract: {
    // Files to scan for messages
    include: [
      "src/**/*.{ts,tsx,js,jsx}",
      "components/**/*.vue",
      "pages/**/*.html",
    ],

    // Files to ignore
    ignore: ["node_modules/**", "**/*.test.*", "**/*.spec.*", "dist/**"],

    // Output file for extracted messages
    outFile: "src/i18n/lang/en.json",

    // Message ID generation pattern
    idInterpolationPattern: "[sha512:contenthash:base64:6]",

    // FormatJS extraction options
    additionalComponentNames: ["CustomFormattedMessage"],
    preserveWhitespace: true,
  },

  // Message compilation configuration
  compile: {
    inputDir: "src/i18n/lang", // Source translation files
    outputDir: "src/i18n/compiled-lang", // Compiled output directory
  },

  // Development options
  debug: process.env.NODE_ENV === "development",
  autoExtract: true,
  debounceTime: 300,
  extractOnBuild: true,
});
```

### Configuration Options

#### Extract Options

| Option    | Type       | Default                                             | Description                        |
| --------- | ---------- | --------------------------------------------------- | ---------------------------------- |
| `include` | `string[]` | `['src/**/*.{ts,tsx,js,jsx,vue,hbs,gjs,gts}']`      | File patterns to scan for messages |
| `ignore`  | `string[]` | `['node_modules/**', '**/*.test.*', '**/*.spec.*']` | File patterns to ignore            |
| `outFile` | `string`   | `'src/i18n/lang/en.json'`                           | Output file for extracted messages |

All options from [`@formatjs/cli-lib`](https://formatjs.io/docs/tooling/cli#extraction) are also supported.

#### Compile Options

| Option      | Type     | Default                    | Description                            |
| ----------- | -------- | -------------------------- | -------------------------------------- |
| `inputDir`  | `string` | `'src/i18n/lang'`          | Directory containing translation files |
| `outputDir` | `string` | `'src/i18n/compiled-lang'` | Output directory for compiled files    |

All options from [`@formatjs/cli-lib`](https://formatjs.io/docs/tooling/cli#compilation) are also supported.

#### Plugin Options

| Option           | Type      | Default | Description                                            |
| ---------------- | --------- | ------- | ------------------------------------------------------ |
| `debug`          | `boolean` | `false` | Enable detailed debug logging                          |
| `autoExtract`    | `boolean` | `true`  | Automatically extract messages on file changes         |
| `debounceTime`   | `number`  | `300`   | Debounce time in milliseconds for file change handling |
| `extractOnBuild` | `boolean` | `false` | Extract messages at build start                        |

## 🔥 Hot Reload

The plugin provides seamless hot reload functionality during development:

1. **Source File Changes**: When you modify source files containing messages, the plugin automatically:

   - Extracts new/modified messages
   - Updates the message files
   - Recompiles affected translations
   - Triggers Vite's HMR

2. **Translation File Changes**: When you update translation files, the plugin:

   - Recompiles the specific file
   - Updates the compiled output
   - Triggers HMR for immediate preview

3. **Smart Debouncing**: Multiple file changes are batched together to avoid excessive processing.

## 🏗️ Build Process

### Development Mode (`vite dev`)

1. **Initial Setup**: Extract and compile all messages on startup
2. **File Watching**: Monitor source files for message changes
3. **Hot Updates**: Real-time message extraction and compilation
4. **Debug Logging**: Detailed information about processing (when `debug: true`)

### Production Build (`vite build`)

1. **Final Extraction**: Ensure all messages are extracted (if `extractOnBuild: true`)
2. **Compilation**: Compile all translation files for optimal runtime performance
3. **Optimization**: Remove debug information and optimize output

## 🧩 Framework Integration

### React + React-Intl

```typescript
// Complete setup with React
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { formatjs } from "vite-plugin-formatjs";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "formatjs",
            {
              idInterpolationPattern: "[sha512:contenthash:base64:6]",
              ast: true,
              removeDefaultMessage: process.env.NODE_ENV === "production",
            },
          ],
        ],
      },
    }),
    formatjs({
      extract: {
        include: ["src/**/*.{ts,tsx}"],
        outFile: "src/locales/en.json",
        idInterpolationPattern: "[sha512:contenthash:base64:6]",
      },
      compile: {
        inputDir: "src/locales",
        outputDir: "src/compiled-locales",
      },
    }),
  ],
});
```

### Vue + Vue-i18n

```typescript
import { formatjs } from "vite-plugin-formatjs";

export default defineConfig({
  plugins: [
    vue(),
    formatjs({
      extract: {
        include: ["src/**/*.{vue,ts,js}"],
        outFile: "src/locales/messages.json",
      },
      compile: {
        inputDir: "src/locales",
        outputDir: "src/compiled-locales",
      },
    }),
  ],
});
```

## 📊 Performance & Optimization

- **Debounced Processing**: Batches multiple file changes to reduce unnecessary work
- **Incremental Updates**: Only processes changed files during development
- **Parallel Compilation**: Compiles multiple translation files concurrently
- **Smart Caching**: Avoids reprocessing unchanged content
- **Memory Efficient**: Optimized for large codebases

## 🐛 Debugging

Enable debug mode to get detailed information about the plugin's operation:

```typescript
formatjs({
  debug: true, // or process.env.NODE_ENV === 'development'
  // ... other options
});
```

Debug output includes:

- File processing information
- Performance timing
- Message extraction results
- Compilation status
- Error details

## 📁 Project Structure

```
src/
├── components/
│   └── *.tsx                    # Components with messages
├── i18n/
│   ├── index.ts                 # i18n setup and utilities
│   ├── lang/                    # Source translation files
│   │   ├── en.json             # Extracted messages (auto-generated)
│   │   ├── zh.json             # Chinese translations
│   │   └── fr.json             # French translations
│   └── compiled-lang/           # Compiled translation files (auto-generated)
│       ├── en.json
│       ├── zh.json
│       └── fr.json
└── ...
```

## 🤝 Integration with Babel Plugin

This plugin works seamlessly with `babel-plugin-formatjs`:

- **vite-plugin-formatjs**: Handles build-time extraction and compilation
- **babel-plugin-formatjs**: Handles runtime code optimization and transformation

Both plugins can use the same `idInterpolationPattern` to ensure consistency.

## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [asfamilybank](https://github.com/asfamilybank)

## 🔗 Links

- [FormatJS Documentation](https://formatjs.io/)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [React-Intl](https://formatjs.io/docs/react-intl/)
- [Vue-i18n](https://vue-i18n.intlify.dev/)
