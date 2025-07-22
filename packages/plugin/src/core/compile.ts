import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import pkg from '@formatjs/cli-lib';

import { getCompileConfig } from './config';
import type { CompileOptions } from './types';

import { logger } from ':utils';

const { compile, compileAndWrite } = pkg;

/**
 * 发现消息目录下的所有消息文件
 */
export async function findMessageFiles(messageDir: string): Promise<string[]> {
  const messageFiles: string[] = [];
  const files = await fs.readdir(messageDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(messageDir, file);

      // 检查是否是有效的 JSON 文件
      try {
        const content = await fs.readFile(filePath, 'utf8');
        JSON.parse(content);
        messageFiles.push(filePath);
      } catch {
        // 忽略无效的 JSON 文件
        logger.debug('Skip invalid JSON file: ', filePath);
      }
    }
  }

  return messageFiles;
}

/**
 * 检查文件是否是消息文件
 */
export function isMessageFile(filePath: string, inputDir: string): boolean {
  const relativeFilePath = path.relative(process.cwd(), filePath);
  logger.debug('Check if it is a message file: ', relativeFilePath);
  const normalizedMessageDir = path.normalize(inputDir);

  // 检查文件是否在消息目录中
  if (!relativeFilePath.startsWith(normalizedMessageDir)) {
    return false;
  }

  // 检查是否是 JSON 文件且不是主消息文件
  const fileName = path.basename(filePath);

  return fileName.endsWith('.json');
}

/**
 * 编译单个消息文件
 */
export async function compileMessageFile(
  messageFile: string,
  options: CompileOptions
): Promise<void> {
  const fileName = path.basename(messageFile);
  logger.debug('Compile message file:', fileName);
  const outFile = path.join(options.outputDir, fileName);
  logger.debug('Compile output file:', outFile);

  const absoluteMessageFile = path.join(process.cwd(), messageFile);
  const absoluteOutFile = path.join(process.cwd(), outFile);

  // 编译文件内容
  const compileConfig = getCompileConfig(options);
  await compileAndWrite([absoluteMessageFile], {
    outFile: absoluteOutFile,
    ...compileConfig,
  });
}

/**
 * 根据配置编译所有消息文件
 */
export async function compileMessages(options: CompileOptions): Promise<void> {
  const files = await findMessageFiles(options.inputDir);
  const compileConfig = getCompileConfig(options);
  const results = await Promise.all(
    files.map(f => compile([f], compileConfig))
  );

  // 确保输出目录存在
  await fs.mkdir(options.outputDir, { recursive: true });
  await Promise.all(
    files.map((file, i) => {
      const fileName = path.basename(file);
      const outFile = path.join(options.outputDir, fileName);
      logger.debug('Write compiled message file:', outFile);
      return fs.writeFile(outFile, results[i]!, 'utf8');
    })
  );
}
