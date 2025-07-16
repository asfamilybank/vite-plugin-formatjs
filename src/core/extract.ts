import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import {
  extract,
  type ExtractCLIOptions,
  type MessageDescriptor,
} from '@formatjs/cli-lib';
import { minimatch } from 'minimatch';

import type { FormatJSPluginOptions } from './types';

import {
  clearCache as clearCacheUtil,
  findCache,
  writeCache,
} from ':utils/cache';
import { logger } from ':utils/logger';

/**
 * 提取结果
 */
export interface ExtractionResult {
  messages: Record<string, MessageDescriptor>;
  duration: number;
  isChanged: boolean;
}

/**
 * 检查文件是否在 include 范围内
 */
export function isFileInInclude(filePath: string, include: string[]): boolean {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  return include.some(pattern => minimatch(normalizedPath, pattern));
}

/**
 * 生成内容 hash
 */
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * 写入消息文件
 */
async function writeMessageFile(
  outFile: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
}

function getFormatJSOptions(options: FormatJSPluginOptions): ExtractCLIOptions {
  const {
    include: _,
    debug: __,
    hotReload: ___,
    extractOnBuild: ____,
    ...rest
  } = options;

  return rest;
}

/**
 * 提取消息
 */
export async function extractMessages(
  options: FormatJSPluginOptions
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // 检查必需参数
    if (!options.include || !options.outFile) {
      throw new Error('include 和 outFile 是必需的配置项');
    }

    // 调用 @formatjs/cli-lib 的 extract 函数
    const formatJSOptions = getFormatJSOptions(options);
    const extractResult = await extract(options.include, formatJSOptions);

    // extract 返回的是 JSON 字符串，格式化后再次序列化确保一致性
    const messages = JSON.parse(extractResult) as Record<
      string,
      MessageDescriptor
    >;
    const formattedContent = JSON.stringify(messages, null, 2);

    // 生成内容 hash
    const contentHash = generateContentHash(formattedContent);

    // 读取缓存
    const cache = await findCache(options.outFile);
    const isChanged = !cache || cache.hash !== contentHash;

    if (isChanged) {
      // 写入消息文件
      await writeMessageFile(options.outFile, formattedContent);

      // 更新缓存
      await writeCache(options.outFile, contentHash);

      logger.debug('消息已更新', {
        outFile: options.outFile,
        messageCount: Object.keys(messages).length,
      });
    } else {
      logger.debug('消息内容未变更，跳过写入');
    }

    return {
      messages,
      duration: Date.now() - startTime,
      isChanged,
    };
  } catch (error) {
    logger.error('提取消息失败', { error });
    throw error;
  }
}

/**
 * 清除缓存
 */
export async function clearCache(
  options: FormatJSPluginOptions
): Promise<void> {
  if (!options.outFile) {
    return;
  }

  await clearCacheUtil(options.outFile);
}
