import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { cfzRouter } from './src/server/cfzRouter.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security and CORS Headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-player, x-gemini-api-key, x-gemini-key');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount API Routes FIRST
  app.use('/api', cfzRouter);

  // Global JSON Error Handler for API routes
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Server Error]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({
      error: err?.message || 'Internal server error',
      status: err.status || 500
    });
  });

  // Serve static assets from public/static fallback
  app.use('/static', express.static(path.join(process.cwd(), 'public/static')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CASE FILE ZERO] Investigating Officer Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
