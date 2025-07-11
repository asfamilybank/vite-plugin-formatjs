import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, relative } from 'path';

import { extract, type MessageDescriptor } from '@formatjs/cli-lib';
import { minimatch } from 'minimatch';

import type { FormatJSPluginOptions } from '../types';
import { createTimer, logger } from '../utils/logger';

/**
 * 提取结果接口
 */
export interface ExtractResult {
  messages: Record<string, MessageDescriptor>;
  filesProcessed: number;
  errors: Error[];
  duration: number;
}

/**
 * 消息提取器
 * 负责从源文件中提取国际化消息
 */
export class MessageExtractor {
  private options: FormatJSPluginOptions;
  private cwd: string;

  constructor(options: FormatJSPluginOptions, cwd: string = process.cwd()) {
    this.options = options;
    this.cwd = cwd;
  }

  /**
   * 提取所有消息并输出到文件
   */
  async extractAll(): Promise<ExtractResult> {
    const timer = createTimer('提取国际化消息');

    try {
      logger.debug('开始提取国际化消息...');

      // 使用 @formatjs/cli-lib 的 extract 函数
      // 它天生支持 glob 模式和多文件处理
      const extractOptions = this.buildExtractOptions();

      const extractResult = await extract(
        this.options.include ?? [],
        extractOptions
      );
      logger.debug('extractResult: ', extractResult);

      // extract 函数可能返回字符串或对象
      let messages: Record<string, MessageDescriptor>;
      if (typeof extractResult === 'string') {
        messages = JSON.parse(extractResult) as Record<
          string,
          MessageDescriptor
        >;
      } else {
        messages = extractResult;
      }

      // 确保输出目录存在
      if (this.options.outFile) {
        await this.ensureOutputDir(this.options.outFile);
        await this.writeMessages(messages, this.options.outFile);
      }

      // 使用 timer.end() 结束并输出性能日志
      timer.end();

      return {
        messages,
        filesProcessed: this.options.include?.length ?? 0,
        errors: [],
        duration: timer.duration,
      };
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      // 在错误情况下也结束计时
      timer.end();

      return {
        messages: {},
        filesProcessed: 0,
        errors: [errorObj],
        duration: timer.duration,
      };
    }
  }

  /**
   * 增量提取指定文件的消息
   * 用于热更新时的增量处理
   */
  async extractIncremental(changedFiles: string[]): Promise<ExtractResult> {
    const timer = createTimer('增量提取国际化消息');

    try {
      // 1. 参数验证
      if (!changedFiles || changedFiles.length === 0) {
        timer.end();
        return {
          messages: {},
          filesProcessed: 0,
          errors: [],
          duration: timer.duration,
        };
      }

      // 2. 过滤出需要处理的文件
      const relevantFiles = this.filterRelevantFiles(changedFiles);

      if (relevantFiles.length === 0) {
        logger.debug('变更的文件不匹配 include 模式');
        timer.end();
        return {
          messages: {},
          filesProcessed: 0,
          errors: [],
          duration: timer.duration,
        };
      }

      logger.debug(`开始增量提取 ${relevantFiles.length} 个文件的消息`);

      // 3. 提取变更文件的新消息
      const extractOptions = this.buildExtractOptions();
      const newMessages = await extract(relevantFiles, extractOptions);
      logger.debug('newMessages: ', newMessages);

      // 处理返回值类型
      let parsedNewMessages: Record<string, MessageDescriptor>;
      if (typeof newMessages === 'string') {
        parsedNewMessages = JSON.parse(newMessages) as Record<
          string,
          MessageDescriptor
        >;
      } else {
        parsedNewMessages = newMessages;
      }

      // 4. 读取现有消息文件
      const existingMessages = this.options.outFile
        ? await this.readExistingMessages(this.options.outFile)
        : {};

      // 5. 合并消息（新消息覆盖旧消息）
      const finalMessages = {
        ...existingMessages,
        ...parsedNewMessages,
      };

      // 6. 写入合并后的消息
      if (this.options.outFile) {
        await this.ensureOutputDir(this.options.outFile);
        await this.writeMessages(finalMessages, this.options.outFile);
      }

      const newMessageCount = Object.keys(parsedNewMessages).length;
      const totalMessageCount = Object.keys(finalMessages).length;

      // 结束计时并输出性能日志
      timer.end();

      logger.debug(
        `增量提取完成！新增/更新 ${newMessageCount} 条消息，总计 ${totalMessageCount} 条消息，耗时 ${timer.duration.toFixed(2)}ms`
      );

      return {
        messages: finalMessages,
        filesProcessed: relevantFiles.length,
        errors: [],
        duration: timer.duration,
      };
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      logger.error('增量提取过程中发生错误:', errorObj);

      // 错误情况下结束计时
      timer.end();

      return {
        messages: {},
        filesProcessed: 0,
        errors: [errorObj],
        duration: timer.duration,
      };
    }
  }

  /**
   * 构建 extract 函数的选项
   */
  private buildExtractOptions() {
    const options = {
      // 输出相关
      outFile: this.options.outFile,

      // 文件过滤
      ignore: this.options.ignore,

      // 提取选项
      idInterpolationPattern: this.options.idInterpolationPattern,
      removeDefaultMessage: this.options.removeDefaultMessage,
      additionalComponentNames: this.options.additionalComponentNames,

      // 格式化选项
      format: this.options.format ?? 'simple',
      preserveWhitespace: this.options.preserveWhitespace,

      // 其他选项
      ast: this.options.ast,
      throws: this.options.throws,
      pragma: this.options.pragma,
      extractSourceLocation: this.options.extractSourceLocation,
      flatten: this.options.flatten,
    };

    // 过滤掉 undefined 值
    return Object.fromEntries(
      Object.entries(options).filter(([_, value]) => value !== undefined)
    );
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDir(outputPath: string): Promise<void> {
    const dir = dirname(outputPath);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      logger.debug(`创建输出目录: ${dir}`);
    }
  }

  /**
   * 写入消息到文件
   */
  private async writeMessages(
    messages: Record<string, MessageDescriptor>,
    outputPath: string
  ): Promise<void> {
    try {
      const content = JSON.stringify(messages, null, 2);
      await writeFile(outputPath, content, 'utf-8');

      if (this.options.debug) {
        logger.debug(`消息已写入文件: ${outputPath}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`写入文件失败 ${outputPath}: ${errorMessage}`);
    }
  }

  /**
   * 读取现有的消息文件
   */
  private async readExistingMessages(
    filePath: string
  ): Promise<Record<string, MessageDescriptor>> {
    try {
      if (!existsSync(filePath)) {
        return {};
      }

      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as Record<string, MessageDescriptor>;
    } catch (error) {
      logger.warn(`读取现有消息文件失败 ${filePath}:`, error);
      return {};
    }
  }

  /**
   * 过滤出需要处理的相关文件
   */
  private filterRelevantFiles(files: string[]): string[] {
    const { include = [] } = this.options;

    if (include.length === 0) {
      return files;
    }

    // 使用 minimatch 进行匹配
    return (
      files
        .map(file => relative(this.cwd, file))
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        .filter(file => include.some(pattern => minimatch(file, pattern)))
    );
  }
}
