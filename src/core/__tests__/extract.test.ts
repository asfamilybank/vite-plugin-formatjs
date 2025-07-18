import { extractAndWrite } from '@formatjs/cli-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractMessages, isFileInInclude } from '../extract';

// Mock 外部依赖
vi.mock('@formatjs/cli-lib', () => ({
  extractAndWrite: vi.fn(),
}));

vi.mock(':utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// 导入 mocked 依赖
import type { ExtractOptions } from ':core/types';
import { logger } from ':utils/logger';

const mockedExtractAndWrite = vi.mocked(extractAndWrite);
const mockedLogger = vi.mocked(logger);

describe('extract.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isFileInInclude 函数', () => {
    it('应该正确匹配包含的文件', () => {
      const include = ['src/**/*.tsx', 'src/**/*.ts'];
      const ignore: string[] = [];

      expect(
        isFileInInclude('src/components/Button.tsx', include, ignore)
      ).toBe(true);
      expect(isFileInInclude('src/utils/helper.ts', include, ignore)).toBe(
        true
      );
    });

    it('应该正确排除不匹配的文件', () => {
      const include = ['src/**/*.tsx', 'src/**/*.ts'];
      const ignore: string[] = [];

      expect(isFileInInclude('public/index.html', include, ignore)).toBe(false);
      expect(isFileInInclude('src/styles/main.css', include, ignore)).toBe(
        false
      );
    });

    it('应该正确处理忽略模式', () => {
      const include = ['src/**/*.ts'];
      const ignore = ['**/*.test.ts', '**/*.spec.ts'];

      expect(isFileInInclude('src/utils/helper.ts', include, ignore)).toBe(
        true
      );
      expect(isFileInInclude('src/utils/helper.test.ts', include, ignore)).toBe(
        false
      );
      expect(
        isFileInInclude('src/components/Button.spec.ts', include, ignore)
      ).toBe(false);
    });

    it('应该处理空的包含模式', () => {
      const include: string[] = [];
      const ignore: string[] = [];

      expect(
        isFileInInclude('src/components/Button.tsx', include, ignore)
      ).toBe(false);
    });

    it('应该正确处理路径分隔符', () => {
      const include = ['src/**/*.ts'];
      const ignore: string[] = [];

      // 测试不同的路径分隔符
      expect(
        isFileInInclude('src\\components\\Button.ts', include, ignore)
      ).toBe(true);
      expect(isFileInInclude('src/components/Button.ts', include, ignore)).toBe(
        true
      );
    });
  });

  describe('extractMessages 函数', () => {
    const mockExtractOptions: ExtractOptions = {
      include: ['src/**/*.{ts,tsx}'],
      outFile: 'src/locales/messages.json',
      idInterpolationPattern: '[sha512:contenthash:base64:6]',
      throws: true,
    };

    it('应该成功提取消息', async () => {
      mockedExtractAndWrite.mockResolvedValue();

      const duration = await extractMessages(mockExtractOptions);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(mockedExtractAndWrite).toHaveBeenCalledWith(
        mockExtractOptions.include,
        expect.objectContaining({
          outFile: mockExtractOptions.outFile,
          idInterpolationPattern: mockExtractOptions.idInterpolationPattern,
          throws: mockExtractOptions.throws,
        })
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '开始提取消息',
        expect.objectContaining({
          include: mockExtractOptions.include,
          outFile: mockExtractOptions.outFile,
        })
      );
    });

    it('应该在缺少必需参数时抛出错误', async () => {
      const invalidOptions: Partial<ExtractOptions> = {
        include: [],
      };

      await expect(
        extractMessages(invalidOptions as ExtractOptions)
      ).rejects.toThrow('extract.include 和 extract.outFile 是必需的配置项');
    });

    it('应该在 extractAndWrite 失败时抛出错误', async () => {
      const error = new Error('提取失败');
      mockedExtractAndWrite.mockRejectedValue(error);

      await expect(extractMessages(mockExtractOptions)).rejects.toThrow(
        '提取失败'
      );
    });

    it('应该记录调试信息', async () => {
      mockedExtractAndWrite.mockResolvedValue();

      await extractMessages(mockExtractOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '开始提取消息',
        expect.objectContaining({
          include: mockExtractOptions.include,
          outFile: mockExtractOptions.outFile,
        })
      );
    });

    it('应该返回提取耗时', async () => {
      mockedExtractAndWrite.mockResolvedValue();

      const startTime = Date.now();
      const duration = await extractMessages(mockExtractOptions);
      const endTime = Date.now();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThanOrEqual(endTime - startTime + 10); // 允许10ms误差
    });
  });
});
