import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import pkg, { extract, type MessageDescriptor } from '@formatjs/cli-lib';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';

import { getExtractConfig } from './config';
import type { ExtractOptions } from './types';

import { logger } from ':utils';

const { extractAndWrite } = pkg;

/**
 * 检查文件是否在 include 范围内
 */
export function isFileInInclude(
  filePath: string,
  include: string[],
  ignore: string[]
): boolean {
  const relativePath = path.resolve(process.cwd(), filePath);
  logger.debug('Check if file is in extract include: ', relativePath);
  logger.debug('File must match include: ', include);
  logger.debug('File must not match ignore: ', ignore);
  return (
    include.some(pattern =>
      minimatch(relativePath, path.resolve(process.cwd(), pattern))
    ) &&
    !ignore.some(pattern =>
      minimatch(relativePath, path.resolve(process.cwd(), pattern))
    )
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

export async function extractMessage(
  files: string[],
  options: ExtractOptions
): Promise<void> {
  logger.debug('Extracting messages: ', files);
  const extractConfig = getExtractConfig(options);
  const result = await extract(files, extractConfig);

  const messages = JSON.parse(result) as MessageDescriptor[];
  const existingMessages = await fs.readFile(options.outFile!, 'utf-8');
  const existingMessagesJson = JSON.parse(existingMessages) as Record<
    string,
    string
  >;

  const mergedMessages = {
    ...existingMessagesJson,
    ...messages,
  };

  logger.debug('Merged messages: ', mergedMessages);

  await fs.writeFile(options.outFile!, `${JSON.stringify(mergedMessages, null, 2)}\n`);
}
