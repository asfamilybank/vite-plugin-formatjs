import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { compile } from '@formatjs/cli-lib';

import { getCompileConfig } from './config';
import type { FormatJSPluginOptions } from './types';

import { logger } from ':utils/logger';

/**
 * 单个文件编译结果
 */
export interface SingleCompileResult {
  messageFile: string;
  outFile: string;
  duration: number;
  success: boolean;
}

/**
 * 批量编译结果
 */
export interface CompileResult {
  results: SingleCompileResult[];
  duration: number;
  compiledCount: number;
}

/**
 * 确保输出目录存在
 */
async function ensureOutputDir(outFile: string): Promise<void> {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
}

/**
 * 编译单个文件内容
 */
async function compileFileContent(
  messageFile: string,
  options: FormatJSPluginOptions
): Promise<string> {
  const compileConfig = getCompileConfig(options);
  return await compile([messageFile], compileConfig);
}

/**
 * 写入编译后的文件
 */
async function writeCompiledFile(
  outFile: string,
  content: string
): Promise<void> {
  await fs.writeFile(outFile, content, 'utf8');
}

/**
 * 根据消息文件生成输出文件路径
 */
export function generateOutputPath(
  messageFile: string,
  options: FormatJSPluginOptions
): string {
  if (!options.compileFolder) {
    throw new Error('compileFolder 配置是必需的');
  }

  const fileName = path.basename(messageFile);
  return path.join(options.compileFolder, fileName);
}

/**
 * 发现消息目录下的所有消息文件
 */
export async function findMessageFiles(
  messageDir: string,
  options: FormatJSPluginOptions
): Promise<string[]> {
  const messageFiles: string[] = [];

  try {
    const files = await fs.readdir(messageDir);

    for (const file of files) {
      if (file.endsWith('.json') && file !== path.basename(options.outFile!)) {
        const filePath = path.join(messageDir, file);

        // 检查是否是有效的 JSON 文件
        try {
          const content = await fs.readFile(filePath, 'utf8');
          JSON.parse(content);
          messageFiles.push(filePath);
        } catch {
          // 忽略无效的 JSON 文件
          if (options.debug) {
            logger.debug('跳过无效的 JSON 文件', { file: filePath });
          }
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
  options: FormatJSPluginOptions
): boolean {
  if (!options.outFile) {
    return false;
  }

  const messageDir = path.dirname(options.outFile);
  const normalizedFilePath = path.normalize(filePath);
  const normalizedMessageDir = path.normalize(messageDir);

  // 检查文件是否在消息目录中
  if (!normalizedFilePath.startsWith(normalizedMessageDir)) {
    return false;
  }

  // 检查是否是 JSON 文件且不是主消息文件
  const fileName = path.basename(filePath);
  const mainMessageFile = path.basename(options.outFile);

  return fileName.endsWith('.json') && fileName !== mainMessageFile;
}

/**
 * 编译单个消息文件
 */
export async function compileMessageFile(
  messageFile: string,
  options: FormatJSPluginOptions
): Promise<SingleCompileResult> {
  const startTime = Date.now();
  const outFile = generateOutputPath(messageFile, options);

  // 检查消息文件是否存在
  await fs.access(messageFile);

  if (options.debug) {
    logger.debug('开始编译消息文件', { messageFile, outFile });
  }

  // 编译文件内容
  const compiledContent = await compileFileContent(messageFile, options);

  // 确保输出目录存在并写入文件
  await ensureOutputDir(outFile);
  await writeCompiledFile(outFile, compiledContent);

  const duration = Date.now() - startTime;

  if (options.debug) {
    logger.debug('消息文件编译完成', {
      messageFile,
      outFile,
      duration,
      size: compiledContent.length,
    });
  }

  return {
    messageFile,
    outFile,
    duration,
    success: true,
  };
}

/**
 * 根据配置编译所有消息文件
 */
export async function compileMessages(
  options: FormatJSPluginOptions
): Promise<CompileResult> {
  const startTime = Date.now();

  try {
    // 检查必需的配置
    if (!options.compileFolder) {
      throw new Error('compileFolder 配置是必需的');
    }

    if (!options.outFile) {
      throw new Error('outFile 配置是必需的，用于确定消息文件位置');
    }

    const messageDir = path.dirname(options.outFile);

    if (options.debug) {
      logger.debug('开始批量编译消息文件', {
        messageDir,
        compileFolder: options.compileFolder,
      });
    }

    // 发现所有消息文件
    const messageFiles = await findMessageFiles(messageDir, options);

    if (messageFiles.length === 0) {
      logger.info('没有找到需要编译的消息文件', { messageDir });
      return {
        results: [],
        duration: Date.now() - startTime,
        compiledCount: 0,
      };
    }

    // 确保输出目录存在
    await ensureOutputDir(path.join(options.compileFolder, 'dummy'));

    // 并行编译所有文件
    const results = await Promise.all(
      messageFiles.map(messageFile => compileMessageFile(messageFile, options))
    );

    const duration = Date.now() - startTime;
    const compiledCount = results.filter(r => r.success).length;

    logger.success(
      `批量编译完成，处理了 ${results.length} 个文件，成功编译 ${compiledCount} 个，耗时 ${duration}ms`
    );

    return {
      results,
      duration,
      compiledCount,
    };
  } catch (error) {
    logger.error('批量编译消息文件失败', { error });
    throw error;
  }
}
