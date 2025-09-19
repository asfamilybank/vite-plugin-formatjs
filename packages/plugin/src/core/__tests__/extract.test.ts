import * as fs from 'node:fs/promises';

import { extract, extractAndWrite } from '@formatjs/cli-lib';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractMessage, extractMessages, isFileInInclude } from '../extract';
import type { ExtractOptions } from '../types';

import { logger } from ':utils';

// Mock external dependencies
vi.mock('node:fs/promises');
vi.mock('@formatjs/cli-lib');
vi.mock('glob');
vi.mock('minimatch');
vi.mock(':utils', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

const mockedFs = vi.mocked(fs);
const mockedExtractAndWrite = vi.mocked(extractAndWrite);
const mockedExtract = vi.mocked(extract);
const mockedGlobSync = vi.mocked(globSync);
const mockedMinimatch = vi.mocked(minimatch);
const mockedLogger = vi.mocked(logger);

describe('Extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFileInInclude', () => {
    it('should return true when file matches include pattern and not ignored', () => {
      mockedMinimatch
        .mockReturnValueOnce(true) // matches include
        .mockReturnValueOnce(false); // doesn't match ignore

      const result = isFileInInclude(
        '/mock/project/src/component.tsx',
        ['src/**/*.tsx'],
        ['node_modules/**']
      );

      expect(result).toBe(true);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Check if file is in extract include: ',
        '/mock/project/src/component.tsx'
      );
      expect(mockedMinimatch).toHaveBeenCalledWith(
        '/mock/project/src/component.tsx',
        '/mock/project/src/**/*.tsx'
      );
      expect(mockedMinimatch).toHaveBeenCalledWith(
        '/mock/project/src/component.tsx',
        '/mock/project/node_modules/**'
      );
    });

    it('should return false when file does not match any include pattern', () => {
      mockedMinimatch.mockReturnValue(false);

      const result = isFileInInclude(
        '/mock/project/test/component.spec.tsx',
        ['src/**/*.tsx'],
        ['node_modules/**']
      );

      expect(result).toBe(false);
    });

    it('should return false when file matches include pattern but is ignored', () => {
      mockedMinimatch
        .mockReturnValueOnce(true) // matches include
        .mockReturnValueOnce(true); // matches ignore

      const result = isFileInInclude(
        '/mock/project/src/component.test.tsx',
        ['src/**/*.tsx'],
        ['**/*.test.*']
      );

      expect(result).toBe(false);
    });

    it('should handle multiple include patterns', () => {
      mockedMinimatch
        .mockReturnValueOnce(false) // doesn't match first include
        .mockReturnValueOnce(true) // matches second include
        .mockReturnValueOnce(false); // doesn't match ignore

      const result = isFileInInclude(
        '/mock/project/pages/index.vue',
        ['src/**/*.tsx', 'pages/**/*.vue'],
        ['node_modules/**']
      );

      expect(result).toBe(true);
    });

    it('should handle multiple ignore patterns', () => {
      mockedMinimatch
        .mockReturnValueOnce(true) // matches include
        .mockReturnValueOnce(false) // doesn't match first ignore
        .mockReturnValueOnce(true); // matches second ignore

      const result = isFileInInclude(
        '/mock/project/src/component.spec.tsx',
        ['src/**/*.tsx'],
        ['node_modules/**', '**/*.spec.*']
      );

      expect(result).toBe(false);
    });

    it('should log debug information', () => {
      mockedMinimatch.mockReturnValue(false);

      isFileInInclude(
        '/mock/project/src/test.ts',
        ['src/**/*.ts'],
        ['**/*.test.*']
      );

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Check if file is in extract include: ',
        '/mock/project/src/test.ts'
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'File must match include: ',
        ['src/**/*.ts']
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'File must not match ignore: ',
        ['**/*.test.*']
      );
    });
  });

  describe('extractMessages', () => {
    const mockOptions: ExtractOptions = {
      include: ['src/**/*.{ts,tsx}'],
      ignore: ['node_modules/**', '**/*.test.*'],
      outFile: 'messages.json',
      throws: true,
    };

    it('should extract messages from files matching include patterns', async () => {
      const mockFiles = [
        '/mock/project/src/component1.tsx',
        '/mock/project/src/component2.ts',
      ];
      mockedGlobSync.mockReturnValue(mockFiles);
      mockedExtractAndWrite.mockResolvedValue(undefined);

      await extractMessages(mockOptions);

      expect(mockedGlobSync).toHaveBeenCalledWith(mockOptions.include, {
        ignore: mockOptions.ignore,
      });
      expect(mockedExtractAndWrite).toHaveBeenCalledWith(mockFiles, {
        ignore: mockOptions.ignore,
        outFile: mockOptions.outFile,
        throws: mockOptions.throws,
      });
    });

    it('should handle empty include patterns', async () => {
      const optionsWithoutInclude: ExtractOptions = {
        ...mockOptions,
        include: [],
      };
      mockedExtractAndWrite.mockResolvedValue(undefined);

      await extractMessages(optionsWithoutInclude);

      expect(mockedGlobSync).not.toHaveBeenCalled();
      expect(mockedExtractAndWrite).toHaveBeenCalledWith([], {
        ignore: optionsWithoutInclude.ignore,
        outFile: optionsWithoutInclude.outFile,
        throws: optionsWithoutInclude.throws,
      });
    });

    it('should pass through extract configuration correctly', async () => {
      const customOptions: ExtractOptions = {
        include: ['app/**/*.js'],
        ignore: ['app/test/**'],
        outFile: 'custom-messages.json',
        throws: false,
        idInterpolationPattern: '[contenthash:8]',
      };

      mockedGlobSync.mockReturnValue([]);
      mockedExtractAndWrite.mockResolvedValue(undefined);

      await extractMessages(customOptions);

      expect(mockedExtractAndWrite).toHaveBeenCalledWith([], {
        ignore: customOptions.ignore,
        outFile: customOptions.outFile,
        throws: customOptions.throws,
        idInterpolationPattern: customOptions.idInterpolationPattern,
      });
    });

    it('should handle extraction errors', async () => {
      const error = new Error('Extraction failed');
      mockedGlobSync.mockReturnValue([]);
      mockedExtractAndWrite.mockRejectedValue(error);

      await expect(extractMessages(mockOptions)).rejects.toThrow('Extraction failed');
    });
  });

  describe('extractMessage', () => {
    const mockOptions: ExtractOptions = {
      include: ['src/**/*.{ts,tsx}'],
      ignore: ['node_modules/**'],
      outFile: '/mock/project/messages.json',
      throws: true,
    };

    const mockFiles = [
      '/mock/project/src/component1.tsx',
      '/mock/project/src/component2.ts',
    ];

    beforeEach(() => {
      mockedLogger.debug.mockClear();
    });

    it('should extract and merge messages successfully', async () => {
      const mockExtractResult = JSON.stringify({
        'message.1': 'Hello',
        'message.2': 'World',
      });

      const existingMessages = JSON.stringify({
        'message.existing': 'Existing message',
        'message.1': 'Old hello', // This should be overwritten
      });

      const expectedMergedMessages = {
        'message.existing': 'Existing message',
        'message.1': 'Hello', // New value overwrites old
        'message.2': 'World',
      };

      mockedExtract.mockResolvedValue(mockExtractResult);
      mockedFs.readFile.mockResolvedValue(existingMessages);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessage(mockFiles, mockOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith('Extracting messages: ', mockFiles);
      expect(mockedExtract).toHaveBeenCalledWith(mockFiles, {
        ignore: mockOptions.ignore,
        outFile: mockOptions.outFile,
        throws: mockOptions.throws,
      });
      expect(mockedFs.readFile).toHaveBeenCalledWith(mockOptions.outFile, 'utf-8');
      expect(mockedLogger.debug).toHaveBeenCalledWith('Merged messages: ', expectedMergedMessages);
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        mockOptions.outFile,
        JSON.stringify(expectedMergedMessages, null, 2) + '\n'
      );
    });

    it('should handle empty existing messages file', async () => {
      const mockExtractResult = JSON.stringify({
        'message.1': 'Hello',
      });

      const existingMessages = JSON.stringify({});

      mockedExtract.mockResolvedValue(mockExtractResult);
      mockedFs.readFile.mockResolvedValue(existingMessages);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessage(mockFiles, mockOptions);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        mockOptions.outFile,
        JSON.stringify({ 'message.1': 'Hello' }, null, 2) + '\n'
      );
    });

    it('should handle extraction returning empty messages', async () => {
      const mockExtractResult = JSON.stringify({});
      const existingMessages = JSON.stringify({
        'message.existing': 'Existing message',
      });

      mockedExtract.mockResolvedValue(mockExtractResult);
      mockedFs.readFile.mockResolvedValue(existingMessages);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessage(mockFiles, mockOptions);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        mockOptions.outFile,
        JSON.stringify({ 'message.existing': 'Existing message' }, null, 2) + '\n'
      );
    });

    it('should handle file system errors when reading existing messages', async () => {
      const fsError = new Error('File not found');
      mockedExtract.mockResolvedValue(JSON.stringify({}));
      mockedFs.readFile.mockRejectedValue(fsError);

      await expect(extractMessage(mockFiles, mockOptions)).rejects.toThrow('File not found');
    });

    it('should handle file system errors when writing messages', async () => {
      const fsError = new Error('Permission denied');
      mockedExtract.mockResolvedValue(JSON.stringify({}));
      mockedFs.readFile.mockResolvedValue(JSON.stringify({}));
      mockedFs.writeFile.mockRejectedValue(fsError);

      await expect(extractMessage(mockFiles, mockOptions)).rejects.toThrow('Permission denied');
    });

    it('should handle invalid JSON in existing messages file', async () => {
      mockedExtract.mockResolvedValue(JSON.stringify({}));
      mockedFs.readFile.mockResolvedValue('invalid json');

      await expect(extractMessage(mockFiles, mockOptions)).rejects.toThrow();
    });

    it('should handle invalid JSON from extract result', async () => {
      mockedExtract.mockResolvedValue('invalid json');
      mockedFs.readFile.mockResolvedValue(JSON.stringify({}));

      await expect(extractMessage(mockFiles, mockOptions)).rejects.toThrow();
    });

    it('should preserve message structure and formatting', async () => {
      const complexMessages = {
        'message.with.complex.id': 'Simple message',
        'message.with.variables': 'Hello {name}!',
        'message.with.plural': '{count, plural, one {# item} other {# items}}',
      };

      const mockExtractResult = JSON.stringify(complexMessages);
      const existingMessages = JSON.stringify({});

      mockedExtract.mockResolvedValue(mockExtractResult);
      mockedFs.readFile.mockResolvedValue(existingMessages);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await extractMessage(mockFiles, mockOptions);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        mockOptions.outFile,
        JSON.stringify(complexMessages, null, 2) + '\n'
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work with real-world file patterns', () => {
      mockedMinimatch
        .mockReturnValueOnce(true) // matches src/**/*.{ts,tsx}
        .mockReturnValueOnce(false); // doesn't match node_modules/**

      const result = isFileInInclude(
        '/project/src/components/Button.tsx',
        ['src/**/*.{ts,tsx,js,jsx}'],
        ['node_modules/**', 'dist/**', '**/*.test.*']
      );

      expect(result).toBe(true);
    });

    it('should exclude test files correctly', () => {
      mockedMinimatch
        .mockReturnValueOnce(true) // matches src/**/*.{ts,tsx}
        .mockReturnValueOnce(false) // doesn't match node_modules/**
        .mockReturnValueOnce(false) // doesn't match dist/**
        .mockReturnValueOnce(true); // matches **/*.test.*

      const result = isFileInInclude(
        '/project/src/components/Button.test.tsx',
        ['src/**/*.{ts,tsx,js,jsx}'],
        ['node_modules/**', 'dist/**', '**/*.test.*']
      );

      expect(result).toBe(false);
    });
  });
});
