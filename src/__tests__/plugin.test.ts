import type { HmrContext, ResolvedConfig } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatjs } from '../plugin';

interface PluginReturn {
  configResolved: (config: ResolvedConfig) => void;
  buildStart: () => Promise<void>;
  handleHotUpdate: (ctx: Pick<HmrContext, 'file'>) => Promise<void>;
  buildEnd: () => void;
}

// Mock 外部依赖
vi.mock(':core/config', () => ({
  resolveConfig: vi.fn(),
  validateConfig: vi.fn(),
}));

vi.mock(':core/extract', () => ({
  extractMessages: vi.fn(),
  isFileInInclude: vi.fn(),
}));

vi.mock(':core/compile', () => ({
  compileMessageFile: vi.fn(),
  compileMessages: vi.fn(),
  isMessageFile: vi.fn(),
}));

vi.mock(':utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    updateConfig: vi.fn(),
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
}));

vi.mock(':utils/constant', () => ({
  PLUGIN_NAME: 'vite-plugin-formatjs',
}));

// 导入 mocked 依赖
import {
  compileMessageFile,
  compileMessages,
  isMessageFile,
} from ':core/compile';
import { resolveConfig, validateConfig } from ':core/config';
import { extractMessages, isFileInInclude } from ':core/extract';
import { logger } from ':utils/logger';

const mockedResolveConfig = vi.mocked(resolveConfig);
const mockedValidateConfig = vi.mocked(validateConfig);
const mockedExtractMessages = vi.mocked(extractMessages);
const mockedIsFileInInclude = vi.mocked(isFileInInclude);
const mockedCompileMessageFile = vi.mocked(compileMessageFile);
const mockedCompileMessages = vi.mocked(compileMessages);
const mockedIsMessageFile = vi.mocked(isMessageFile);
const mockedLogger = vi.mocked(logger);

