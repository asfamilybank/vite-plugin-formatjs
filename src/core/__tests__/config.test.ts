import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../config';
import type { FormatJSPluginOptions } from '../types';

describe('config.ts', () => {
  describe('DEFAULT_CONFIG', () => {
    it('应该包含所有必需的默认配置属性', () => {
      const config = resolveConfig();

      expect(config).toMatchObject({
        // 插件特有选项
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        ignore: ['node_modules', 'dist'],
        outFile: 'src/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        // @formatjs/cli-lib 选项
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
      });
    });

    it('应该返回具有正确类型的配置对象', () => {
      const config = resolveConfig();

      expect(typeof config.debug).toBe('boolean');
      expect(typeof config.hotReload).toBe('boolean');
      expect(typeof config.extractOnBuild).toBe('boolean');
      expect(typeof config.outFile).toBe('string');
      expect(typeof config.idInterpolationPattern).toBe('string');
      expect(Array.isArray(config.include)).toBe(true);
      expect(Array.isArray(config.ignore)).toBe(true);
    });

    it('应该包含合理的默认值', () => {
      const config = resolveConfig();

      // 开发友好的默认值
      expect(config.debug).toBe(false);
      expect(config.hotReload).toBe(true);
      expect(config.extractOnBuild).toBe(true);

      // 合理的文件路径
      expect(config.include).toContain('src/**/*.{ts,tsx,js,jsx}');
      expect(config.ignore).toContain('node_modules');
      expect(config.ignore).toContain('dist');
      expect(config.outFile).toBe('src/locales/messages.json');
    });
  });

  describe('resolveConfig', () => {
    it('应该在无参数时返回默认配置', () => {
      const config = resolveConfig();

      expect(config).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        ignore: ['node_modules', 'dist'],
        outFile: 'src/locales/messages.json',
        debug: false,
        hotReload: true,
        extractOnBuild: true,
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        throws: true,
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
      };

      const config = resolveConfig(userConfig);

      expect(config).toEqual({
        include: ['src/**/*.{ts,tsx,js,jsx}'], // 默认值保持
        ignore: ['node_modules', 'dist'], // 默认值保持
        outFile: 'custom/messages.json', // 用户配置覆盖
        debug: true, // 用户配置覆盖
        hotReload: true, // 默认值保持
        extractOnBuild: true, // 默认值保持
        idInterpolationPattern: '[sha512:contenthash:base64:6]', // 默认值保持
        throws: true,
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
        extractOnBuild: false,
        idInterpolationPattern: '[hash:8]',
        throws: true,
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
      };

      const config = resolveConfig(userConfig);

      expect(config.debug).toBe(false);
      expect(config.hotReload).toBe(false);
      expect(config.extractOnBuild).toBe(false);
    });

    it('应该处理空字符串', () => {
      const userConfig: Partial<FormatJSPluginOptions> = {
        outFile: '',
        idInterpolationPattern: '',
      };

      const config = resolveConfig(userConfig);

      expect(config.outFile).toBe('');
      expect(config.idInterpolationPattern).toBe('');
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
      expect(config1.outFile).toBe('src/locales/messages.json');
      expect(config2.outFile).toBe('src/locales/messages.json');
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
    });

    it('应该接受部分配置作为输入', () => {
      // 这些调用应该通过 TypeScript 类型检查
      expect(() => resolveConfig({})).not.toThrow();
      expect(() => resolveConfig({ debug: true })).not.toThrow();
      expect(() => resolveConfig({ include: ['test'] })).not.toThrow();
    });
  });
});
