import type { PathLike } from 'node:fs';
import * as fs from 'node:fs/promises';

import { compile, compileAndWrite } from '@formatjs/cli-lib';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  MockedFunction,
} from 'vitest';

import {
  compileMessageFile,
  compileMessages,
  findMessageFiles,
  isMessageFile,
} from '../compile';
import type { CompileOptions } from '../types';

import { logger } from ':utils';

// Mock external dependencies
vi.mock('node:fs/promises');
// Don't mock path module, use the real one
vi.mock('@formatjs/cli-lib');
vi.mock(':utils', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

const mockedFs = vi.mocked(
  fs as unknown as typeof fs & {
    readdir: MockedFunction<(path: PathLike) => Promise<string[]>>;
  }
);
const mockedCompile = vi.mocked(compile);
const mockedCompileAndWrite = vi.mocked(compileAndWrite);
const mockedLogger = vi.mocked(logger);

// Use real path module

describe('Compile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');

    // No path mocks needed, using real path module
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findMessageFiles', () => {
    it('should find all valid JSON message files', async () => {
      const mockFiles = [
        'en.json',
        'zh.json',
        'fr.json',
        'invalid.txt',
        'malformed.json',
      ];
      const validJsonContent = JSON.stringify({ key1: 'value1' });

      mockedFs.readdir.mockResolvedValue(mockFiles);
      mockedFs.readFile
        .mockResolvedValueOnce(validJsonContent) // en.json
        .mockResolvedValueOnce(validJsonContent) // zh.json
        .mockResolvedValueOnce(validJsonContent) // fr.json
        .mockRejectedValueOnce(new Error('Parse error')); // malformed.json

      const result = await findMessageFiles('src/i18n/lang');

      expect(result).toEqual([
        '/mock/project/src/i18n/lang/en.json',
        '/mock/project/src/i18n/lang/zh.json',
        '/mock/project/src/i18n/lang/fr.json',
      ]);
      expect(mockedFs.readdir).toHaveBeenCalledWith(
        '/mock/project/src/i18n/lang'
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Find message file: ',
        '/mock/project/src/i18n/lang/en.json'
      );
    });

    it('should skip non-JSON files', async () => {
      const mockFiles = ['readme.md', 'config.yaml', 'script.js'];
      mockedFs.readdir.mockResolvedValue(mockFiles);

      const result = await findMessageFiles('src/i18n/lang');

      expect(result).toEqual([]);
      expect(mockedFs.readFile).not.toHaveBeenCalled();
    });

    it('should skip invalid JSON files and log debug message', async () => {
      const mockFiles = ['valid.json', 'invalid.json'];
      const validJsonContent = JSON.stringify({ key: 'value' });

      mockedFs.readdir.mockResolvedValue(mockFiles);
      mockedFs.readFile
        .mockResolvedValueOnce(validJsonContent)
        .mockResolvedValueOnce('invalid json');

      // Mock JSON.parse to throw for invalid content
      const originalJsonParse = JSON.parse;
      vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
        if (text === 'invalid json') {
          throw new Error('Invalid JSON');
        }
        return originalJsonParse(text) as unknown as Record<string, unknown>;
      });

      const result = await findMessageFiles('src/i18n/lang');

      expect(result).toEqual(['/mock/project/src/i18n/lang/valid.json']);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Skip invalid JSON file: ',
        '/mock/project/src/i18n/lang/invalid.json'
      );

      vi.restoreAllMocks();
    });

    it('should handle empty directory', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const result = await findMessageFiles('src/i18n/lang');

      expect(result).toEqual([]);
    });

    it('should handle directory read errors', async () => {
      const error = new Error('Directory not found');
      mockedFs.readdir.mockRejectedValue(error);

      await expect(findMessageFiles('src/i18n/lang')).rejects.toThrow(
        'Directory not found'
      );
    });

    it('should resolve relative paths correctly', async () => {
      const mockFiles = ['messages.json'];
      const validJsonContent = JSON.stringify({ key: 'value' });

      // The path.resolve mock in beforeEach should handle this correctly

      mockedFs.readdir.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue(validJsonContent);

      const result = await findMessageFiles('../../i18n/lang');

      expect(result).toEqual(['/i18n/lang/messages.json']);
      expect(mockedFs.readdir).toHaveBeenCalledWith('/i18n/lang');
    });
  });

  describe('isMessageFile', () => {
    it('should return true for valid message files', () => {
      const result = isMessageFile(
        '/mock/project/src/i18n/lang/en.json',
        'src/i18n/lang',
        'src/i18n/lang/messages.json'
      );

      expect(result).toBe(true);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Check if it is a message file: ',
        '/mock/project/src/i18n/lang/en.json'
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Message files dir: ',
        '/mock/project/src/i18n/lang'
      );
    });

    it('should return false for files not in message directory', () => {
      const result = isMessageFile(
        '/mock/project/src/components/Button.json',
        'src/i18n/lang',
        'src/i18n/lang/messages.json'
      );

      expect(result).toBe(false);
    });

    it('should return false for non-JSON files', () => {
      const result = isMessageFile(
        '/mock/project/src/i18n/lang/readme.md',
        'src/i18n/lang',
        'src/i18n/lang/messages.json'
      );

      expect(result).toBe(false);
    });

    it('should return false for the exclude file itself', () => {
      const result = isMessageFile(
        '/mock/project/src/i18n/lang/messages.json',
        'src/i18n/lang',
        'src/i18n/lang/messages.json'
      );

      expect(result).toBe(false);
    });

    it('should handle relative paths correctly', () => {
      const result = isMessageFile(
        'src/i18n/lang/en.json',
        'src/i18n/lang',
        'messages.json'
      );

      expect(result).toBe(true);
    });
  });

  describe('compileMessageFile', () => {
    const mockOptions: CompileOptions = {
      inputDir: 'src/i18n/lang',
      outputDir: 'dist/i18n',
      ast: true,
    };

    it('should compile a single message file successfully', async () => {
      mockedCompileAndWrite.mockResolvedValue(undefined);

      await compileMessageFile('src/i18n/lang/en.json', mockOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Compile message file: ',
        '/mock/project/src/i18n/lang/en.json'
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Compile output file: ',
        '/mock/project/dist/i18n/en.json'
      );
      expect(mockedCompileAndWrite).toHaveBeenCalledWith(
        ['/mock/project/src/i18n/lang/en.json'],
        {
          outFile: '/mock/project/dist/i18n/en.json',
          ast: true,
        }
      );
    });

    it('should handle compilation errors', async () => {
      const error = new Error('Compilation failed');
      mockedCompileAndWrite.mockRejectedValue(error);

      await expect(
        compileMessageFile('src/i18n/lang/en.json', mockOptions)
      ).rejects.toThrow('Compilation failed');
    });

    it('should handle different file extensions correctly', async () => {
      mockedCompileAndWrite.mockResolvedValue(undefined);

      await compileMessageFile('src/i18n/lang/zh-CN.json', mockOptions);

      expect(mockedCompileAndWrite).toHaveBeenCalledWith(
        ['/mock/project/src/i18n/lang/zh-CN.json'],
        {
          outFile: '/mock/project/dist/i18n/zh-CN.json',
          ast: true,
        }
      );
    });

    it('should pass through compile options correctly', async () => {
      const customOptions: CompileOptions = {
        inputDir: 'custom/input',
        outputDir: 'custom/output',
        ast: false,
        format: 'simple',
      };

      mockedCompileAndWrite.mockResolvedValue(undefined);

      await compileMessageFile('custom/input/messages.json', customOptions);

      expect(mockedCompileAndWrite).toHaveBeenCalledWith(
        ['/mock/project/custom/input/messages.json'],
        {
          outFile: '/mock/project/custom/output/messages.json',
          ast: false,
          format: 'simple',
        }
      );
    });
  });

  describe('compileMessages', () => {
    const mockOptions: CompileOptions = {
      inputDir: 'src/i18n/lang',
      outputDir: 'dist/i18n',
    };

    it('should compile all message files successfully', async () => {
      const compiledResults = [
        'compiled en content',
        'compiled zh content',
        'compiled fr content',
      ];

      // Mock findMessageFiles
      mockedFs.readdir.mockResolvedValue(['en.json', 'zh.json', 'fr.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));

      mockedCompile
        .mockResolvedValueOnce(compiledResults[0])
        .mockResolvedValueOnce(compiledResults[1])
        .mockResolvedValueOnce(compiledResults[2]);

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await compileMessages(mockOptions);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(mockOptions.outputDir, {
        recursive: true,
      });
      expect(mockedCompile).toHaveBeenCalledTimes(3);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/mock/project/dist/i18n/en.json',
        'compiled en content\n',
        'utf8'
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/mock/project/dist/i18n/zh.json',
        'compiled zh content\n',
        'utf8'
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/mock/project/dist/i18n/fr.json',
        'compiled fr content\n',
        'utf8'
      );
    });

    it('should handle empty message directory', async () => {
      mockedFs.readdir.mockResolvedValue([]);
      mockedFs.mkdir.mockResolvedValue(undefined);

      await compileMessages(mockOptions);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(mockOptions.outputDir, {
        recursive: true,
      });
      expect(mockedCompile).not.toHaveBeenCalled();
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle compilation errors', async () => {
      mockedFs.readdir.mockResolvedValue(['en.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));

      const error = new Error('Compilation failed');
      mockedCompile.mockRejectedValue(error);
      mockedFs.mkdir.mockResolvedValue(undefined);

      await expect(compileMessages(mockOptions)).rejects.toThrow(
        'Compilation failed'
      );
    });

    it('should handle file system errors when creating output directory', async () => {
      const error = new Error('Permission denied');
      mockedFs.readdir.mockResolvedValue(['en.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));
      mockedFs.mkdir.mockRejectedValue(error);

      await expect(compileMessages(mockOptions)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should handle file system errors when writing compiled files', async () => {
      mockedFs.readdir.mockResolvedValue(['en.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));
      mockedCompile.mockResolvedValue('compiled content');
      mockedFs.mkdir.mockResolvedValue(undefined);

      const error = new Error('Write failed');
      mockedFs.writeFile.mockRejectedValue(error);

      await expect(compileMessages(mockOptions)).rejects.toThrow(
        'Write failed'
      );
    });

    it('should log compilation progress', async () => {
      mockedFs.readdir.mockResolvedValue(['en.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));
      mockedCompile.mockResolvedValue('compiled content');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await compileMessages(mockOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Write compiled message file: ',
        '/mock/project/dist/i18n/en.json'
      );
    });

    it('should pass compile configuration correctly', async () => {
      const customOptions: CompileOptions = {
        inputDir: 'src/lang',
        outputDir: 'dist/lang',
        ast: true,
        format: 'simple',
      };

      mockedFs.readdir.mockResolvedValue(['test.json']);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));
      mockedCompile.mockResolvedValue('compiled content');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await compileMessages(customOptions);

      expect(mockedCompile).toHaveBeenCalledWith(
        ['/mock/project/src/lang/test.json'],
        {
          ast: true,
          format: 'simple',
        }
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical workflow with multiple files', async () => {
      const options: CompileOptions = {
        inputDir: 'src/i18n/messages',
        outputDir: 'dist/i18n',
        ast: false,
      };

      // Mock typical message files
      mockedFs.readdir.mockResolvedValue([
        'en-US.json',
        'zh-CN.json',
        'es-ES.json',
      ]);
      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({
          welcome: 'Welcome',
          goodbye: 'Goodbye',
        })
      );

      mockedCompile.mockResolvedValue('compiled content');
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await compileMessages(options);

      expect(mockedCompile).toHaveBeenCalledTimes(3);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should correctly identify message files vs other files', () => {
      const messageDir = 'src/i18n/lang';
      const excludeFile = 'src/i18n/lang/extracted.json';

      // Should identify valid message files
      expect(
        isMessageFile(
          '/mock/project/src/i18n/lang/en.json',
          messageDir,
          excludeFile
        )
      ).toBe(true);
      expect(
        isMessageFile(
          '/mock/project/src/i18n/lang/zh-CN.json',
          messageDir,
          excludeFile
        )
      ).toBe(true);

      // Should exclude the main extracted file
      expect(
        isMessageFile(
          '/mock/project/src/i18n/lang/extracted.json',
          messageDir,
          excludeFile
        )
      ).toBe(false);

      // Should exclude files from other directories
      expect(
        isMessageFile(
          '/mock/project/src/components/Button.json',
          messageDir,
          excludeFile
        )
      ).toBe(false);

      // Should exclude non-JSON files
      expect(
        isMessageFile(
          '/mock/project/src/i18n/lang/readme.md',
          messageDir,
          excludeFile
        )
      ).toBe(false);
    });
  });
});
