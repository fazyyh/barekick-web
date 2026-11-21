import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  build: { rollupOptions: { input: { app: 'index.html', modelPreview: 'model-preview.html' } } },
  server: {
    host: '0.0.0.0',
    https: {},
  },
});
