import { defineConfig } from 'vite';

export default defineConfig({
  // Root is where index.html is located
  root: '.',

  // Public directory for static assets (copied as-is to dist)
  publicDir: 'public',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for debugging
    sourcemap: false,

    // Ensure assets get hashed filenames for cache busting
    rollupOptions: {
      output: {
        // Use content hash in filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  server: {
    // Dev server port
    port: 3110,

    // Proxy API requests to Express server
    proxy: {
      '/api': {
        target: 'http://localhost:5110',
        changeOrigin: true
      }
    }
  },

  preview: {
    port: 3110
  }
});
