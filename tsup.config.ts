import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'node16',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  outDir: 'dist',
  external: ['vite'],
  treeshake: true,
  bundle: true,
  banner: {
    js: '// vite-plugin-formatjs',
  },
}); 