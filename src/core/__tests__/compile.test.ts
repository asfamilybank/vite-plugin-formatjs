import { promises as fs, PathLike } from 'node:fs';

import { compile, compileAndWrite } from '@formatjs/cli-lib';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockedFunction,
  vi,
} from 'vitest';

import {
  compileMessageFile,
  compileMessages,
  findMessageFiles,
  isMessageFile,
} from '../compile';

// 导入 mocked 依赖
import type { CompileOptions, VitePluginFormatJSOptions } from ':core/types';
import { logger } from ':utils/logger';

// Mock 外部依赖
vi.mock('@formatjs/cli-lib', () => ({
  compile: vi.fn(),
  compileAndWrite: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock(':utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

const mockedFs = vi.mocked(
  fs as unknown as typeof fs & {
    readdir: MockedFunction<(path: PathLike) => Promise<string[]>>;
  }
);
const mockedCompile = vi.mocked(compile);
const mockedCompileAndWrite = vi.mocked(compileAndWrite);
const mockedLogger = vi.mocked(logger);

describe('compile.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isMessageFile 函数', () => {
    const mockConfig: VitePluginFormatJSOptions = {
      extract: {
        include: ['src/**/*.ts'],
        outFile: 'src/lang/en.json',
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

    it('应该识别消息目录中的 JSON 文件', () => {
      expect(isMessageFile('src/lang/zh.json', mockConfig)).toBe(true);
      expect(isMessageFile('src/lang/ja.json', mockConfig)).toBe(true);
    });

    it('应该排除不在消息目录中的文件', () => {
      expect(isMessageFile('src/components/Button.tsx', mockConfig)).toBe(
        false
      );
      expect(isMessageFile('dist/lang/zh.json', mockConfig)).toBe(false);
    });

    it('应该排除非 JSON 文件', () => {
      expect(isMessageFile('src/lang/readme.md', mockConfig)).toBe(false);
      expect(isMessageFile('src/lang/config.txt', mockConfig)).toBe(false);
    });

    it('应该排除主消息文件', () => {
      expect(isMessageFile('src/lang/en.json', mockConfig)).toBe(false);
    });

    it('应该在缺少 extract.outFile 时返回 false', () => {
      const configWithoutOutFile = {
        ...mockConfig,
        extract: {
          ...mockConfig.extract,
          outFile: '',
        },
      };
      expect(isMessageFile('src/lang/zh.json', configWithoutOutFile)).toBe(
        false
      );
    });
  });

  describe('findMessageFiles 函数', () => {
    const mockCompileOptions: CompileOptions = {
      inputDir: 'src/lang',
      outputDir: 'src/compiled-lang',
    };

    it('应该找到目录中的所有 JSON 文件', async () => {
      mockedFs.readdir.mockResolvedValue(['zh.json', 'ja.json', 'fr.json']);
      mockedFs.readFile
        .mockResolvedValueOnce('{"msg": "hello"}')
        .mockResolvedValueOnce('{"msg": "こんにちは"}')
        .mockResolvedValueOnce('{"msg": "bonjour"}');

      const files = await findMessageFiles(mockCompileOptions);

      expect(files).toEqual([
        'src/lang/zh.json',
        'src/lang/ja.json',
        'src/lang/fr.json',
      ]);
      expect(mockedFs.readdir).toHaveBeenCalledWith('src/lang');
    });

    it('应该过滤掉无效的 JSON 文件', async () => {
      mockedFs.readdir.mockResolvedValue([
        'valid.json',
        'invalid.json',
        'config.txt',
      ]);
      mockedFs.readFile
        .mockResolvedValueOnce('{"msg": "valid"}')
        .mockRejectedValueOnce(new Error('Invalid JSON'));

      const files = await findMessageFiles(mockCompileOptions);

      expect(files).toEqual(['src/lang/valid.json']);
    });

    it('应该处理空目录', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const files = await findMessageFiles(mockCompileOptions);

      expect(files).toEqual([]);
    });

    it('应该在目录不存在时抛出错误', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(findMessageFiles(mockCompileOptions)).rejects.toThrow(
        '无法读取消息目录 src/lang: Error: Directory not found'
      );
    });
  });

  describe('compileMessageFile 函数', () => {
    const mockCompileOptions: CompileOptions = {
      inputDir: 'src/lang',
      outputDir: 'src/compiled-lang',
    };

    beforeEach(() => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
    });

    it('应该成功编译单个消息文件', async () => {
      const duration = await compileMessageFile(
        'src/lang/zh.json',
        mockCompileOptions
      );

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(mockedCompileAndWrite).toHaveBeenCalledWith(
        ['src/lang/zh.json'],
        {}
      );
    });

    it('应该记录调试信息', async () => {
      mockedCompileAndWrite.mockResolvedValue();

      await compileMessageFile('src/lang/zh.json', mockCompileOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith('开始编译消息文件', {
        messageFile: 'src/lang/zh.json',
        outFile: 'src/compiled-lang/zh.json',
      });
      expect(mockedLogger.debug).toHaveBeenCalledWith('消息文件编译完成', {
        messageFile: 'src/lang/zh.json',
        outFile: 'src/compiled-lang/zh.json',
        duration: expect.any(Number) as number,
      });
    });

    it('应该在文件不存在时记录错误并返回 0', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      const duration = await compileMessageFile(
        'src/lang/missing.json',
        mockCompileOptions
      );

      expect(duration).toBe(0);
      expect(mockedLogger.error).toHaveBeenCalledWith('消息文件编译失败', {
        messageFile: 'src/lang/missing.json',
        outFile: 'src/compiled-lang/missing.json',
        error: expect.any(Error) as Error,
      });
    });

    it('应该在编译失败时记录错误并返回 0', async () => {
      mockedCompileAndWrite.mockRejectedValue(new Error('Compile failed'));

      const duration = await compileMessageFile(
        'src/lang/zh.json',
        mockCompileOptions
      );

      expect(duration).toBe(0);
      expect(mockedLogger.error).toHaveBeenCalledWith('消息文件编译失败', {
        messageFile: 'src/lang/zh.json',
        outFile: 'src/compiled-lang/zh.json',
        error: expect.any(Error) as Error,
      });
    });
  });

  describe('compileMessages 函数', () => {
    const mockCompileOptions: CompileOptions = {
      inputDir: 'src/lang',
      outputDir: 'src/compiled-lang',
    };

    beforeEach(() => {
      mockedFs.readdir.mockResolvedValue(['zh.json', 'ja.json']);
      mockedFs.readFile
        .mockResolvedValueOnce('{"msg": "hello"}')
        .mockResolvedValueOnce('{"msg": "こんにちは"}');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
    });

    it('应该成功编译所有消息文件', async () => {
      mockedCompile
        .mockResolvedValueOnce('{"msg":"hello"}')
        .mockResolvedValueOnce('{"msg":"こんにちは"}');

      const duration = await compileMessages(mockCompileOptions);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(mockedCompile).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockedLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('批量编译完成')
      );
    });

    it('应该记录调试信息', async () => {
      mockedCompile
        .mockResolvedValueOnce('{"msg":"hello"}')
        .mockResolvedValueOnce('{"msg":"こんにちは"}');

      await compileMessages(mockCompileOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '开始批量编译消息文件',
        mockCompileOptions
      );
    });

    it('应该创建输出目录', async () => {
      mockedCompile
        .mockResolvedValueOnce('{"msg":"hello"}')
        .mockResolvedValueOnce('{"msg":"こんにちは"}');

      await compileMessages(mockCompileOptions);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('src/compiled-lang', {
        recursive: true,
      });
    });

    it('应该在编译失败时记录错误并抛出异常', async () => {
      mockedCompile.mockRejectedValue(new Error('Batch compile failed'));

      await expect(compileMessages(mockCompileOptions)).rejects.toThrow(
        'Batch compile failed'
      );
      expect(mockedLogger.error).toHaveBeenCalledWith('批量编译消息文件失败', {
        error: expect.any(Error) as Error,
      });
    });

    it('应该处理空的消息文件目录', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const duration = await compileMessages(mockCompileOptions);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(mockedCompile).not.toHaveBeenCalled();
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });
});
