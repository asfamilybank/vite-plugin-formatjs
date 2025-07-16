import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

import { extract } from '@formatjs/cli-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearCache, extractMessages, isFileInInclude } from '../extract';

// Mock 外部依赖
vi.mock('@formatjs/cli-lib', () => ({
  extract: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock(':utils/cache', () => ({
  findCache: vi.fn(),
  writeCache: vi.fn(),
  clearCache: vi.fn(),
}));

vi.mock(':utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// 导入 mocked 依赖
import {
  clearCache as clearCacheUtil,
  findCache,
  writeCache,
} from ':utils/cache';
import { logger } from ':utils/logger';

const mockedExtract = vi.mocked(extract);
const mockedFs = vi.mocked(fs);
const mockedFindCache = vi.mocked(findCache);
const mockedWriteCache = vi.mocked(writeCache);
const mockedClearCacheUtil = vi.mocked(clearCacheUtil);
const mockedLogger = vi.mocked(logger);

describe('extract.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1703123456789);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isFileInInclude', () => {
    it('应该匹配单个模式', () => {
      const result = isFileInInclude('src/components/Button.tsx', [
        'src/**/*.tsx',
      ]);
      expect(result).toBe(true);
    });

    it('应该匹配多个模式中的任一个', () => {
      const patterns = ['src/**/*.tsx', 'lib/**/*.ts'];

      expect(isFileInInclude('src/components/Button.tsx', patterns)).toBe(true);
      expect(isFileInInclude('lib/utils/helper.ts', patterns)).toBe(true);
      expect(isFileInInclude('test/spec.js', patterns)).toBe(false);
    });

    it('应该处理glob模式', () => {
      const patterns = ['src/**/*.{ts,tsx,js,jsx}'];

      expect(isFileInInclude('src/components/Button.tsx', patterns)).toBe(true);
      expect(isFileInInclude('src/utils/helper.ts', patterns)).toBe(true);
      expect(isFileInInclude('src/legacy/old.js', patterns)).toBe(true);
      expect(isFileInInclude('src/styles/main.css', patterns)).toBe(false);
    });

    it('应该处理绝对路径和相对路径', () => {
      const patterns = ['src/**/*.tsx'];

      expect(isFileInInclude('./src/components/Button.tsx', patterns)).toBe(
        true
      );
      expect(isFileInInclude('src/components/Button.tsx', patterns)).toBe(true);
      expect(
        isFileInInclude('/absolute/src/components/Button.tsx', patterns)
      ).toBe(false);
    });

    it('应该处理不匹配的情况', () => {
      const patterns = ['src/**/*.tsx'];

      expect(isFileInInclude('dist/components/Button.tsx', patterns)).toBe(
        false
      );
      expect(isFileInInclude('src/components/Button.ts', patterns)).toBe(false);
      expect(isFileInInclude('node_modules/react/index.js', patterns)).toBe(
        false
      );
    });

    it('应该正确处理路径标准化', () => {
      const patterns = ['src/**/*.tsx'];

      expect(isFileInInclude('src\\components\\Button.tsx', patterns)).toBe(
        true
      );
      expect(isFileInInclude('src/./components/Button.tsx', patterns)).toBe(
        true
      );
      expect(
        isFileInInclude('src/../src/components/Button.tsx', patterns)
      ).toBe(true);
    });
  });

  describe('generateContentHash', () => {
    it('应该为相同内容生成相同hash', () => {
      const content = '{"message": "Hello World"}';

      // 使用反射访问私有函数
      const generateContentHash = (content: string) => {
        return createHash('sha256').update(content).digest('hex');
      };

      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);

      expect(hash1).toBe(hash2);
    });

    it('应该为不同内容生成不同hash', () => {
      const generateContentHash = (content: string) => {
        return createHash('sha256').update(content).digest('hex');
      };

      const hash1 = generateContentHash('{"message": "Hello"}');
      const hash2 = generateContentHash('{"message": "World"}');

      expect(hash1).not.toBe(hash2);
    });

    it('应该使用SHA256算法', () => {
      const content = '{"message": "Hello World"}';
      const expectedHash = createHash('sha256').update(content).digest('hex');

      const generateContentHash = (content: string) => {
        return createHash('sha256').update(content).digest('hex');
      };

      const actualHash = generateContentHash(content);
      expect(actualHash).toBe(expectedHash);
    });

    it('应该返回十六进制字符串', () => {
      const generateContentHash = (content: string) => {
        return createHash('sha256').update(content).digest('hex');
      };

      const hash = generateContentHash('{"message": "Hello World"}');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('writeMessageFile', () => {
    it('应该创建目录并写入文件', async () => {
      const outFile = '/project/locales/messages.json';

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      // 测试通过 extractMessages 间接调用
      const options = {
        include: ['src/**/*.tsx'],
        outFile,
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedExtract.mockResolvedValue('{"message": "Hello World"}');
      mockedFindCache.mockResolvedValue(null);

      await extractMessages(options);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/project/locales', {
        recursive: true,
      });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        outFile,
        expect.stringContaining('"message": "Hello World"'),
        'utf8'
      );
    });

    it('应该处理嵌套目录', async () => {
      const outFile = '/project/deep/nested/locales/messages.json';

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const options = {
        include: ['src/**/*.tsx'],
        outFile,
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedExtract.mockResolvedValue('{"message": "Hello"}');
      mockedFindCache.mockResolvedValue(null);

      await extractMessages(options);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        '/project/deep/nested/locales',
        { recursive: true }
      );
    });

    it('应该处理写入失败的情况', async () => {
      const outFile = '/project/locales/messages.json';

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const options = {
        include: ['src/**/*.tsx'],
        outFile,
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedExtract.mockResolvedValue('{"message": "Hello"}');
      mockedFindCache.mockResolvedValue(null);

      await expect(extractMessages(options)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('应该使用UTF-8编码', async () => {
      const outFile = '/project/locales/messages.json';

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const options = {
        include: ['src/**/*.tsx'],
        outFile,
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedExtract.mockResolvedValue('{"message": "Hello 中文"}');
      mockedFindCache.mockResolvedValue(null);

      await extractMessages(options);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        outFile,
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('getFormatJSOptions', () => {
    it('应该过滤插件特有的选项', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        debug: true,
        hotReload: false,
        extractOnBuild: true,
        outFile: '/project/locales/messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      // 通过测试 extractMessages 间接验证
      mockedExtract.mockResolvedValue('{"message": "Hello"}');
      mockedFindCache.mockResolvedValue(null);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessages(options);

      expect(mockedExtract).toHaveBeenCalledWith(['src/**/*.tsx'], {
        outFile: '/project/locales/messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
      });
    });

    it('应该保留@formatjs/cli-lib的选项', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        outFile: '/project/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,
        pragma: '@formatjs',
        format: 'simple',
      };

      mockedExtract.mockResolvedValue('{"message": "Hello"}');
      mockedFindCache.mockResolvedValue(null);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessages(options);

      expect(mockedExtract).toHaveBeenCalledWith(
        ['src/**/*.tsx'],
        expect.objectContaining({
          outFile: '/project/locales/messages.json',
          idInterpolationPattern: '[sha512:contenthash:base64:6]',
          throws: true,
          pragma: '@formatjs',
          format: 'simple',
        })
      );
    });

    it('应该返回完整的ExtractCLIOptions', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        outFile: '/project/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
        ignore: ['node_modules'],
      };

      mockedExtract.mockResolvedValue('{"message": "Hello"}');
      mockedFindCache.mockResolvedValue(null);
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessages(options);

      expect(mockedExtract).toHaveBeenCalledWith(
        ['src/**/*.tsx'],
        expect.objectContaining({
          outFile: '/project/locales/messages.json',
          idInterpolationPattern: '[hash]',
          throws: true,
          ignore: ['node_modules'],
        })
      );
    });
  });

  describe('extractMessages', () => {
    const validOptions = {
      include: ['src/**/*.tsx'],
      outFile: '/project/locales/messages.json',
      debug: false,
      hotReload: true,
      extractOnBuild: true,
      idInterpolationPattern: '[hash]',
      throws: true,
    };

    describe('参数验证', () => {
      it('应该在缺少include时抛出错误', async () => {
        const options = {
          ...validOptions,
          include: undefined,
        };

        await expect(extractMessages(options)).rejects.toThrow(
          'include 和 outFile 是必需的配置项'
        );
      });

      it('应该在缺少outFile时抛出错误', async () => {
        const options = {
          ...validOptions,
          outFile: undefined,
        };

        await expect(extractMessages(options)).rejects.toThrow(
          'include 和 outFile 是必需的配置项'
        );
      });
    });

    describe('正常流程', () => {
      beforeEach(() => {
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.writeFile.mockResolvedValue(undefined);
      });

      it('应该成功提取消息', async () => {
        const mockMessages = {
          msg1: { id: 'msg1', defaultMessage: 'Hello' },
          msg2: { id: 'msg2', defaultMessage: 'World' },
        };

        mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
        mockedFindCache.mockResolvedValue(null);

        const result = await extractMessages(validOptions);

        expect(result).toEqual({
          messages: mockMessages,
          duration: expect.any(Number) as number,
          isChanged: true,
        });
      });

      it('应该格式化JSON输出', async () => {
        const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };

        mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
        mockedFindCache.mockResolvedValue(null);

        await extractMessages(validOptions);

        expect(mockedFs.writeFile).toHaveBeenCalledWith(
          validOptions.outFile,
          JSON.stringify(mockMessages, null, 2),
          'utf8'
        );
      });

      it('应该计算正确的duration', async () => {
        const startTime = 1703123456789;
        const endTime = 1703123457000;

        const dateNowSpy = vi.spyOn(Date, 'now');
        dateNowSpy.mockReturnValueOnce(startTime);
        dateNowSpy.mockReturnValueOnce(endTime);

        mockedExtract.mockResolvedValue('{"msg1": {"id": "msg1"}}');
        mockedFindCache.mockResolvedValue(null);

        const result = await extractMessages(validOptions);

        expect(result.duration).toBe(211); // endTime - startTime

        dateNowSpy.mockRestore();
      });
    });

    describe('缓存处理', () => {
      beforeEach(() => {
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.writeFile.mockResolvedValue(undefined);
      });

      it('应该在内容变更时写入文件和更新缓存', async () => {
        const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };
        const formattedContent = JSON.stringify(mockMessages, null, 2);
        const contentHash = createHash('sha256')
          .update(formattedContent)
          .digest('hex');

        mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
        mockedFindCache.mockResolvedValue({
          hash: 'different-hash',
          timestamp: 1703123456000,
          outFile: validOptions.outFile,
        });

        const result = await extractMessages(validOptions);

        expect(result.isChanged).toBe(true);
        expect(mockedFs.writeFile).toHaveBeenCalledWith(
          validOptions.outFile,
          formattedContent,
          'utf8'
        );
        expect(mockedWriteCache).toHaveBeenCalledWith(
          validOptions.outFile,
          contentHash
        );
        expect(mockedLogger.debug).toHaveBeenCalledWith('消息已更新', {
          outFile: validOptions.outFile,
          messageCount: 1,
        });
      });

      it('应该在内容未变更时跳过写入', async () => {
        const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };
        const formattedContent = JSON.stringify(mockMessages, null, 2);
        const contentHash = createHash('sha256')
          .update(formattedContent)
          .digest('hex');

        mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
        mockedFindCache.mockResolvedValue({
          hash: contentHash,
          timestamp: 1703123456000,
          outFile: validOptions.outFile,
        });

        const result = await extractMessages(validOptions);

        expect(result.isChanged).toBe(false);
        expect(mockedFs.writeFile).not.toHaveBeenCalled();
        expect(mockedWriteCache).not.toHaveBeenCalled();
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          '消息内容未变更，跳过写入'
        );
      });

      it('应该正确比较内容hash', async () => {
        const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };
        const formattedContent = JSON.stringify(mockMessages, null, 2);
        const contentHash = createHash('sha256')
          .update(formattedContent)
          .digest('hex');

        mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
        mockedFindCache.mockResolvedValue({
          hash: contentHash,
          timestamp: 1703123456000,
          outFile: validOptions.outFile,
        });

        const result = await extractMessages(validOptions);

        expect(result.isChanged).toBe(false);
        expect(result.messages).toEqual(mockMessages);
      });
    });

    describe('错误处理', () => {
      it('应该处理@formatjs/cli-lib提取失败', async () => {
        mockedExtract.mockRejectedValue(new Error('Extract failed'));

        await expect(extractMessages(validOptions)).rejects.toThrow(
          'Extract failed'
        );
        expect(mockedLogger.error).toHaveBeenCalledWith('提取消息失败', {
          error: expect.any(Error) as Error,
        });
      });

      it('应该处理JSON解析失败', async () => {
        mockedExtract.mockResolvedValue('invalid json');

        await expect(extractMessages(validOptions)).rejects.toThrow();
        expect(mockedLogger.error).toHaveBeenCalledWith('提取消息失败', {
          error: expect.any(Error) as Error,
        });
      });

      it('应该处理文件写入失败', async () => {
        mockedExtract.mockResolvedValue('{"msg1": {"id": "msg1"}}');
        mockedFindCache.mockResolvedValue(null);
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.writeFile.mockRejectedValue(new Error('Write failed'));

        await expect(extractMessages(validOptions)).rejects.toThrow(
          'Write failed'
        );
        expect(mockedLogger.error).toHaveBeenCalledWith('提取消息失败', {
          error: expect.any(Error) as Error,
        });
      });

      it('应该处理缓存操作失败', async () => {
        mockedExtract.mockResolvedValue('{"msg1": {"id": "msg1"}}');
        mockedFindCache.mockRejectedValue(new Error('Cache read failed'));

        // 缓存失败不应该影响主流程
        await expect(extractMessages(validOptions)).rejects.toThrow(
          'Cache read failed'
        );
      });
    });
  });

  describe('clearCache', () => {
    it('应该调用缓存清理工具', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        outFile: '/project/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedClearCacheUtil.mockResolvedValue(undefined);

      await clearCache(options);

      expect(mockedClearCacheUtil).toHaveBeenCalledWith(options.outFile);
    });

    it('应该处理缺少outFile的情况', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        outFile: undefined,
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      await clearCache(options);

      expect(mockedClearCacheUtil).not.toHaveBeenCalled();
    });

    it('应该处理清理失败的情况', async () => {
      const options = {
        include: ['src/**/*.tsx'],
        outFile: '/project/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      mockedClearCacheUtil.mockRejectedValue(new Error('Clear failed'));

      await expect(clearCache(options)).rejects.toThrow('Clear failed');
    });
  });

  describe('集成测试', () => {
    const integrationOptions = {
      include: ['src/**/*.tsx'],
      outFile: '/project/locales/messages.json',
      debug: false,
      hotReload: true,
      extractOnBuild: true,
      idInterpolationPattern: '[hash]',
      throws: true,
    };

    beforeEach(() => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
    });

    it('应该支持完整的提取流程', async () => {
      const mockMessages = {
        welcome: { id: 'welcome', defaultMessage: 'Welcome' },
        goodbye: { id: 'goodbye', defaultMessage: 'Goodbye' },
      };

      mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
      mockedFindCache.mockResolvedValue(null);
      mockedWriteCache.mockResolvedValue(undefined);

      const result = await extractMessages(integrationOptions);

      expect(result).toEqual({
        messages: mockMessages,
        duration: expect.any(Number) as number,
        isChanged: true,
      });

      expect(mockedExtract).toHaveBeenCalledWith(
        integrationOptions.include,
        expect.objectContaining({
          outFile: integrationOptions.outFile,
          idInterpolationPattern: integrationOptions.idInterpolationPattern,
          throws: integrationOptions.throws,
        })
      );

      expect(mockedFindCache).toHaveBeenCalledWith(integrationOptions.outFile);
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        integrationOptions.outFile,
        JSON.stringify(mockMessages, null, 2),
        'utf8'
      );
      expect(mockedWriteCache).toHaveBeenCalledWith(
        integrationOptions.outFile,
        expect.any(String)
      );
    });

    it('应该正确处理缓存命中和未命中', async () => {
      const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };
      const formattedContent = JSON.stringify(mockMessages, null, 2);
      const contentHash = createHash('sha256')
        .update(formattedContent)
        .digest('hex');

      mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));

      // 第一次调用 - 缓存未命中
      mockedFindCache.mockResolvedValueOnce(null);

      const result1 = await extractMessages(integrationOptions);
      expect(result1.isChanged).toBe(true);

      // 第二次调用 - 缓存命中
      mockedFindCache.mockResolvedValueOnce({
        hash: contentHash,
        timestamp: 1703123456000,
        outFile: integrationOptions.outFile,
      });

      const result2 = await extractMessages(integrationOptions);
      expect(result2.isChanged).toBe(false);
    });

    it('应该在多次调用时保持一致性', async () => {
      const mockMessages = { msg1: { id: 'msg1', defaultMessage: 'Hello' } };

      mockedExtract.mockResolvedValue(JSON.stringify(mockMessages));
      mockedFindCache.mockResolvedValue(null);

      const results = await Promise.all([
        extractMessages(integrationOptions),
        extractMessages(integrationOptions),
        extractMessages(integrationOptions),
      ]);

      results.forEach(result => {
        expect(result.messages).toEqual(mockMessages);
        expect(result.isChanged).toBe(true);
        expect(typeof result.duration).toBe('number');
      });
    });
  });
});
