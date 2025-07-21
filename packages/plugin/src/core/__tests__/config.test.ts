import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BUILD_CONFIG,
  DEFAULT_COMPILE_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_DEV_CONFIG,
  DEFAULT_EXTRACT_CONFIG,
  getCompileConfig,
  getExtractConfig,
  resolveConfig,
  validateConfig,
} from '../config';
import type { UserFormatJSConfig, VitePluginFormatJSOptions } from '../types';

describe('config.ts', () => {
  describe('默认配置常量', () => {
    it('DEFAULT_EXTRACT_CONFIG 应该包含正确的默认值', () => {
      expect(DEFAULT_EXTRACT_CONFIG).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx,vue,hbs,gjs,gts}'],
        ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
        outFile: 'src/lang/en.json',
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,
      });
    });

    it('DEFAULT_COMPILE_CONFIG 应该包含正确的默认值', () => {
      expect(DEFAULT_COMPILE_CONFIG).toEqual({
        inputDir: 'src/lang',
        outputDir: 'src/compiled-lang',
      });
    });

    it('DEFAULT_DEV_CONFIG 应该包含正确的默认值', () => {
      expect(DEFAULT_DEV_CONFIG).toEqual({
        hotReload: true,
        autoExtract: true,
        debounceTime: 300,
      });
    });

    it('DEFAULT_BUILD_CONFIG 应该包含正确的默认值', () => {
      expect(DEFAULT_BUILD_CONFIG).toEqual({
        extractOnBuild: true,
        compileOnBuild: true,
      });
    });

    it('DEFAULT_CONFIG 应该包含所有分组配置', () => {
      expect(DEFAULT_CONFIG).toEqual({
        extract: DEFAULT_EXTRACT_CONFIG,
        compile: DEFAULT_COMPILE_CONFIG,
        dev: DEFAULT_DEV_CONFIG,
        build: DEFAULT_BUILD_CONFIG,
        debug: false,
      });
    });
  });

  describe('resolveConfig 函数', () => {
    it('应该返回默认配置当没有用户配置时', () => {
      const result = resolveConfig();
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('应该正确合并用户提供的 extract 配置', () => {
      const userConfig: UserFormatJSConfig = {
        extract: {
          include: ['custom/**/*.ts'],
          outFile: 'custom/messages.json',
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.extract).toEqual({
        ...DEFAULT_EXTRACT_CONFIG,
        include: ['custom/**/*.ts'],
        outFile: 'custom/messages.json',
      });
    });

    it('应该正确合并用户提供的 compile 配置', () => {
      const userConfig: UserFormatJSConfig = {
        compile: {
          inputDir: 'custom/lang',
          outputDir: 'custom/compiled',
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.compile).toEqual({
        ...DEFAULT_COMPILE_CONFIG,
        inputDir: 'custom/lang',
        outputDir: 'custom/compiled',
      });
    });

    it('应该正确合并用户提供的 dev 配置', () => {
      const userConfig: UserFormatJSConfig = {
        dev: {
          hotReload: false,
          debounceTime: 500,
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.dev).toEqual({
        ...DEFAULT_DEV_CONFIG,
        hotReload: false,
        debounceTime: 500,
      });
    });

    it('应该正确合并用户提供的 build 配置', () => {
      const userConfig: UserFormatJSConfig = {
        build: {
          extractOnBuild: false,
          compileOnBuild: false,
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.build).toEqual({
        extractOnBuild: false,
        compileOnBuild: false,
      });
    });

    it('应该正确设置 debug 配置', () => {
      const userConfig: UserFormatJSConfig = {
        debug: true,
      };

      const result = resolveConfig(userConfig);

      expect(result.debug).toBe(true);
    });

    it('应该能够同时合并多个配置分组', () => {
      const userConfig: UserFormatJSConfig = {
        extract: {
          include: ['app/**/*.ts'],
        },
        dev: {
          hotReload: false,
        },
        debug: true,
      };

      const result = resolveConfig(userConfig);

      expect(result.extract.include).toEqual(['app/**/*.ts']);
      expect(result.dev.hotReload).toBe(false);
      expect(result.debug).toBe(true);
      // 其他配置应该保持默认值
      expect(result.compile).toEqual(DEFAULT_COMPILE_CONFIG);
      expect(result.build).toEqual(DEFAULT_BUILD_CONFIG);
    });
  });

  describe('getExtractConfig 函数', () => {
    it('应该排除插件特有的字段', () => {
      const extractOptions = {
        include: ['src/**/*.ts'],
        ignore: ['**/*.test.ts'],
        outFile: 'messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
      };

      const result = getExtractConfig(extractOptions);

      expect(result).toEqual({
        outFile: 'messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
        ignore: ['**/*.test.ts'],
      });
      expect(result).not.toHaveProperty('include');
    });

    it('应该保留 @formatjs/cli-lib 的配置选项', () => {
      const extractOptions = {
        include: ['src/**/*.ts'],
        outFile: 'messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
        pragma: '@formatjs',
        removeDefaultMessage: true,
      };

      const result = getExtractConfig(extractOptions);

      expect(result).toEqual({
        outFile: 'messages.json',
        idInterpolationPattern: '[hash]',
        throws: true,
        pragma: '@formatjs',
        removeDefaultMessage: true,
      });
    });
  });

  describe('getCompileConfig 函数', () => {
    it('应该排除插件特有的字段', () => {
      const compileOptions = {
        inputDir: 'src/lang',
        outputDir: 'src/compiled',
        ast: true,
        skipErrors: false,
      };

      const result = getCompileConfig(compileOptions);

      expect(result).toEqual({
        ast: true,
        skipErrors: false,
      });
      expect(result).not.toHaveProperty('inputDir');
      expect(result).not.toHaveProperty('outputDir');
    });

    it('应该保留 @formatjs/cli-lib 的配置选项', () => {
      const compileOptions = {
        inputDir: 'src/lang',
        outputDir: 'src/compiled',
        ast: true,
        skipErrors: false,
        format: 'simple',
        pseudoLocale: 'en-XA' as const,
      };

      const result = getCompileConfig(compileOptions);

      expect(result).toEqual({
        ast: true,
        skipErrors: false,
        format: 'simple',
        pseudoLocale: 'en-XA',
      });
    });
  });

  describe('validateConfig 函数', () => {
    const validConfig: VitePluginFormatJSOptions = {
      extract: {
        include: ['src/**/*.ts'],
        outFile: 'messages.json',
      },
      compile: {
        inputDir: 'src/lang',
        outputDir: 'src/compiled',
      },
      dev: {
        hotReload: true,
        autoExtract: true,
        debounceTime: 300,
      },
      build: {
        extractOnBuild: true,
        compileOnBuild: true,
      },
      debug: false,
    };

    it('应该通过有效配置的验证', () => {
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('应该在 extract.include 为空时抛出错误', () => {
      const invalidConfig = {
        ...validConfig,
        extract: {
          ...validConfig.extract,
          include: [],
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        'extract.include 必须是非空数组'
      );
    });

    it('应该在 extract.outFile 为空时抛出错误', () => {
      const invalidConfig = {
        ...validConfig,
        extract: {
          ...validConfig.extract,
          outFile: '',
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        'extract.outFile 不能为空'
      );
    });

    it('应该在 compile.inputDir 为空时抛出错误', () => {
      const invalidConfig = {
        ...validConfig,
        compile: {
          ...validConfig.compile,
          inputDir: '',
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        'compile.inputDir 不能为空'
      );
    });

    it('应该在 compile.outputDir 为空时抛出错误', () => {
      const invalidConfig = {
        ...validConfig,
        compile: {
          ...validConfig.compile,
          outputDir: '',
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        'compile.outputDir 不能为空'
      );
    });

    it('应该在 dev.debounceTime 为负数时抛出错误', () => {
      const invalidConfig = {
        ...validConfig,
        dev: {
          ...validConfig.dev,
          debounceTime: -100,
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow(
        'dev.debounceTime 必须大于等于 0'
      );
    });

    it('应该允许 dev.debounceTime 为 0', () => {
      const configWithZeroDebounce = {
        ...validConfig,
        dev: {
          ...validConfig.dev,
          debounceTime: 0,
        },
      };

      expect(() => validateConfig(configWithZeroDebounce)).not.toThrow();
    });
  });
});
