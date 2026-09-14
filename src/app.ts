import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';
import { walletAddress } from './middleware/walletAddress';
import { contributionsRouter } from './routes/contributions';
import { waveRouter } from './routes/wave';
import { leaderboardRouter } from './routes/leaderboard';
import { rewardsRouter } from './routes/rewards';
import { webhooksRouter } from './routes/webhooks';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(walletAddress);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/contributions', contributionsRouter);
  app.use('/wave', waveRouter);
  app.use('/leaderboard', leaderboardRouter);
  app.use('/rewards', rewardsRouter);
  app.use('/webhooks', webhooksRouter);

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
