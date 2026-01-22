import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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

    plugins: [react()],

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

    // Preview server configuration
    preview: {
      port: 3000,
      strictPort: true,
    },
  };
});
