import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import pkg from '@formatjs/cli-lib';

import { logger } from '../utils/logger';

import { getCompileConfig } from './config';
import type { CompileOptions, VitePluginFormatJSOptions } from './types';

const { compile, compileAndWrite } = pkg;

/**
 * 发现消息目录下的所有消息文件
 */
export async function findMessageFiles(
  options: CompileOptions
): Promise<string[]> {
  const messageDir = options.inputDir;
  const messageFiles: string[] = [];

  try {
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
          logger.debug('跳过无效的 JSON 文件', filePath);
        }
      }
    }
  } catch (error) {
    throw new Error(`无法读取消息目录 ${messageDir}: ${String(error)}`);
  }

  return messageFiles;
}

/**
 * 检查文件是否是消息文件
 */
export function isMessageFile(
  filePath: string,
  options: VitePluginFormatJSOptions
): boolean {
  if (!options.extract.outFile) {
    return false;
  }

  const messageDir = options.compile.inputDir;
  const normalizedFilePath = path.normalize(filePath);
  const normalizedMessageDir = path.normalize(messageDir);

  // 检查文件是否在消息目录中
  if (!normalizedFilePath.startsWith(normalizedMessageDir)) {
    return false;
  }

  // 检查是否是 JSON 文件且不是主消息文件
  const fileName = path.basename(filePath);
  const mainMessageFile = path.basename(options.extract.outFile);

  return fileName.endsWith('.json') && fileName !== mainMessageFile;
}

/**
 * 编译单个消息文件
 */
export async function compileMessageFile(
  messageFile: string,
  options: CompileOptions
): Promise<number> {
  const startTime = Date.now();
  const outFile = path.join(options.outputDir, path.basename(messageFile));

  try {
    // 检查消息文件是否存在
    await fs.access(messageFile);

    logger.debug('开始编译消息文件', { messageFile, outFile });

    // 编译文件内容
    const compileConfig = getCompileConfig(options);
    await compileAndWrite([messageFile], compileConfig);

    const duration = Date.now() - startTime;
    logger.debug('消息文件编译完成', {
      messageFile,
      outFile,
      duration,
    });

    return duration;
  } catch (error) {
    logger.error('消息文件编译失败', { messageFile, outFile, error });

    return 0;
  }
}

/**
 * 根据配置编译所有消息文件
 */
export async function compileMessages(
  options: CompileOptions
): Promise<number> {
  const startTime = Date.now();

  try {
    logger.debug('开始批量编译消息文件', options);
    const compileConfig = getCompileConfig(options);

    // 确保输出目录存在
    await fs.mkdir(options.outputDir, { recursive: true });

    const files = await findMessageFiles(options);
    const results = await Promise.all(
      files.map(f => {
        logger.debug('编译消息文件', f);
        return compile([f], compileConfig);
      })
    );
    const outFiles = files.map(f => {
      const outFile = path.join(options.outputDir, path.basename(f));
      logger.debug('编译消息文件输出', outFile);
      return outFile;
    });

    await Promise.all(
      outFiles.map((outFile, i) => fs.writeFile(outFile, results[i]!, 'utf8'))
    );

    const duration = Date.now() - startTime;

    logger.debug(
      `批量编译完成，编译文件 ${files.length} 个，耗时 ${duration}ms`
    );

    return duration;
  } catch (error) {
    logger.error('批量编译消息文件失败', { error });
    throw error;
  }
}
