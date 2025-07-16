import type { HmrContext, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatjs } from '../plugin';

// 导入 mocked 依赖
import { resolveConfig } from ':core/config';
import { extractMessages, isFileInInclude } from ':core/extract';
import { PLUGIN_NAME } from ':utils/constant';
import { logger } from ':utils/logger';

interface PluginReturn {
  configResolved: (config: ResolvedConfig) => void;
  buildStart: () => Promise<void>;
  handleHotUpdate: (ctx: Pick<HmrContext, 'file' | 'server'>) => void;
  buildEnd: () => void;
}

// Mock 外部依赖
vi.mock(':core/config', () => ({
  resolveConfig: vi.fn(),
}));

vi.mock(':core/extract', () => ({
  extractMessages: vi.fn(),
  isFileInInclude: vi.fn(),
}));

vi.mock(':utils/cache', () => ({
  findCache: vi.fn(),
  writeCache: vi.fn(),
  clearCache: vi.fn(),
}));

vi.mock(':utils/logger', () => ({
  logger: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock(':utils/constant', () => ({
  PLUGIN_NAME: 'vite-plugin-formatjs',
}));

const mockedResolveConfig = vi.mocked(resolveConfig);
const mockedExtractMessages = vi.mocked(extractMessages);
const mockedIsFileInInclude = vi.mocked(isFileInInclude);
const mockedLogger = vi.mocked(logger);

// Mock global timer functions
const mockedSetTimeout = vi.fn(
  (_: () => void | Promise<void>, __: number) => ''
);
const mockedClearTimeout = vi.fn((_: number) => {});

// Replace global timer functions
vi.stubGlobal('setTimeout', mockedSetTimeout);
vi.stubGlobal('clearTimeout', mockedClearTimeout);

describe('plugin.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 设置默认的 mock 返回值
    mockedResolveConfig.mockReturnValue({
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      ignore: ['node_modules', 'dist'],
      outFile: 'src/locales/messages.json',
      debug: false,
      hotReload: true,
      extractOnBuild: false,
      idInterpolationPattern: '[sha512:contenthash:base64:6]',
      throws: true,
    });

    mockedExtractMessages.mockResolvedValue({
      messages: { test: { id: 'test', defaultMessage: 'Hello' } },
      duration: 100,
      isChanged: false,
    });

    mockedIsFileInInclude.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('formatjs 插件工厂函数', () => {
    it('应该返回正确的 Plugin 对象', () => {
      const plugin = formatjs();

      expect(plugin).toEqual({
        name: PLUGIN_NAME,
        configResolved: expect.any(Function) as Plugin['configResolved'],
        buildStart: expect.any(Function) as Plugin['buildStart'],
        handleHotUpdate: expect.any(Function) as Plugin['handleHotUpdate'],
        buildEnd: expect.any(Function) as Plugin['buildEnd'],
      });
    });

    it('应该使用正确的插件名称', () => {
      const plugin = formatjs();
      expect(plugin.name).toBe(PLUGIN_NAME);
    });

    it('应该使用默认配置当没有传入选项时', () => {
      formatjs();
      expect(mockedResolveConfig).toHaveBeenCalledWith({});
    });

    it('应该正确传递用户配置', () => {
      const userConfig = { debug: true, outFile: 'custom.json' };
      formatjs(userConfig);
      expect(mockedResolveConfig).toHaveBeenCalledWith(userConfig);
    });

    it('应该处理空配置', () => {
      formatjs({});
      expect(mockedResolveConfig).toHaveBeenCalledWith({});
    });

    it('应该处理复杂配置', () => {
      const complexConfig = {
        include: ['app/**/*.tsx'],
        debug: true,
        hotReload: false,
        extractOnBuild: true,
        idInterpolationPattern: '[hash:8]',
      };
      formatjs(complexConfig);
      expect(mockedResolveConfig).toHaveBeenCalledWith(complexConfig);
    });
  });

  describe('configResolved 钩子', () => {
    it('应该保存 Vite 配置', () => {
      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = {
        command: 'build',
        mode: 'production',
      } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      // 通过后续的 buildStart 调用验证配置被保存
      expect(plugin.configResolved).toBeDefined();
    });

    it('应该在不同模式下正确保存配置', () => {
      const plugin = formatjs() as unknown as PluginReturn;

      const buildConfig = { command: 'build' } as ResolvedConfig;
      const serveConfig = { command: 'serve' } as ResolvedConfig;

      plugin.configResolved(buildConfig);

      plugin.configResolved(serveConfig);

      // 验证钩子可以被多次调用
      expect(plugin.configResolved).toBeDefined();
    });
  });

  describe('buildStart 钩子', () => {
    it('应该在 extractOnBuild 为 true 时提取消息', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: true,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'build' } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      await plugin.buildStart();

      expect(mockedExtractMessages).toHaveBeenCalledWith({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: true,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });
    });

    it('应该在 serve 模式下始终提取消息', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: false,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'serve' } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      await plugin.buildStart();

      expect(mockedExtractMessages).toHaveBeenCalled();
    });

    it('应该在 build 模式且 extractOnBuild 为 false 时跳过提取', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: false,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'build' } as ResolvedConfig;

      plugin.configResolved(viteConfig);

      await plugin.buildStart();

      expect(mockedExtractMessages).not.toHaveBeenCalled();
    });

    it('应该在提取成功时记录成功日志', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: true,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 150,
        isChanged: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'build' } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedLogger.success).toHaveBeenCalledWith(
        '构建开始时提取消息完成，耗时 150ms'
      );
    });

    it('应该在提取失败时记录错误日志并继续执行', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        extractOnBuild: true,
        debug: false,
        hotReload: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const extractError = new Error('Extract failed');
      mockedExtractMessages.mockRejectedValue(extractError);

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'build' } as ResolvedConfig;

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '构建开始时提取消息失败',
        { error: extractError }
      );
    });
  });

  describe('handleHotUpdate 钩子', () => {
    let mockServer: ViteDevServer;

    beforeEach(() => {
      mockServer = {
        ws: {
          send: vi.fn(),
        },
      } as unknown as ViteDevServer;
    });

    it('应该在文件不匹配 include 时直接返回', () => {
      mockedIsFileInInclude.mockReturnValue(false);

      const plugin = formatjs() as unknown as PluginReturn;
      const result = plugin.handleHotUpdate({
        file: 'src/styles/main.css',
        server: mockServer,
      });

      expect(mockedIsFileInInclude).toHaveBeenCalledWith(
        'src/styles/main.css',
        ['src/**/*.{ts,tsx,js,jsx}']
      );
      expect(result).toBeUndefined();
    });

    it('应该在文件匹配 include 时添加到待处理队列', () => {
      mockedIsFileInInclude.mockReturnValue(true);

      const plugin = formatjs() as unknown as PluginReturn;
      const result = plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      expect(mockedIsFileInInclude).toHaveBeenCalledWith(
        'src/components/Button.tsx',
        ['src/**/*.{ts,tsx,js,jsx}']
      );
      expect(result).toEqual([]);
    });

    it('应该设置防抖计时器', () => {
      mockedIsFileInInclude.mockReturnValue(true);
      mockedSetTimeout.mockImplementation((_, delay: number) => {
        expect(delay).toBe(300);
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      expect(mockedSetTimeout).toHaveBeenCalledWith(expect.any(Function), 300);
    });

    it('应该清除之前的防抖计时器', () => {
      mockedIsFileInInclude.mockReturnValue(true);
      let timerId = 1;
      mockedSetTimeout.mockImplementation(() => (timerId++).toString());

      const plugin = formatjs() as unknown as PluginReturn;

      // 第一次调用
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 第二次调用
      plugin.handleHotUpdate({
        file: 'src/components/Input.tsx',
        server: mockServer,
      });

      expect(mockedClearTimeout).toHaveBeenCalledWith('1');
      expect(mockedSetTimeout).toHaveBeenCalledTimes(2);
    });

    it('应该收集多个待处理文件', () => {
      mockedIsFileInInclude.mockReturnValue(true);
      mockedSetTimeout.mockImplementation((_: () => void | Promise<void>) => {
        // 不执行回调，只是验证设置
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;

      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      plugin.handleHotUpdate({
        file: 'src/components/Input.tsx',
        server: mockServer,
      });

      plugin.handleHotUpdate({
        file: 'src/utils/helper.ts',
        server: mockServer,
      });

      // 验证每次都设置了新的计时器
      expect(mockedSetTimeout).toHaveBeenCalledTimes(3);
      expect(mockedClearTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('防抖机制', () => {
    let mockServer: ViteDevServer;

    beforeEach(() => {
      mockServer = {
        ws: {
          send: vi.fn(),
        },
      } as unknown as ViteDevServer;
    });

    it('应该在防抖延迟后执行提取', async () => {
      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: true,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockedExtractMessages).toHaveBeenCalled();
    });

    it('应该在消息变化时触发页面重载', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: true,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockServer.ws.send).toHaveBeenCalledWith({
        type: 'full-reload',
        path: '*',
      });
      expect(mockedLogger.info).toHaveBeenCalledWith(
        '检测到消息变化，重新提取消息，耗时 100ms'
      );
    });

    it('应该在消息未变化时不触发页面重载', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: false,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockServer.ws.send).not.toHaveBeenCalled();
      expect(mockedLogger.info).not.toHaveBeenCalled();
    });

    it('应该在 hotReload 为 false 时不触发页面重载', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: false,
        hotReload: false,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: true,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockServer.ws.send).not.toHaveBeenCalled();
    });

    it('应该在 debug 模式下记录详细日志', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: true,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: false,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '防抖提取消息完成',
        expect.objectContaining({
          pendingFiles: ['src/components/Button.tsx'],
          messageCount: 1,
          duration: 100,
          isChanged: false,
        })
      );
    });

    it('应该在提取失败时记录错误日志', async () => {
      mockedIsFileInInclude.mockReturnValue(true);
      const extractError = new Error('Extract failed');
      mockedExtractMessages.mockRejectedValue(extractError);

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      expect(mockedLogger.error).toHaveBeenCalledWith('防抖提取消息失败', {
        error: extractError,
      });
    });

    it('应该防止并发提取', async () => {
      mockedIsFileInInclude.mockReturnValue(true);

      // 模拟长时间运行的提取
      let resolveExtract: (value: unknown) => void;
      mockedExtractMessages.mockImplementation(
        () =>
          new Promise(resolve => {
            resolveExtract = resolve;
          })
      );

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 启动第一次提取
      const firstExtract = debounceCallback!();

      // 在第一次提取完成前启动第二次提取
      const secondExtract = debounceCallback!();

      // 完成第一次提取
      resolveExtract!({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: false,
      });

      await firstExtract;
      await secondExtract;

      // 验证只调用了一次提取
      expect(mockedExtractMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildEnd 钩子', () => {
    it('应该在 debug 模式下记录构建结束日志', () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: true,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.buildEnd();

      expect(mockedLogger.debug).toHaveBeenCalledWith('构建结束');
    });

    it('应该在非 debug 模式下不记录日志', () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      plugin.buildEnd();

      expect(mockedLogger.debug).not.toHaveBeenCalled();
    });

    it('应该清理防抖计时器', () => {
      mockedIsFileInInclude.mockReturnValue(true);
      mockedSetTimeout.mockReturnValue('timer-id');

      const plugin = formatjs() as unknown as PluginReturn;
      const mockServer = {
        ws: { send: vi.fn() },
      } as unknown as ViteDevServer;

      // 触发热更新以设置计时器
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 构建结束
      plugin.buildEnd();

      expect(mockedClearTimeout).toHaveBeenCalledWith('timer-id');
    });
  });

  describe('集成测试', () => {
    let mockServer: ViteDevServer;

    beforeEach(() => {
      mockServer = {
        ws: {
          send: vi.fn(),
        },
      } as unknown as ViteDevServer;
    });

    it('应该支持完整的工作流程', async () => {
      const userConfig = {
        include: ['src/**/*.tsx'],
        debug: true,
        hotReload: true,
        extractOnBuild: true,
      };

      const resolvedConfig = {
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: true,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedResolveConfig.mockReturnValue(resolvedConfig);
      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: {
          welcome: { id: 'welcome', defaultMessage: 'Welcome' },
          goodbye: { id: 'goodbye', defaultMessage: 'Goodbye' },
        },
        duration: 150,
        isChanged: true,
      });

      const plugin = formatjs(userConfig) as unknown as PluginReturn;
      const viteConfig = { command: 'serve' } as ResolvedConfig;

      // 1. 配置解析
      plugin.configResolved(viteConfig);

      // 2. 构建开始
      await plugin.buildStart();

      // 3. 热更新
      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      // 4. 构建结束
      plugin.buildEnd();

      // 验证完整流程
      expect(mockedResolveConfig).toHaveBeenCalledWith(userConfig);
      expect(mockedExtractMessages).toHaveBeenCalledTimes(2); // buildStart + hotUpdate
      expect(mockedLogger.success).toHaveBeenCalledWith(
        '构建开始时提取消息完成，耗时 150ms'
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        '检测到消息变化，重新提取消息，耗时 150ms'
      );
      expect(mockServer.ws.send).toHaveBeenCalledWith({
        type: 'full-reload',
        path: '*',
      });
      expect(mockedLogger.debug).toHaveBeenCalledWith('构建结束');
    });

    it('应该正确处理多文件热更新场景', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: true,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: false,
      });

      const plugin = formatjs() as unknown as PluginReturn;

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      // 模拟同时保存多个文件
      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      plugin.handleHotUpdate({
        file: 'src/components/Input.tsx',
        server: mockServer,
      });

      plugin.handleHotUpdate({
        file: 'src/utils/helper.ts',
        server: mockServer,
      });

      // 执行防抖回调
      await debounceCallback!();

      // 验证只执行了一次提取
      expect(mockedExtractMessages).toHaveBeenCalledTimes(1);

      // 验证记录了所有文件
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '防抖提取消息完成',
        expect.objectContaining({
          pendingFiles: [
            'src/components/Button.tsx',
            'src/components/Input.tsx',
            'src/utils/helper.ts',
          ],
        })
      );
    });

    it('应该正确处理错误恢复场景', async () => {
      mockedResolveConfig.mockReturnValue({
        include: ['src/**/*.tsx'],
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const viteConfig = { command: 'build' } as ResolvedConfig;

      // 构建开始时失败
      mockedExtractMessages.mockRejectedValueOnce(
        new Error('Build extract failed')
      );

      plugin.configResolved(viteConfig);
      await plugin.buildStart();

      // 热更新时成功
      mockedIsFileInInclude.mockReturnValue(true);
      mockedExtractMessages.mockResolvedValue({
        messages: { test: { id: 'test', defaultMessage: 'Hello' } },
        duration: 100,
        isChanged: true,
      });

      let debounceCallback: () => Promise<void> | void;
      mockedSetTimeout.mockImplementation(fn => {
        debounceCallback = fn;
        return 'timer-id';
      });

      plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: mockServer,
      });

      await debounceCallback!();

      // 验证错误处理和恢复
      expect(mockedLogger.error).toHaveBeenCalledWith(
        '构建开始时提取消息失败',
        { error: expect.any(Error) as Error }
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        '检测到消息变化，重新提取消息，耗时 100ms'
      );
      expect(mockServer.ws.send).toHaveBeenCalledWith({
        type: 'full-reload',
        path: '*',
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 include 配置', () => {
      mockedResolveConfig.mockReturnValue({
        include: [],
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const result = plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: {} as ViteDevServer,
      });

      expect(mockedIsFileInInclude).toHaveBeenCalledWith(
        'src/components/Button.tsx',
        []
      );
      expect(result).toBeUndefined();
    });

    it('应该处理未定义的 include 配置', () => {
      mockedResolveConfig.mockReturnValue({
        include: undefined,
        outFile: 'messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[hash]',
        throws: true,
      });

      const plugin = formatjs() as unknown as PluginReturn;
      const result = plugin.handleHotUpdate({
        file: 'src/components/Button.tsx',
        server: {} as ViteDevServer,
      });

      expect(mockedIsFileInInclude).toHaveBeenCalledWith(
        'src/components/Button.tsx',
        []
      );
      expect(result).toBeUndefined();
    });

    it('应该处理快速连续的构建结束调用', () => {
      const plugin = formatjs() as unknown as PluginReturn;

      plugin.buildEnd();
      plugin.buildEnd();
      plugin.buildEnd();

      // 不应该抛出错误
      expect(mockedClearTimeout).not.toHaveBeenCalled();
    });
  });
});
