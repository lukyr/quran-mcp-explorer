/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Read version from package.json
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
  );

  // Validate environment variables in development
  if (mode === 'development' && !env.VITE_GEMINI_API_KEY) {
    console.warn('⚠️  VITE_GEMINI_API_KEY not set. Please copy .env.example to .env.local and add your API key.');
  }

  return {
    define: {
      '__APP_VERSION__': JSON.stringify(packageJson.version),
    },

    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Sahabat Quran',
          short_name: 'SahabatQuran',
          description: 'Aplikasi Sahabat Quran dengan fitur AI',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          id: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],

    // Proxy API requests to Express server in development
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },

    build: {
      // Optimize bundle
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        },
      },

      // Code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'gemini-vendor': ['@google/genai'],
          },
        },
      },

      // Source maps for debugging
      sourcemap: mode === 'development',
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      css: true,
    },

    // Preview server configuration
    preview: {
      port: 3000,
      strictPort: true,
    },
  };
});
