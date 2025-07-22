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
  const relativePath = path.relative(process.cwd(), filePath);
  logger.debug('Check if file is in extract include: ', relativePath);
  return (
    include.some(pattern => minimatch(relativePath, pattern)) &&
    !ignore.some(pattern => minimatch(relativePath, pattern))
  );
}

/**
 * 提取消息
 */
export async function extractMessages(options: ExtractOptions): Promise<void> {
  const files: string[] = [];
  if (options.include.length) {
    files.push(
      ...globSync(options.include, {
        ignore: options.ignore,
      })
    );
  }

  const extractConfig = getExtractConfig(options);
  await extractAndWrite(files, extractConfig);
}
