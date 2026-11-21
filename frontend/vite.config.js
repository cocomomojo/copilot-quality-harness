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
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/test-setup.js',
        'src/test-utils.jsx',
        'src/main.jsx',
        // Legacy UI not mounted from App.jsx (kept for reference, excluded from KPI coverage)
        'src/AppRouter.jsx',
        'src/UserProfile.jsx',
        'src/components/Header.jsx',
        'src/components/LoadingSpinner.jsx',
        'src/components/QualityChecksForm.jsx',
        'src/pages/DashboardPage.jsx',
        'src/pages/HomePage.jsx',
        'src/pages/NotFoundPage.jsx',
        'src/pages/QualityChecksPage.jsx',
        'src/pages/SettingsPage.jsx',
        'src/pages/URLValidatorPage.jsx',
        'src/utils/dateFormatter.js'
      ]
    }
  },
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
