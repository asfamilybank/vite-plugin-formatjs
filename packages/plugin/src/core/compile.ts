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
  const inputDir = path.resolve(process.cwd(), messageDir);
  const messageFiles: string[] = [];
  
    const files = await fs.readdir(inputDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(inputDir, file);
        logger.debug('Find message file: ', filePath);

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
export function isMessageFile(
  filePath: string,
  inputDir: string,
  excludeFile: string
): boolean {
  const absoluteFilePath = path.resolve(process.cwd(), filePath);
  logger.debug('Check if it is a message file: ', absoluteFilePath);
  const normalizedMessageDir = path.resolve(process.cwd(), inputDir);
  logger.debug('Message files dir: ', normalizedMessageDir);

  // 检查文件是否在消息目录中
  const fileDir = path.dirname(absoluteFilePath);
  if (fileDir !== normalizedMessageDir) {
    return false;
  }

  // 检查是否是 JSON 文件且不是主消息文件
  const fileName = path.basename(filePath);
  const excludeFileName = path.basename(excludeFile);

  return fileName.endsWith('.json') && fileName !== excludeFileName;
}

/**
 * 编译单个消息文件
 */
export async function compileMessageFile(
  messageFile: string,
  options: CompileOptions
): Promise<void> {
  const fileName = path.basename(messageFile);
  const outFile = path.join(options.outputDir, fileName);

  const absoluteMessageFile = path.resolve(process.cwd(), messageFile);
  logger.debug('Compile message file: ', absoluteMessageFile);
  const absoluteOutFile = path.resolve(process.cwd(), outFile);
  logger.debug('Compile output file: ', absoluteOutFile);

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
      const outFile = path.resolve(process.cwd(), options.outputDir, fileName);
      logger.debug('Write compiled message file: ', outFile);
      return fs.writeFile(outFile, results[i]!, 'utf8');
    })
  );
}
