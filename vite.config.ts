// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'), // 入口文件
      name: 'SvgFlow', // UMD 全局变量名
      fileName: format => `svgflow.${format}.js`,
      formats: ['umd', 'es'], // 同时生成 UMD 和 ESM
    },
    rollupOptions: {
      // 确保外部化处理那些你不希望打包进库的依赖
      external: [],
      output: {
        globals: {},
      },
    },
    outDir: 'dist', // 输出到 dist 目录
    sourcemap: true,
  },
});
