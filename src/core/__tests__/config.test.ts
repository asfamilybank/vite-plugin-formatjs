import { describe, expect, it } from 'vitest';

import { getCompileConfig, getExtractConfig, resolveConfig } from '../config';
import type { FormatJSPluginOptions } from '../types';

describe('config.ts', () => {
  describe('DEFAULT_CONFIG', () => {
    it('应该包含所有必需的默认配置属性', () => {
      const config = resolveConfig();

      expect(config).toMatchObject({
        // 插件特有选项
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        ignore: ['node_modules', 'dist'],
        outFile: 'src/lang/en.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,

        // Extract 相关配置
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,

        // Compile 相关配置
        compileAst: true,
        compileFolder: 'src/lang',
        outFolder: 'src/compiled-lang',
        compileOnBuild: true,
      });
    });

    it('应该返回具有正确类型的配置对象', () => {
      const config = resolveConfig();

      // 插件特有选项
      expect(typeof config.debug).toBe('boolean');
      expect(typeof config.hotReload).toBe('boolean');
      expect(typeof config.extractOnBuild).toBe('boolean');
      expect(typeof config.outFile).toBe('string');
      expect(Array.isArray(config.include)).toBe(true);
      expect(Array.isArray(config.ignore)).toBe(true);

      // Extract 相关配置
      expect(typeof config.idInterpolationPattern).toBe('string');
      expect(typeof config.throws).toBe('boolean');

      // Compile 相关配置
      expect(typeof config.compileAst).toBe('boolean');
    });

    it('应该包含合理的默认值', () => {
      const config = resolveConfig();

      // 开发友好的默认值
      expect(config.debug).toBe(false);
      expect(config.hotReload).toBe(true);
      expect(config.extractOnBuild).toBe(false);

      // 合理的文件路径
      expect(config.include).toContain('src/**/*.{ts,tsx,js,jsx}');
      expect(config.ignore).toContain('node_modules');
      expect(config.ignore).toContain('dist');
      expect(config.outFile).toBe('src/lang/en.json');

      // 安全的默认值
      expect(config.throws).toBe(true);
      expect(config.compileAst).toBe(true);
    });
  });

  describe('resolveConfig', () => {
    it('应该在无参数时返回默认配置', () => {
      const config = resolveConfig();

      expect(config).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        ignore: ['node_modules', 'dist'],
        outFile: 'src/lang/en.json',
        debug: false,
        hotReload: true,
        extractOnBuild: false,
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,
        compileAst: true,
        compileFolder: 'src/lang',
        outFolder: 'src/compiled-lang',
        compileOnBuild: true,
      });
    });

    it('应该在传入空对象时返回默认配置', () => {
      const config = resolveConfig({});
      const defaultConfig = resolveConfig();

      expect(config).toEqual(defaultConfig);
    });

    it('应该正确合并用户配置与默认配置', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        debug: true,
        outFile: 'custom/messages.json',
        extractFormat: 'crowdin',
        compileFormat: 'simple',
        compileAst: false,
        compileFolder: 'custom/locales',
        compileOnBuild: false,
        outFolder: 'custom/compiled-lang',
      };

      const config = resolveConfig(userConfig);

      expect(config).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx}'], // 默认值保持
        ignore: ['node_modules', 'dist'], // 默认值保持
        outFile: 'custom/messages.json', // 用户配置覆盖
        debug: true, // 用户配置覆盖
        hotReload: true, // 默认值保持
        extractOnBuild: false, // 默认值保持
        idInterpolationPattern: '[sha512:contenthash:base64:6]', // 默认值保持
        throws: true, // 默认值保持
        extractFormat: 'crowdin', // 用户配置覆盖
        compileFormat: 'simple', // 用户配置覆盖
        compileAst: false, // 用户配置覆盖
        compileFolder: 'custom/locales', // 用户配置覆盖
        compileOnBuild: false, // 用户配置覆盖
        outFolder: 'custom/compiled-lang', // 用户配置覆盖
      });
    });

    it('应该完全替换数组属性而不是合并', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        include: ['custom/**/*.tsx'],
        ignore: ['build'],
      };

      const config = resolveConfig(userConfig);

      expect(config.include).toEqual(['custom/**/*.tsx']);
      expect(config.ignore).toEqual(['build']);
      // 验证没有包含默认的数组元素
      expect(config.include).not.toContain('src/**/*.{ts,tsx,js,jsx}');
      expect(config.ignore).not.toContain('node_modules');
      expect(config.ignore).not.toContain('dist');
    });

    it('应该处理复杂的用户配置', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        include: ['app/**/*.{ts,tsx}', 'components/**/*.tsx'],
        ignore: ['build', 'coverage', 'node_modules'],
        outFile: 'locales/extracted.json',
        debug: true,
        hotReload: false,
        extractOnBuild: true,
        idInterpolationPattern: '[hash:8]',
        throws: false,
        extractFormat: 'crowdin',
        extractAst: false,
        compileFormat: 'simple',
        compileAst: false,
        skipErrors: true,
        pseudoLocale: 'en-XA',
        ignoreTag: true,
        compileFolder: 'custom/locales',
        outFolder: 'custom/compiled-lang',
        compileOnBuild: false,
      };

      const config = resolveConfig(userConfig);

      expect(config).toEqual(userConfig);
    });

    it('应该处理部分数组配置', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        include: ['only-this-file.tsx'],
      };

      const config = resolveConfig(userConfig);

      expect(config.include).toEqual(['only-this-file.tsx']);
      expect(config.ignore).toEqual(['node_modules', 'dist']); // 保持默认
    });

    it('应该处理 falsy 值', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        debug: false,
        hotReload: false,
        extractOnBuild: false,
        throws: false,
        compileAst: false,
        extractAst: false,
        skipErrors: false,
        ignoreTag: false,
      };

      const config = resolveConfig(userConfig);

      expect(config.debug).toBe(false);
      expect(config.hotReload).toBe(false);
      expect(config.extractOnBuild).toBe(false);
      expect(config.throws).toBe(false);
      expect(config.compileAst).toBe(false);
      expect(config.extractAst).toBe(false);
      expect(config.skipErrors).toBe(false);
      expect(config.ignoreTag).toBe(false);
    });

    it('应该处理空字符串', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        outFile: '',
        idInterpolationPattern: '',
        pseudoLocale: undefined,
      };

      const config = resolveConfig(userConfig);

      expect(config.outFile).toBe('');
      expect(config.idInterpolationPattern).toBe('');
      expect(config.pseudoLocale).toBeUndefined();
    });

    it('应该处理空数组', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        include: [],
        ignore: [],
      };

      const config = resolveConfig(userConfig);

      expect(config.include).toEqual([]);
      expect(config.ignore).toEqual([]);
    });
  });

  describe('getExtractConfig', () => {
    it('应该返回 Extract 专用配置', () => {
      const config = resolveConfig({
        include: ['src/**/*.tsx'],
        debug: true,
        hotReload: false,
        extractOnBuild: true,
        outFile: 'messages.json',
        extractFormat: 'crowdin',
        extractAst: false,
        idInterpolationPattern: '[hash:8]',
        throws: false,
        compileAst: true,
        compileFormat: 'simple',
        skipErrors: true,
        pseudoLocale: 'en-XA',
        ignoreTag: true,
      });

      const extractConfig = getExtractConfig(config);

      expect(extractConfig).toEqual({
        outFile: 'messages.json',
        format: 'crowdin', // extractFormat 重命名为 format
        ast: false, // extractAst 重命名为 ast
        idInterpolationPattern: '[hash:8]',
        throws: false,
        ignore: ['node_modules', 'dist'],
      });

      // 确保插件特有选项被排除
      expect(extractConfig).not.toHaveProperty('include');
      expect(extractConfig).not.toHaveProperty('debug');
      expect(extractConfig).not.toHaveProperty('hotReload');
      expect(extractConfig).not.toHaveProperty('extractOnBuild');

      // 确保 compile 相关选项被排除
      expect(extractConfig).not.toHaveProperty('compileAst');
      expect(extractConfig).not.toHaveProperty('compileFormat');
      expect(extractConfig).not.toHaveProperty('skipErrors');
      expect(extractConfig).not.toHaveProperty('pseudoLocale');
      expect(extractConfig).not.toHaveProperty('ignoreTag');
    });

    it('应该处理未定义的 extractFormat', () => {
      const config = resolveConfig({
        outFile: 'messages.json',
      });

      const extractConfig = getExtractConfig(config);

      expect(extractConfig.format).toBeUndefined();
    });

    it('应该处理未定义的 extractAst', () => {
      const config = resolveConfig({
        outFile: 'messages.json',
      });

      const extractConfig = getExtractConfig(config);

      expect(extractConfig.ast).toBeUndefined();
    });
  });

  describe('getCompileConfig', () => {
    it('应该返回 Compile 专用配置', () => {
      const config = resolveConfig({
        include: ['src/**/*.tsx'],
        debug: true,
        hotReload: false,
        extractOnBuild: true,
        outFile: 'messages.json',
        extractFormat: 'crowdin',
        extractAst: false,
        idInterpolationPattern: '[hash:8]',
        throws: false,
        compileAst: true,
        compileFormat: 'simple',
        skipErrors: true,
        pseudoLocale: 'en-XA',
        ignoreTag: true,
      });

      const compileConfig = getCompileConfig(config);

      expect(compileConfig).toEqual({
        ast: true, // compileAst 重命名为 ast
        skipErrors: true,
        format: 'simple', // compileFormat 重命名为 format
        pseudoLocale: 'en-XA',
        ignoreTag: true,
      });
    });

    it('应该处理未定义的 compile 选项', () => {
      const config = resolveConfig({
        outFile: 'messages.json',
      });

      const compileConfig = getCompileConfig(config);

      expect(compileConfig).toEqual({
        ast: true, // 默认值
        skipErrors: undefined,
        format: undefined,
        pseudoLocale: undefined,
        ignoreTag: undefined,
      });
    });

    it('应该处理 falsy 值', () => {
      const config = resolveConfig({
        compileAst: false,
        skipErrors: false,
        ignoreTag: false,
      });

      const compileConfig = getCompileConfig(config);

      expect(compileConfig.ast).toBe(false);
      expect(compileConfig.skipErrors).toBe(false);
      expect(compileConfig.ignoreTag).toBe(false);
    });
  });

  describe('配置不可变性', () => {
    it('默认配置应该是不可变的', () => {
      const config1 = resolveConfig();
      const config2 = resolveConfig();

      // 修改一个配置不应该影响另一个
      config1.debug = true;
      expect(config2.debug).toBe(false);
    });

    it('返回的配置对象应该是新的实例', () => {
      const config1 = resolveConfig();
      const config2 = resolveConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('用户配置修改不应该影响后续调用', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        debug: true,
      };

      const config1 = resolveConfig(userConfig);

      // 修改用户配置
      userConfig.debug = false;
      userConfig.outFile = 'modified.json';

      const config2 = resolveConfig({ debug: true });

      expect(config1.debug).toBe(true);
      expect(config2.debug).toBe(true);
      expect(config1.outFile).toBe('src/lang/en.json');
      expect(config2.outFile).toBe('src/lang/en.json');
    });
  });

  describe('类型安全性', () => {
    it('应该返回完整的 FormatJSPluginOptions 类型', () => {
      const config = resolveConfig();

      // 验证所有必需属性都存在
      expect(config).toHaveProperty('include');
      expect(config).toHaveProperty('ignore');
      expect(config).toHaveProperty('outFile');
      expect(config).toHaveProperty('debug');
      expect(config).toHaveProperty('hotReload');
      expect(config).toHaveProperty('extractOnBuild');
      expect(config).toHaveProperty('idInterpolationPattern');
      expect(config).toHaveProperty('throws');
      expect(config).toHaveProperty('compileAst');
    });

    it('应该接受部分配置作为输入', () => {
      // 这些调用应该通过 TypeScript 类型检查
      expect(() => resolveConfig({})).not.toThrow();
      expect(() => resolveConfig({ debug: true })).not.toThrow();
      expect(() => resolveConfig({ include: ['test'] })).not.toThrow();
      expect(() => resolveConfig({ extractFormat: 'crowdin' })).not.toThrow();
      expect(() => resolveConfig({ compileFormat: 'simple' })).not.toThrow();
    });
  });

  describe('配置函数集成测试', () => {
    it('应该在完整工作流中正确分离配置', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        include: ['src/**/*.tsx'],
        debug: true,
        outFile: 'messages.json',
        extractFormat: 'crowdin',
        extractAst: false,
        idInterpolationPattern: '[hash:8]',
        compileFormat: 'simple',
        compileAst: true,
        skipErrors: true,
        pseudoLocale: 'en-XA',
        compileFolder: 'custom/lang',
      };

      const config = resolveConfig(userConfig);
      const extractConfig = getExtractConfig(config);
      const compileConfig = getCompileConfig(config);

      // 验证配置正确分离
      expect(extractConfig).toEqual({
        outFile: 'messages.json',
        format: 'crowdin',
        ast: false,
        idInterpolationPattern: '[hash:8]',
        throws: true,
        ignore: ['node_modules', 'dist'],
      });

      expect(compileConfig).toEqual({
        ast: true,
        skipErrors: true,
        format: 'simple',
        pseudoLocale: 'en-XA',
        ignoreTag: undefined,
      });
    });
  });
});
