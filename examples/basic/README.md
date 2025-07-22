# Vite Plugin FormatJS - Basic Example

A comprehensive example demonstrating how to use `vite-plugin-formatjs` with React, TypeScript, and react-intl.

## 🚀 Tech Stack

- ✅ **React 18** - Modern React framework
- ✅ **Vite** - Fast build tool and dev server
- ✅ **TypeScript** - Type-safe development experience
- ✅ **react-intl** - React internationalization library
- ✅ **vite-plugin-formatjs** - Automatic message extraction and compilation
- ✅ **Hot Reload** - Real-time translation updates during development

## 📁 Project Structure

```
examples/basic/
├── src/
│   ├── components/                    # React components
│   │   ├── Counter.tsx               # Counter component (demo message extraction)
│   │   └── LanguageSwitcher.tsx      # Language switcher component
│   ├── i18n/                         # Internationalization setup
│   │   ├── index.ts                  # Message loading utilities
│   │   ├── lang/                     # Source translation files (plugin input)
│   │   │   ├── en.json               # English messages (auto-generated)
│   │   │   └── zh.json               # Chinese translations
│   │   └── compiled-lang/            # Compiled translation files (plugin output)
│   │       ├── en.json               # Compiled English messages
│   │       └── zh.json               # Compiled Chinese messages
│   ├── App.tsx                       # Main application component
│   └── main.tsx                      # React entry point
├── vite.config.ts                    # Vite configuration (includes plugin setup)
└── package.json
```

## ✨ Plugin Features Demo

### 1. Automatic Message Extraction

The plugin automatically extracts messages from `<FormattedMessage>` components in `src/**/*.{ts,tsx,js,jsx}` files and saves results to `src/i18n/lang/en.json`.

For example, when you write:

```tsx
<FormattedMessage
  id="welcome.title"
  defaultMessage="Welcome to Vite Plugin FormatJS Example"
/>
```

The plugin will automatically extract this message and update the message files.

### 2. Automatic Message Compilation

The plugin compiles translation files from the `src/i18n/lang/` directory into runtime-optimized format, outputting to the `src/i18n/compiled-lang/` directory.

### 3. Development Hot Reload

- When you modify messages in source code, the plugin automatically re-extracts them
- When you modify translation files, the plugin automatically recompiles them
- Supports real-time preview of translation changes

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:5173 to see the example.

### 3. Test Plugin Features

Try the following operations to experience the plugin's functionality:

#### **Test Message Extraction**:

1. Modify the `defaultMessage` in `src/App.tsx`
2. Save the file and check if `src/i18n/lang/en.json` is automatically updated

#### **Test Message Compilation**:

1. Modify translations in `src/i18n/lang/zh.json`
2. Save the file and check if `src/i18n/compiled-lang/zh.json` is automatically updated

#### **Test Hot Reload**:

1. Modify translation files
2. Browser content should automatically update (if language switching is implemented)

## ⚙️ Plugin Configuration

This example uses the plugin configuration optimized for React development:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import formatjs from "vite-plugin-formatjs";

export default defineConfig({
  plugins: [
    // React with babel-plugin-formatjs for runtime optimization
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

    // vite-plugin-formatjs for build-time processing
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

## 🏗️ Build for Production

```bash
pnpm build
```

During build, the plugin will:

1. Perform final message extraction
2. Compile all translation files
3. Optimize for production

## 🔧 Extending This Example

Based on this basic example, you can:

1. **Add More Languages**: Add new language files in the `src/i18n/lang/` directory
2. **Implement Language Switching**: Complete the `LanguageSwitcher` component functionality
3. **Add Complex Messages**: Support pluralization, date formatting, etc.
4. **Custom Plugin Configuration**: Adjust plugin settings according to project needs

## 🐛 Troubleshooting

If you encounter issues:

1. Ensure all dependencies are properly installed
2. Check console output for plugin logs
3. Verify translation files have valid JSON format
4. Confirm file paths match the plugin's configuration patterns
5. Enable debug mode by setting `debug: true` in the plugin configuration

## 📚 Learn More

- [vite-plugin-formatjs Documentation](../../README.md)
- [react-intl Documentation](https://formatjs.io/docs/react-intl/)
- [FormatJS Documentation](https://formatjs.io/)
- [Vite Documentation](https://vitejs.dev/)

## 💡 Key Concepts

This example demonstrates:

- **Dual Plugin Architecture**: How `babel-plugin-formatjs` and `vite-plugin-formatjs` work together
- **Message Extraction Workflow**: From source code to compiled messages
- **Hot Reload Integration**: Real-time development experience
- **TypeScript Integration**: Type-safe internationalization setup
- **Performance Optimization**: Runtime and build-time optimizations
