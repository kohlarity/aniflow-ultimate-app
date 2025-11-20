import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensures all paths in the final build are relative (./) instead of absolute (/)
  // This is crucial for deployment platforms like Vercel and for PWA offline caching.
  base: './', 
  
  build: {
    // Vite will automatically look for and include the manifest.json file
    // and correctly set up your PWA index.html links.
    manifest: true, 
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Ensures smaller chunks and faster loading for the heavy App.jsx file
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});