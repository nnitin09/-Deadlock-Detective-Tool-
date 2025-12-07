import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This base URL is CRITICAL for GitHub Pages. 
  // It tells the app it is running at https://user.github.io/Deadlock-Detective-Tool/
  base: '/Deadlock-Detective-Tool/', 
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});