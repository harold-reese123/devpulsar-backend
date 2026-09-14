import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { getLeaderboard, LeaderboardScope } from '../services/contribution.service';

export const leaderboardRouter = Router();

const leaderboardQuerySchema = z.object({
  scope: z.enum(['wave', 'all-time']).default('wave'),
});

leaderboardRouter.get('/', validate('query', leaderboardQuerySchema), async (_req, res) => {
  const { scope } = res.locals.validated as { scope: LeaderboardScope };
  const leaderboard = await getLeaderboard(scope);
  res.json(leaderboard);
});
