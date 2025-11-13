import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/hot-update.ts'],
  format: ['esm'],
  tsconfig: 'tsconfig.build.json',
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
