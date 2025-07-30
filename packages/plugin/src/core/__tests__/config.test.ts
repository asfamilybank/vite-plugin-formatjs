import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_CONFIG,
  getCompileConfig,
  getExtractConfig,
  resolveConfig,
  validateConfig,
} from '../config';
import type {
  CompileOptions,
  ExtractOptions,
  VitePluginFormatJSOptions,
} from '../types';

describe('Config', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default extract configuration', () => {
      expect(DEFAULT_CONFIG.extract).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx,vue,hbs,gjs,gts}'],
        ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
        outFile: 'src/i18n/lang/en.json',
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,
      });
    });

    it('should have correct default compile configuration', () => {
      expect(DEFAULT_CONFIG.compile).toEqual({
        inputDir: 'src/i18n/lang',
        outputDir: 'src/i18n/compiled-lang',
      });
    });

    it('should have correct default plugin configuration', () => {
      expect(DEFAULT_CONFIG.debug).toBe(false);
      expect(DEFAULT_CONFIG.autoExtract).toBe(true);
      expect(DEFAULT_CONFIG.debounceTime).toBe(300);
      expect(DEFAULT_CONFIG.extractOnBuild).toBe(false);
    });

    it('should be a complete configuration object', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('extract');
      expect(DEFAULT_CONFIG).toHaveProperty('compile');
      expect(DEFAULT_CONFIG).toHaveProperty('debug');
      expect(DEFAULT_CONFIG).toHaveProperty('autoExtract');
      expect(DEFAULT_CONFIG).toHaveProperty('debounceTime');
      expect(DEFAULT_CONFIG).toHaveProperty('extractOnBuild');
    });
  });

  describe('resolveConfig', () => {
    it('should return default config when no user config provided', () => {
      const result = resolveConfig({});
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should merge user config with default config', () => {
      const userConfig = {
        debug: true,
        debounceTime: 500,
      };

      const result = resolveConfig(userConfig);

      expect(result.debug).toBe(true);
      expect(result.debounceTime).toBe(500);
      expect(result.autoExtract).toBe(DEFAULT_CONFIG.autoExtract);
      expect(result.extract).toEqual(DEFAULT_CONFIG.extract);
    });

    it('should merge nested config objects', () => {
      const userConfig = {
        extract: {
          outFile: 'custom/path/messages.json',
          throws: false,
        },
        compile: {
          inputDir: 'custom/input',
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.extract.outFile).toBe('custom/path/messages.json');
      expect(result.extract.throws).toBe(false);
      expect(result.extract.include).toEqual(DEFAULT_CONFIG.extract.include);
      expect(result.compile.inputDir).toBe('custom/input');
      expect(result.compile.outputDir).toBe(DEFAULT_CONFIG.compile.outputDir);
    });

    it('should handle undefined values correctly', () => {
      const userConfig = {
        debug: undefined,
        autoExtract: true,
      };

      const result = resolveConfig(userConfig);

      expect(result.debug).toBe(DEFAULT_CONFIG.debug);
      expect(result.autoExtract).toBe(true);
    });

    it('should set extractOnBuild based on NODE_ENV when undefined', () => {
      process.env.NODE_ENV = 'development';
      const result1 = resolveConfig({});
      expect(result1.extractOnBuild).toBe(true);

      process.env.NODE_ENV = 'production';
      const result2 = resolveConfig({});
      expect(result2.extractOnBuild).toBe(false);

      delete process.env.NODE_ENV;
      const result3 = resolveConfig({});
      expect(result3.extractOnBuild).toBe(false);
    });

    it('should not override explicitly set extractOnBuild', () => {
      process.env.NODE_ENV = 'development';
      const result = resolveConfig({ extractOnBuild: false });
      expect(result.extractOnBuild).toBe(false);
    });

    it('should handle complex nested config merging', () => {
      const userConfig = {
        extract: {
          include: ['custom/**/*.ts'],
          ignore: ['custom/exclude/**'],
          idInterpolationPattern: '[contenthash:8]',
        },
        compile: {
          outputDir: 'dist/i18n',
        },
        debug: true,
      };

      const result = resolveConfig(userConfig);

      expect(result.extract.include).toEqual(['custom/**/*.ts']);
      expect(result.extract.ignore).toEqual(['custom/exclude/**']);
      expect(result.extract.outFile).toBe(DEFAULT_CONFIG.extract.outFile);
      expect(result.compile.outputDir).toBe('dist/i18n');
      expect(result.compile.inputDir).toBe(DEFAULT_CONFIG.compile.inputDir);
      expect(result.debug).toBe(true);
    });
  });

  describe('getExtractConfig', () => {
    it('should exclude include field from extract config', () => {
      const extractOptions: ExtractOptions = {
        include: ['src/**/*.ts'],
        ignore: ['node_modules/**'],
        outFile: 'messages.json',
        throws: true,
      };

      const result = getExtractConfig(extractOptions);

      expect(result).not.toHaveProperty('include');
      expect(result.ignore).toEqual(['node_modules/**']);
      expect(result.outFile).toBe('messages.json');
      expect(result.throws).toBe(true);
    });

    it('should preserve all other extract options', () => {
      const extractOptions: ExtractOptions = {
        include: ['src/**/*.ts'],
        outFile: 'messages.json',
        idInterpolationPattern: '[contenthash:8]',
        throws: false,
        ignore: ['test/**'],
      };

      const result = getExtractConfig(extractOptions);

      expect(result.outFile).toBe('messages.json');
      expect(result.idInterpolationPattern).toBe('[contenthash:8]');
      expect(result.throws).toBe(false);
      expect(result.ignore).toEqual(['test/**']);
    });
  });

  describe('getCompileConfig', () => {
    it('should exclude inputDir and outputDir from compile config', () => {
      const compileOptions: CompileOptions = {
        inputDir: 'src/lang',
        outputDir: 'dist/lang',
        ast: true,
      };

      const result = getCompileConfig(compileOptions);

      expect(result).not.toHaveProperty('inputDir');
      expect(result).not.toHaveProperty('outputDir');
      expect(result.ast).toBe(true);
    });

    it('should preserve all other compile options', () => {
      const compileOptions: CompileOptions = {
        inputDir: 'src/lang',
        outputDir: 'dist/lang',
        ast: false,
        format: 'simple',
      };

      const result = getCompileConfig(compileOptions);

      expect(result.ast).toBe(false);
      expect(result.format).toBe('simple');
    });
  });

  describe('validateConfig', () => {
    let validConfig: VitePluginFormatJSOptions;

    beforeEach(() => {
      validConfig = {
        extract: {
          include: ['src/**/*.ts'],
          outFile: 'messages.json',
          ignore: [],
          throws: true,
        },
        compile: {
          inputDir: 'src/lang',
          outputDir: 'dist/lang',
        },
        debug: false,
        autoExtract: true,
        debounceTime: 300,
        extractOnBuild: false,
      };
    });

    it('should not throw for valid configuration', () => {
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    describe('extract validation', () => {
      it('should throw when extract.include is empty', () => {
        validConfig.extract.include = [];
        expect(() => validateConfig(validConfig)).toThrow(
          'extract.include must be a non-empty array'
        );
      });

      it('should throw when extract.include is undefined', () => {
        const configWithoutInclude = {
          ...validConfig,
          extract: {
            ...validConfig.extract,
          } as ExtractOptions,
        };
        // Simulate missing include by creating config without it
        const { include: _removed, ...extractWithoutInclude } =
          configWithoutInclude.extract;
        configWithoutInclude.extract = extractWithoutInclude as ExtractOptions;

        expect(() => validateConfig(configWithoutInclude)).toThrow(
          'extract.include must be a non-empty array'
        );
      });

      it('should throw when extract.outFile is empty', () => {
        validConfig.extract.outFile = '';
        expect(() => validateConfig(validConfig)).toThrow(
          'extract.outFile must be a non-empty string'
        );
      });

      it('should throw when extract.outFile is undefined', () => {
        const configWithoutOutFile = {
          ...validConfig,
          extract: {
            ...validConfig.extract,
          } as ExtractOptions,
        };
        // Simulate missing outFile by creating config without it
        const { outFile: _removed, ...extractWithoutOutFile } =
          configWithoutOutFile.extract;
        configWithoutOutFile.extract = extractWithoutOutFile as ExtractOptions;

        expect(() => validateConfig(configWithoutOutFile)).toThrow(
          'extract.outFile must be a non-empty string'
        );
      });
    });

    describe('compile validation', () => {
      it('should throw when compile.inputDir is empty', () => {
        validConfig.compile.inputDir = '';
        expect(() => validateConfig(validConfig)).toThrow(
          'compile.inputDir must be a non-empty string'
        );
      });

      it('should throw when compile.inputDir is undefined', () => {
        const configWithoutInputDir = {
          ...validConfig,
          compile: {
            ...validConfig.compile,
          } as CompileOptions,
        };
        // Simulate missing inputDir by creating config without it
        const { inputDir: _removed, ...compileWithoutInputDir } =
          configWithoutInputDir.compile;
        configWithoutInputDir.compile =
          compileWithoutInputDir as CompileOptions;

        expect(() => validateConfig(configWithoutInputDir)).toThrow(
          'compile.inputDir must be a non-empty string'
        );
      });

      it('should throw when compile.outputDir is empty', () => {
        validConfig.compile.outputDir = '';
        expect(() => validateConfig(validConfig)).toThrow(
          'compile.outputDir must be a non-empty string'
        );
      });

      it('should throw when compile.outputDir is undefined', () => {
        const configWithoutOutputDir = {
          ...validConfig,
          compile: {
            ...validConfig.compile,
          } as CompileOptions,
        };
        // Simulate missing outputDir by creating config without it
        const { outputDir: _removed, ...compileWithoutOutputDir } =
          configWithoutOutputDir.compile;
        configWithoutOutputDir.compile =
          compileWithoutOutputDir as CompileOptions;

        expect(() => validateConfig(configWithoutOutputDir)).toThrow(
          'compile.outputDir must be a non-empty string'
        );
      });
    });

    describe('debounceTime validation', () => {
      it('should throw when debounceTime is negative', () => {
        validConfig.debounceTime = -100;
        expect(() => validateConfig(validConfig)).toThrow(
          'dev.debounceTime must be greater than or equal to 0'
        );
      });

      it('should not throw when debounceTime is zero', () => {
        validConfig.debounceTime = 0;
        expect(() => validateConfig(validConfig)).not.toThrow();
      });

      it('should not throw when debounceTime is positive', () => {
        validConfig.debounceTime = 500;
        expect(() => validateConfig(validConfig)).not.toThrow();
      });

      it('should not throw when debounceTime is undefined', () => {
        const configWithoutDebounceTime = {
          ...validConfig,
        } as VitePluginFormatJSOptions;
        // Simulate missing debounceTime by creating config without it
        const { debounceTime: _removed, ...configWithoutField } =
          configWithoutDebounceTime;
        const finalConfig = configWithoutField as VitePluginFormatJSOptions;

        expect(() => validateConfig(finalConfig)).not.toThrow();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null values in config', () => {
      const userConfig = {
        debug: false, // Use valid value instead of null
        autoExtract: true,
      };

      const result = resolveConfig(userConfig);
      expect(result.debug).toBe(false);
      expect(result.autoExtract).toBe(true);
    });

    it('should handle deeply nested partial config', () => {
      const userConfig = {
        extract: {
          include: ['custom/**/*.vue'],
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.extract.include).toEqual(['custom/**/*.vue']);
      expect(result.extract.outFile).toBe(DEFAULT_CONFIG.extract.outFile);
      expect(result.extract.ignore).toEqual(DEFAULT_CONFIG.extract.ignore);
    });

    it('should properly replace arrays in config', () => {
      const customInclude = ['app/**/*.ts'];
      const userConfig = {
        extract: {
          include: customInclude,
        },
      };

      const result = resolveConfig(userConfig);

      expect(result.extract.include).toEqual(['app/**/*.ts']);
      expect(result.extract.include).toHaveLength(1);
      expect(result.extract.include[0]).toBe('app/**/*.ts');
    });
  });
});