describe('plugin.ts', () => {
  // 模拟配置
  const mockConfig = {
    extract: {
      include: ['src/**/*.tsx'],
      outFile: 'src/lang/en.json',
      ignore: ['**/*.test.ts'],
      idInterpolationPattern: '[hash]',
      throws: true,
    },
    compile: {
      inputDir: 'src/lang',
      outputDir: 'src/compiled-lang',
    },
    dev: {
      hotReload: true,
      autoExtract: true,
      debounceTime: 300,
    },
    build: {
      extractOnBuild: true,
      compileOnBuild: true,
    },
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveConfig.mockReturnValue(mockConfig);
    mockedValidateConfig.mockImplementation(() => {});
    mockedExtractMessages.mockResolvedValue(100);
    mockedIsFileInInclude.mockReturnValue(false);
    mockedCompileMessageFile.mockResolvedValue(50);
    mockedCompileMessages.mockResolvedValue(200);
    mockedIsMessageFile.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('formatjs 插件工厂函数', () => {
    it('应该返回正确的 Plugin 对象', () => {
      const plugin = formatjs();

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-formatjs');
      expect(plugin.configResolved).toBeDefined();
      expect(plugin.buildStart).toBeDefined();
      expect(plugin.handleHotUpdate).toBeDefined();
      expect(plugin.buildEnd).toBeDefined();
    });

    it('应该使用正确的插件名称', () => {
      const plugin = formatjs();

      expect(plugin.name).toBe('vite-plugin-formatjs');
    });

    it('应该使用默认配置当没有传入选项时', () => {
      formatjs();

      expect(mockedResolveConfig).toHaveBeenCalledWith({});
    });

    it('应该正确传递用户配置', () => {
      const userConfig = {
        extract: {
          include: ['custom/**/*.ts'],
          outFile: 'custom/messages.json',
        },
        debug: true,
      };

      formatjs(userConfig);

      expect(mockedResolveConfig).toHaveBeenCalledWith(userConfig);
    });

    it('应该处理空配置', () => {
      formatjs({});

      expect(mockedResolveConfig).toHaveBeenCalledWith({});
    });

    it('应该处理复杂配置', () => {
      const complexConfig = {
        extract: {
          include: ['src/**/*.tsx', 'lib/**/*.ts'],
          outFile: 'messages.json',
          ignore: ['**/*.test.*'],
        },
        compile: {
          inputDir: 'src/lang',
          outputDir: 'dist/lang',
        },
        dev: {
          hotReload: false,
          debounceTime: 500,
        },
        debug: true,
      };

      formatjs(complexConfig);

      expect(mockedResolveConfig).toHaveBeenCalledWith(complexConfig);
    });
  });

  describe('configResolved 钩子', () => {
    it('应该保存 Vite 配置', () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      expect(mockedValidateConfig).toHaveBeenCalledWith(mockConfig);
    });

    it('应该在不同模式下正确保存配置', () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const buildConfig = {
        command: 'build',
        mode: 'production',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(buildConfig);

      expect(mockedValidateConfig).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('buildStart 钩子', () => {
    it('应该在 extractOnBuild 为 true 时提取消息', async () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'build',
        mode: 'production',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedExtractMessages).toHaveBeenCalledWith(mockConfig.extract);
    });

    it('应该在 serve 模式下始终提取消息', async () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedExtractMessages).toHaveBeenCalledWith(mockConfig.extract);
    });

    it('应该在 build 模式且 extractOnBuild 为 false 时跳过提取', async () => {
      const configWithoutExtract = {
        ...mockConfig,
        build: {
          ...mockConfig.build,
          extractOnBuild: false,
        },
      };
      mockedResolveConfig.mockReturnValue(configWithoutExtract);

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'build',
        mode: 'production',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedExtractMessages).not.toHaveBeenCalled();
    });

    it('应该在提取成功时记录成功日志', async () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('提取消息完成')
      );
    });

    it('应该在提取失败时记录错误日志并继续执行', async () => {
      const error = new Error('提取失败');
      mockedExtractMessages.mockRejectedValue(error);

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '构建开始时提取消息失败',
        { error }
      );
    });
  });

  describe('handleHotUpdate 钩子', () => {
    it('应该在文件不匹配 include 时直接返回', async () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      const result = await plugin.handleHotUpdate({
        file: 'src/styles/main.css',
      });

      expect(result).toBeUndefined();
    });

    it('应该在文件匹配 include 时添加到待处理队列', async () => {
      mockedIsFileInInclude.mockReturnValue(true);

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      const result = await plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
      });

      expect(result).toBeUndefined();
    });

    it('应该设置防抖计时器', async () => {
      mockedIsFileInInclude.mockReturnValue(true);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      await plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
      });

      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig.dev.debounceTime
      );

      clearTimeoutSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('应该清除之前的防抖计时器', async () => {
      mockedIsFileInInclude.mockReturnValue(true);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      // 第一次调用
      await plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
      });

      // 第二次调用
      await plugin.handleHotUpdate({
        file: 'src/components/Header.tsx',
      });

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('应该收集多个待处理文件', async () => {
      mockedIsFileInInclude.mockReturnValue(true);
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'serve',
        mode: 'development',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      await plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
      });

      await plugin.handleHotUpdate({
        file: 'src/components/Header.tsx',
      });

      await plugin.handleHotUpdate({
        file: 'src/utils/helper.ts',
      });

      expect(setTimeoutSpy).toHaveBeenCalledTimes(3);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('buildEnd 钩子', () => {
    it('应该在 debug 模式下记录构建结束日志', () => {
      const debugConfig = {
        ...mockConfig,
        debug: true,
      };
      mockedResolveConfig.mockReturnValue(debugConfig);

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'build',
        mode: 'production',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      plugin.buildEnd();

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '构建结束，已清理所有资源'
      );
    });

    it('应该在快速连续的构建结束调用时正确处理', () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'build',
        mode: 'production',
        root: '/project',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      // 连续调用多次
      plugin.buildEnd();
      plugin.buildEnd();
      plugin.buildEnd();

      // 应该都被处理
      expect(mockedLogger.debug).toHaveBeenCalledTimes(3);
    });
  });
});
