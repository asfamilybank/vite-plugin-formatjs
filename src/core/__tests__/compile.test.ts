import { promises as fs, PathLike } from 'node:fs';

import { compile } from '@formatjs/cli-lib';
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
  generateOutputPath,
  isMessageFile,
} from '../compile';
import type { FormatJSPluginOptions } from '../types';

// Mock external dependencies
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('@formatjs/cli-lib', () => ({
  compile: vi.fn(),
}));

vi.mock(':utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedFs = vi.mocked(
  fs as unknown as typeof fs & {
    readdir: MockedFunction<(path: PathLike) => Promise<string[]>>;
  }
);
const mockedCompile = vi.mocked(compile);

describe('compile.ts', () => {
  const mockOptions: FormatJSPluginOptions = {
    include: ['src/**/*.ts'],
    outFile: 'lang/messages.json',
    compileFolder: 'dist/lang',
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isMessageFile', () => {
    it('应该正确识别消息文件', () => {
      const result = isMessageFile('lang/en.json', mockOptions);
      expect(result).toBe(true);
    });

    it('应该忽略主消息文件', () => {
      const result = isMessageFile('lang/messages.json', mockOptions);
      expect(result).toBe(false);
    });

    it('应该忽略非JSON文件', () => {
      const result = isMessageFile('lang/en.txt', mockOptions);
      expect(result).toBe(false);
    });

    it('应该忽略其他目录的文件', () => {
      const result = isMessageFile('src/en.json', mockOptions);
      expect(result).toBe(false);
    });

    it('应该在缺少outFile时返回false', () => {
      const options = { ...mockOptions, outFile: undefined };
      const result = isMessageFile('lang/en.json', options);
      expect(result).toBe(false);
    });
  });

  describe('generateOutputPath', () => {
    it('应该生成正确的输出路径', () => {
      const result = generateOutputPath('lang/en.json', mockOptions);
      expect(result).toBe('dist/lang/en.json');
    });

    it('应该在缺少compileFolder时抛出错误', () => {
      const options = { ...mockOptions, compileFolder: undefined };
      expect(() => generateOutputPath('lang/en.json', options)).toThrow(
        'compileFolder 配置是必需的'
      );
    });
  });

  describe('findMessageFiles', () => {
    it('应该找到有效的消息文件', async () => {
      const mockFiles = ['en.json', 'zh.json', 'messages.json', 'invalid.txt'];
      mockedFs.readdir.mockResolvedValue(mockFiles);

      // Mock valid JSON files
      mockedFs.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('en.json') || filePath.includes('zh.json')) {
          return Promise.resolve('{"hello": "world"}');
        }
        return Promise.resolve('invalid json');
      });

      const result = await findMessageFiles('lang', mockOptions);

      expect(result).toEqual(['lang/en.json', 'lang/zh.json']);
    });

    it('应该忽略无效的JSON文件', async () => {
      const mockFiles = ['en.json', 'invalid.json'];
      mockedFs.readdir.mockResolvedValue(mockFiles);

      mockedFs.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('en.json')) {
          return Promise.resolve('{"hello": "world"}');
        }
        return Promise.reject(new Error('Invalid JSON'));
      });

      const result = await findMessageFiles('lang', mockOptions);

      expect(result).toEqual(['lang/en.json']);
    });

    it('应该在读取目录失败时抛出错误', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(findMessageFiles('lang', mockOptions)).rejects.toThrow(
        '无法读取消息目录 lang'
      );
    });
  });

  describe('compileMessageFile', () => {
    it('应该成功编译消息文件', async () => {
      const messageFile = 'lang/en.json';
      const compiledContent = 'compiled content';

      mockedFs.access.mockResolvedValue(undefined);
      mockedCompile.mockResolvedValue(compiledContent);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await compileMessageFile(messageFile, mockOptions);

      expect(result).toEqual({
        messageFile,
        outFile: 'dist/lang/en.json',
        duration: expect.any(Number) as number,
        success: true,
      });

      expect(mockedCompile).toHaveBeenCalledWith(
        [messageFile],
        expect.any(Object)
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        'dist/lang/en.json',
        compiledContent,
        'utf8'
      );
    });

    it('应该在文件不存在时返回失败结果', async () => {
      const messageFile = 'lang/en.json';

      mockedFs.access.mockRejectedValue(new Error('File not found'));

      const result = await compileMessageFile(messageFile, mockOptions);

      expect(result).toEqual({
        messageFile,
        outFile: 'dist/lang/en.json',
        duration: expect.any(Number) as number,
        success: false,
      });
    });

    it('应该在编译失败时返回失败结果', async () => {
      const messageFile = 'lang/en.json';

      mockedFs.access.mockResolvedValue(undefined);
      mockedCompile.mockRejectedValue(new Error('Compile failed'));

      const result = await compileMessageFile(messageFile, mockOptions);

      expect(result).toEqual({
        messageFile,
        outFile: 'dist/lang/en.json',
        duration: expect.any(Number) as number,
        success: false,
      });
    });
  });

  describe('compileMessages', () => {
    it('应该成功编译所有消息文件', async () => {
      const mockFiles = ['en.json', 'zh.json'];
      mockedFs.readdir.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue('{"hello": "world"}');
      mockedFs.access.mockResolvedValue(undefined);
      mockedCompile.mockResolvedValue('compiled content');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await compileMessages(mockOptions);

      expect(result).toEqual({
        results: [
          {
            messageFile: 'lang/en.json',
            outFile: 'dist/lang/en.json',
            duration: expect.any(Number) as number,
            success: true,
          },
          {
            messageFile: 'lang/zh.json',
            outFile: 'dist/lang/zh.json',
            duration: expect.any(Number) as number,
            success: true,
          },
        ],
        duration: expect.any(Number) as number,
        compiledCount: 2,
      });
    });

    it('应该在没有消息文件时返回空结果', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const result = await compileMessages(mockOptions);

      expect(result).toEqual({
        results: [],
        duration: expect.any(Number) as number,
        compiledCount: 0,
      });
    });

    it('应该在缺少compileFolder时抛出错误', async () => {
      const options = { ...mockOptions, compileFolder: undefined };

      await expect(compileMessages(options)).rejects.toThrow(
        'compileFolder 配置是必需的'
      );
    });

    it('应该在缺少outFile时抛出错误', async () => {
      const options = { ...mockOptions, outFile: undefined };

      await expect(compileMessages(options)).rejects.toThrow(
        'outFile 配置是必需的'
      );
    });
  });
});
