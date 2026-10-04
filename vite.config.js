import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site at /<repo-name>/ — must match the repo name exactly
  base: '/Colorado_River_Online/',
});
