import { Router } from 'express';
import { getContributionsByAddress } from '../services/contribution.service';

export const contributionsRouter = Router();

// :address is the source of truth here (see middleware/walletAddress.ts) —
// this is a public read of that contributor's history, independent of
// which wallet is currently connected. An address with no contributions
// yields [] rather than a 404, since "no history yet" isn't an error.
contributionsRouter.get('/:address', async (req, res) => {
  const contributions = await getContributionsByAddress(req.params.address);
  res.json(contributions);
});
