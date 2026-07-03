import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Vasthara',
          short_name: 'Vasthara',
          description: 'Vasthara Financial Services',
          theme_color: '#0F172A',
          background_color: '#FAFAFA',
          display: 'standalone',
          icons: [
            {
              src: 'vasthara-icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'vasthara-icon.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10485760 // 10 MB
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      minify: 'esbuild' as const,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            xlsx: ['xlsx'],
          }
        }
      }
    },
    esbuild: {
      drop: ['console' as const, 'debugger' as const],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'https://santosh-instyle-vasthara.vercel.app',
          changeOrigin: true,
          secure: true,
        }
      }
    },
  };
});
