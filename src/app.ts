import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    logger.error('Unhandled error', { err });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
