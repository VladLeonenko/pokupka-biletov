import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

/** Separate SSR bundle for ticket/home React renderToString (Node / Express). */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    ssr: path.resolve(__dirname, 'src/ssr/renderTickets.tsx'),
    outDir: 'dist-ssr',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'renderTickets.js',
        format: 'esm',
      },
    },
  },
  ssr: {
    // Bundle UI stack; leave Node builtins external.
    noExternal: [
      /@mui\/.*/,
      /@emotion\/.*/,
      /framer-motion/,
      /dompurify/,
      /gsap/,
      /^through$/,
      /html-tokenize/,
      /multipipe/,
      /duplexer2/,
      /readable-stream/,
      /string_decoder/,
      /core-util-is/,
      /isarray/,
      /process-nextick-args/,
      /safe-buffer/,
      /util-deprecate/,
    ],
  },
});


