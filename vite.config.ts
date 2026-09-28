import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import express from 'express';
import { cfzRouter } from './src/server/cfzRouter.ts';

dotenv.config();

function apiDevServerPlugin(): Plugin {
  return {
    name: 'blackwatch-api-dev-server',
    configureServer(server) {
      const apiApp = express();
      apiApp.use(express.json());
      apiApp.use('/api', cfzRouter);

      server.middlewares.use(apiApp);
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiDevServerPlugin()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true
  }
});
