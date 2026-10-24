import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin for SPA routing fallback
const spaFallback = () => ({
  name: 'spa-fallback',
  configureServer(server) {
    return () => {
      server.middlewares.use((req, res, next) => {
        // Skip API calls, assets, and files with extensions
        if (req.url.startsWith('/api') || /\.(\w+)(\?.*)?$/.test(req.url)) {
          return next();
        }
        // For all other routes, serve index.html
        req.url = '/index.html';
        next();
      });
    };
  }
});

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' }
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js', coverage: { reporter: ['text', 'json-summary'] } },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
