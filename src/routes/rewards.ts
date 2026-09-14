import { Router } from 'express';
import { RewardDistribution } from '../models/RewardDistribution';

export const rewardsRouter = Router();

// :address is the source of truth (see middleware/walletAddress.ts). An
// address with no reward history yields a zero balance and [], not a 404.
rewardsRouter.get('/:address', async (req, res) => {
  const distributions = await RewardDistribution.find({ walletAddress: req.params.address }).sort({
    distributedAt: -1,
  });

  const claimableUsdc = distributions
    .filter((distribution) => distribution.status === 'claimable')
    .reduce((sum, distribution) => sum + Number(distribution.amountUsdc), 0)
    .toFixed(2);

  res.json({ claimableUsdc, distributions });
});
