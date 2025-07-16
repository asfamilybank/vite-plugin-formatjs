import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllCache,
  clearCache,
  findCache,
  getCacheDir,
  getCacheFileName,
  getCacheStats,
  getOutFileHash,
  writeCache,
} from '../cache';
import { PLUGIN_NAME } from '../constant';

// Mock fs 模块
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

// Mock process.cwd
const originalCwd = process.cwd;
beforeEach(() => {
  vi.clearAllMocks();
  process.cwd = vi.fn().mockReturnValue('/test/project');
});

afterEach(() => {
  process.cwd = originalCwd;
});

describe('cache.ts', () => {
  describe('getCacheDir', () => {
    it('应该返回正确的缓存目录路径', () => {
      const result = getCacheDir();
      expect(result).toBe(`/test/project/node_modules/.cache/${PLUGIN_NAME}`);
    });

    it('应该使用当前工作目录', () => {
      process.cwd = vi.fn().mockReturnValue('/different/path');
      const result = getCacheDir();
      expect(result).toBe(`/different/path/node_modules/.cache/${PLUGIN_NAME}`);
    });
  });

  describe('getOutFileHash', () => {
    it('应该为相同的绝对路径返回相同的hash', () => {
      const outFile = '/project/locales/messages.json';
      const hash1 = getOutFileHash(outFile);
      const hash2 = getOutFileHash(outFile);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
    });

    it('应该为不同的路径返回不同的hash', () => {
      const outFile1 = '/project/locales/messages.json';
      const outFile2 = '/project/locales/errors.json';

      const hash1 = getOutFileHash(outFile1);
      const hash2 = getOutFileHash(outFile2);

      expect(hash1).not.toBe(hash2);
    });

    it('应该将相对路径转换为绝对路径进行hash', () => {
      const relativeFile = './locales/messages.json';
      const absoluteFile = path.resolve(relativeFile);

      const hash1 = getOutFileHash(relativeFile);
      const hash2 = getOutFileHash(absoluteFile);

      expect(hash1).toBe(hash2);
    });

    it('应该生成MD5 hash的前8位', () => {
      const outFile = '/project/locales/messages.json';
      const absolutePath = path.resolve(outFile);
      const expectedHash = createHash('md5')
        .update(absolutePath)
        .digest('hex')
        .slice(0, 8);

      const result = getOutFileHash(outFile);
      expect(result).toBe(expectedHash);
    });
  });

  describe('getCacheFileName', () => {
    it('应该生成正确格式的缓存文件名', () => {
      const outFile = '/project/locales/messages.json';
      const contentHash = 'abcdef1234567890';

      // Mock Date.now 确保测试的确定性
      const mockTimestamp = 1703123456789;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const result = getCacheFileName(outFile, contentHash);

      expect(result).toMatch(
        /^extract-[a-f0-9]{8}-1703123456789-abcdef12\.cache$/
      );
    });

    it('应该截取contentHash的前8位', () => {
      const outFile = '/project/locales/messages.json';
      const contentHash = 'verylongcontenthash1234567890';

      const mockTimestamp = 1703123456789;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const result = getCacheFileName(outFile, contentHash);

      expect(result).toContain('verylong'); // 前8位
      expect(result).not.toContain('verylongcontenthash'); // 不包含完整hash
    });

    it('应该包含outFile的hash', () => {
      const outFile = '/project/locales/messages.json';
      const contentHash = 'abcdef1234567890';
      const expectedOutFileHash = getOutFileHash(outFile);

      const result = getCacheFileName(outFile, contentHash);

      expect(result).toContain(expectedOutFileHash);
    });
  });

  describe('findCache', () => {
    it('应该在没有缓存文件时返回null', async () => {
      const mocked = vi.mocked(fs.readdir);
      mocked.mockResolvedValue([]);

      const result = await findCache('/project/locales/messages.json');

      expect(result).toBeNull();
    });

    it('应该在缓存目录不存在时返回null', async () => {
      const mocked = vi.mocked(fs.readdir);
      mocked.mockRejectedValue(new Error('Directory not found'));

      const result = await findCache('/project/locales/messages.json');

      expect(result).toBeNull();
    });

    it('应该找到匹配的缓存文件并返回信息', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const cacheFiles = [
        `extract-${outFileHash}-1703123456789-abcdef12.cache`,
        `extract-${outFileHash}-1703123456790-abcdef34.cache`,
        'extract-different-hash-123.cache',
      ];

      const mocked = vi.mocked(fs.readdir);
      mocked.mockResolvedValue(cacheFiles as never[]);

      const result = await findCache(outFile);

      expect(result).toEqual({
        hash: 'abcdef34', // 最新的文件
        timestamp: 1703123456790,
        outFile,
      });
    });

    it('应该返回最新的缓存文件', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const cacheFiles = [
        `extract-${outFileHash}-1703123456788-abc12345.cache`,
        `extract-${outFileHash}-1703123456790-def67890.cache`,
        `extract-${outFileHash}-1703123456789-bcd34567.cache`,
      ];

      const mocked = vi.mocked(fs.readdir);
      mocked.mockResolvedValue(cacheFiles as never[]);

      const result = await findCache(outFile);

      expect(result?.hash).toBe('def67890');
      expect(result?.timestamp).toBe(1703123456790);
    });

    it('应该忽略格式不正确的缓存文件', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const cacheFiles = [
        `extract-${outFileHash}-invalid.cache`,
        `extract-${outFileHash}-1703123456789-abc12345.cache`,
      ];

      const mocked = vi.mocked(fs.readdir);
      mocked.mockResolvedValue(cacheFiles as never[]);

      const result = await findCache(outFile);

      expect(result).toEqual({
        hash: 'abc12345',
        timestamp: 1703123456789,
        outFile,
      });
    });
  });

  describe('writeCache', () => {
    it('应该创建缓存目录', async () => {
      const mocked = vi.mocked(fs.mkdir);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await writeCache('/project/locales/messages.json', 'abcdef123456');

      expect(mocked).toHaveBeenCalledWith(
        `/test/project/node_modules/.cache/${PLUGIN_NAME}`,
        { recursive: true }
      );
    });

    it('应该清理旧的缓存文件', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const oldCacheFiles = [
        `extract-${outFileHash}-1703123456788-old12345.cache`,
        `extract-${outFileHash}-1703123456789-old67890.cache`,
      ];

      vi.mocked(fs.readdir).mockResolvedValue(oldCacheFiles as never[]);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await writeCache(outFile, 'newcontent123');

      expect(vi.mocked(fs.unlink)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(
        expect.stringContaining(oldCacheFiles[0])
      );
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(
        expect.stringContaining(oldCacheFiles[1])
      );
    });

    it('应该创建新的缓存文件', async () => {
      const outFile = '/project/locales/messages.json';
      const contentHash = 'abcdef123456';

      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Mock Date.now 确保测试的确定性
      const mockTimestamp = 1703123456789;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await writeCache(outFile, contentHash);

      const expectedFileName = getCacheFileName(outFile, contentHash);
      const expectedPath = path.join(getCacheDir(), expectedFileName);

      expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
        expectedPath,
        '',
        'utf8'
      );
    });

    it('应该处理清理失败的情况', async () => {
      const outFile = '/project/locales/messages.json';

      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read failed'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // 不应该抛出错误
      await expect(writeCache(outFile, 'hash123')).resolves.toBeUndefined();
    });

    it('应该处理写入失败的情况', async () => {
      const outFile = '/project/locales/messages.json';

      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      // 不应该抛出错误
      await expect(writeCache(outFile, 'hash123')).resolves.toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('应该删除指定outFile的所有缓存文件', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const cacheFiles = [
        `extract-${outFileHash}-1703123456789-abcdef12.cache`,
        `extract-${outFileHash}-1703123456790-123456ab.cache`,
        'extract-different-hash3-789.cache',
      ];

      vi.mocked(fs.readdir).mockResolvedValue(cacheFiles as never[]);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await clearCache(outFile);

      expect(vi.mocked(fs.unlink)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(fs.unlink)).not.toHaveBeenCalledWith(
        expect.stringContaining('different')
      );
    });

    it('应该处理目录不存在的情况', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Directory not found'));

      // 不应该抛出错误
      await expect(
        clearCache('/project/locales/messages.json')
      ).resolves.toBeUndefined();
    });

    it('应该处理单个文件删除失败的情况', async () => {
      const outFile = '/project/locales/messages.json';
      const outFileHash = getOutFileHash(outFile);
      const cacheFiles = [
        `extract-${outFileHash}-1703123456789-abcdef12.cache`,
      ];

      vi.mocked(fs.readdir).mockResolvedValue(cacheFiles as never[]);
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Delete failed'));

      // 不应该抛出错误
      await expect(clearCache(outFile)).resolves.toBeUndefined();
    });
  });

  describe('clearAllCache', () => {
    it('应该删除整个缓存目录', async () => {
      vi.mocked(fs.rmdir).mockResolvedValue(undefined);

      await clearAllCache();

      expect(vi.mocked(fs.rmdir)).toHaveBeenCalledWith(
        `/test/project/node_modules/.cache/${PLUGIN_NAME}`,
        { recursive: true }
      );
    });

    it('应该处理目录不存在的情况', async () => {
      vi.mocked(fs.rmdir).mockRejectedValue(new Error('Directory not found'));

      // 不应该抛出错误
      await expect(clearAllCache()).resolves.toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('应该返回缓存统计信息', async () => {
      const cacheFiles = [
        'extract-hash1abc-1703123456789-abcdef12.cache',
        'extract-hash2def-1703123456790-123456ab.cache',
        'other-file.txt',
      ];

      vi.mocked(fs.readdir).mockResolvedValue(cacheFiles as never[]);
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as never);

      const result = await getCacheStats();

      expect(result).toEqual({
        totalFiles: 2,
        totalSize: 200,
        files: [
          'extract-hash1abc-1703123456789-abcdef12.cache',
          'extract-hash2def-1703123456790-123456ab.cache',
        ],
      });
    });

    it('应该处理目录不存在的情况', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Directory not found'));

      const result = await getCacheStats();

      expect(result).toEqual({
        totalFiles: 0,
        totalSize: 0,
        files: [],
      });
    });

    it('应该处理单个文件stat失败的情况', async () => {
      const cacheFiles = [
        'extract-hash1abc-1703123456789-abcdef12.cache',
        'extract-hash2def-1703123456790-123456ab.cache',
      ];

      vi.mocked(fs.readdir).mockResolvedValue(cacheFiles as never[]);
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 100 } as never)
        .mockRejectedValueOnce(new Error('Stat failed'));

      const result = await getCacheStats();

      expect(result).toEqual({
        totalFiles: 2,
        totalSize: 100, // 只计算成功的文件
        files: cacheFiles,
      });
    });

    it('应该只统计缓存文件', async () => {
      const files = [
        'extract-hash1abc-1703123456789-abcdef12.cache',
        'some-other-file.txt',
        'extract-hash2def-1703123456790-123456ab.cache',
        'readme.md',
      ];

      vi.mocked(fs.readdir).mockResolvedValue(files as never[]);
      vi.mocked(fs.stat).mockResolvedValue({ size: 50 } as never);

      const result = await getCacheStats();

      expect(result.totalFiles).toBe(2);
      expect(result.files).toEqual([
        'extract-hash1abc-1703123456789-abcdef12.cache',
        'extract-hash2def-1703123456790-123456ab.cache',
      ]);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的缓存生命周期', async () => {
      const outFile = '/project/locales/messages.json';
      const contentHash = 'abcdef123456';

      // Mock 所有必要的fs操作
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // 1. 写入缓存
      await writeCache(outFile, contentHash);

      // 2. 模拟缓存文件存在
      const outFileHash = getOutFileHash(outFile);
      const cacheFileName = `extract-${outFileHash}-1703123456789-${contentHash.slice(0, 8)}.cache`;
      vi.mocked(fs.readdir).mockResolvedValue([cacheFileName] as never[]);

      // 3. 查找缓存
      const mockTimestamp = 1703123456789;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const foundCache = await findCache(outFile);
      expect(foundCache?.hash).toBe(contentHash.slice(0, 8));

      // 4. 清除缓存
      await clearCache(outFile);
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(
        expect.stringContaining(cacheFileName)
      );
    });

    it('应该正确处理多个outFile的缓存', async () => {
      const outFile1 = '/project/locales/messages.json';
      const outFile2 = '/project/locales/errors.json';
      const hash1 = getOutFileHash(outFile1);
      const hash2 = getOutFileHash(outFile2);

      const cacheFiles = [
        `extract-${hash1}-1703123456789-abcdef12.cache`,
        `extract-${hash2}-1703123456790-123456ab.cache`,
      ];

      vi.mocked(fs.readdir).mockResolvedValue(cacheFiles as never[]);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      // 清除第一个文件的缓存
      await clearCache(outFile1);

      // 应该只删除第一个文件的缓存
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(
        expect.stringContaining(hash1)
      );
      expect(vi.mocked(fs.unlink)).not.toHaveBeenCalledWith(
        expect.stringContaining(hash2)
      );
    });
  });
});
