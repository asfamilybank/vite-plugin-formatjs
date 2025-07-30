import { describe, expect, it } from 'vitest';

import { PLUGIN_NAME } from '../constant';

describe('Constants', () => {
  describe('PLUGIN_NAME', () => {
    it('should have correct plugin name', () => {
      expect(PLUGIN_NAME).toBe('vite-plugin-formatjs');
    });

    it('should be a string type', () => {
      expect(typeof PLUGIN_NAME).toBe('string');
    });

    it('should not be empty', () => {
      expect(PLUGIN_NAME).toBeTruthy();
      expect(PLUGIN_NAME.length).toBeGreaterThan(0);
    });

    it('should follow expected naming convention', () => {
      expect(PLUGIN_NAME).toMatch(/^vite-plugin-/);
      expect(PLUGIN_NAME).not.toContain(' '); // No spaces
      expect(PLUGIN_NAME).not.toContain('_'); // No underscores
      expect(PLUGIN_NAME).toMatch(/^[a-z-]+$/); // Only lowercase and hyphens
    });

    it('should be consistent across multiple references', () => {
      // Test that the constant maintains the same value
      const firstRef = PLUGIN_NAME;
      const secondRef = PLUGIN_NAME;
      expect(firstRef).toBe(secondRef);
    });
  });

  describe('Module exports', () => {
    it('should be importable as named export', () => {
      // Test that the import works correctly
      expect(PLUGIN_NAME).toBeDefined();
    });

    it('should have expected value format for vite plugin', () => {
      // Plugin names should be descriptive and follow vite conventions
      expect(PLUGIN_NAME).toMatch(/formatjs/);
      expect(PLUGIN_NAME.split('-')).toHaveLength(3); // vite-plugin-formatjs
    });
  });
});
