import * as path from 'node:path';

import pkg from '@formatjs/cli-lib';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';

import { logger } from '../utils/logger';

import { getExtractConfig } from './config';
import type { ExtractOptions } from './types';

const { extractAndWrite } = pkg;

/**
 * 检查文件是否在 include 范围内
 */
export function isFileInInclude(
  filePath: string,
  include: string[],
  ignore: string[]
): boolean {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  return (
    include.some(pattern => minimatch(normalizedPath, pattern)) &&
    !ignore.some(pattern => minimatch(normalizedPath, pattern))
  );
}

/**
 * 提取消息
 */
export async function extractMessages(
  options: ExtractOptions
): Promise<number> {
  const startTime = Date.now();

  // 检查必需参数
  if (!options.include || !options.outFile) {
    throw new Error('extract.include 和 extract.outFile 是必需的配置项');
  }

  logger.debug('开始提取消息', options);

  const files: string[] = [];
  if (options.include.length) {
    files.push(
      ...globSync(options.include, {
        ignore: options.ignore,
      })
    );
  }

  // 调用 @formatjs/cli-lib 的 extract 函数
  const formatJSOptions = getExtractConfig(options);
  await extractAndWrite(files, formatJSOptions);

  return Date.now() - startTime;
}
