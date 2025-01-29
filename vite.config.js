import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',  // Set root to project root
  base: '/',
  publicDir: 'public',
  server: {
    port: 5173,
    open: 'index.html'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}); 