import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { PLUGIN_NAME } from './constant';
import { logger } from './logger';

/**
 * 缓存记录
 */
export interface CacheRecord {
  hash: string;
  timestamp: number;
  outFile: string;
}

/**
 * 获取缓存目录
 */
export function getCacheDir(): string {
  return path.join(process.cwd(), 'node_modules', '.cache', PLUGIN_NAME);
}

/**
 * 计算 outFile 的 hash
 */
export function getOutFileHash(outFile: string): string {
  // 使用绝对路径确保唯一性
  const absolutePath = path.resolve(outFile);
  return createHash('md5').update(absolutePath).digest('hex').slice(0, 8);
}

/**
 * 生成缓存文件名
 */
export function getCacheFileName(outFile: string, contentHash: string): string {
  const outFileHash = getOutFileHash(outFile);
  const timestamp = Date.now();
  return `extract-${outFileHash}-${timestamp}-${contentHash.slice(0, 8)}.cache`;
}

/**
 * 查找缓存
 */
export async function findCache(outFile: string): Promise<CacheRecord | null> {
  try {
    const cacheDir = getCacheDir();
    const outFileHash = getOutFileHash(outFile);

    // 读取缓存目录
    const files = await fs.readdir(cacheDir);

    // 使用正则表达式过滤符合格式的缓存文件
    // 格式：extract-${outFileHash}-${timestamp}-${contentHash}.cache
    const regex = new RegExp(
      `^extract-${outFileHash}-[0-9]{13}-[a-f0-9]{8}\\.cache$`
    );
    const cacheFiles = files.filter(f => regex.test(f));

    if (cacheFiles.length === 0) {
      return null;
    }

    // 获取最新的缓存文件
    const latestFile = cacheFiles.sort().pop();
    if (!latestFile) {
      return null;
    }

    // 解析文件名获取缓存信息
    const fileName = latestFile.replace('.cache', '');
    const parts = fileName.split('-');
    if (parts.length >= 4 && parts[2] && parts[3]) {
      const timestamp = parts[2];
      const contentHash = parts[3];

      return {
        hash: contentHash,
        timestamp: parseInt(timestamp, 10),
        outFile,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
export async function writeCache(
  outFile: string,
  contentHash: string
): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    const outFileHash = getOutFileHash(outFile);

    // 确保缓存目录存在
    await fs.mkdir(cacheDir, { recursive: true });

    // 清理该 outFile 的旧缓存
    try {
      const files = await fs.readdir(cacheDir);
      const oldCacheFiles = files.filter(f =>
        f.startsWith(`extract-${outFileHash}-`)
      );

      // 删除旧的缓存文件
      await Promise.all(
        oldCacheFiles.map(file =>
          fs.unlink(path.join(cacheDir, file)).catch(() => {})
        )
      );
    } catch {
      // 忽略清理失败
    }

    // 创建新的缓存文件
    const cacheFileName = getCacheFileName(outFile, contentHash);
    const cacheFilePath = path.join(cacheDir, cacheFileName);

    // 创建空文件（文件名即缓存信息）
    await fs.writeFile(cacheFilePath, '', 'utf8');

    logger.debug('缓存已更新', { cacheFile: cacheFileName });
  } catch (error) {
    logger.debug('写入缓存失败', { error });
  }
}

/**
 * 清除指定 outFile 的缓存
 */
export async function clearCache(outFile: string): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    const outFileHash = getOutFileHash(outFile);

    // 删除该 outFile 的所有缓存文件
    const files = await fs.readdir(cacheDir);
    const cacheFiles = files.filter(f =>
      f.startsWith(`extract-${outFileHash}-`)
    );

    await Promise.all(
      cacheFiles.map(file =>
        fs.unlink(path.join(cacheDir, file)).catch(() => {})
      )
    );

    logger.debug('缓存已清除', { clearedFiles: cacheFiles.length });
  } catch {
    // 忽略删除失败，可能目录不存在
  }
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  try {
    const cacheDir = getCacheDir();

    // 删除整个缓存目录
    await fs.rmdir(cacheDir, { recursive: true });

    logger.debug('所有缓存已清除');
  } catch {
    // 忽略删除失败，可能目录不存在
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  files: string[];
}> {
  try {
    const cacheDir = getCacheDir();
    const files = await fs.readdir(cacheDir);
    const cacheFiles = files.filter(
      f => f.startsWith('extract-') && f.endsWith('.cache')
    );

    let totalSize = 0;
    for (const file of cacheFiles) {
      try {
        const stats = await fs.stat(path.join(cacheDir, file));
        totalSize += stats.size;
      } catch {
        // 忽略单个文件统计失败
      }
    }

    return {
      totalFiles: cacheFiles.length,
      totalSize,
      files: cacheFiles,
    };
  } catch {
    return {
      totalFiles: 0,
      totalSize: 0,
      files: [],
    };
  }
}
