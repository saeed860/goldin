import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths work for both username.github.io and project Pages URLs.
export default defineConfig({
  plugins: [react()],
  base: './',
});
