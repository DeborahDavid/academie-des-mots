/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` = nom du dépôt GitHub Pages en production.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/academie-des-mots/' : '/',
  plugins: [react()],
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
}));
