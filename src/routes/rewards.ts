import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AppError } from '../utils/errors';
import { RewardDistribution } from '../models/RewardDistribution';
import { getRewardDistributionsByAddress, sumClaimableUsdc } from '../services/reward.service';

export const rewardsRouter = Router();

// :address is the source of truth (see middleware/walletAddress.ts). An
// address with no reward history yields a zero balance and [], not a 404.
rewardsRouter.get('/:address', async (req, res) => {
  const distributions = await getRewardDistributionsByAddress(req.params.address);
  res.json({ claimableUsdc: sumClaimableUsdc(distributions), distributions });
});

const claimBodySchema = z.object({
  address: z.string().min(1),
});

// Initiates a claim of the caller's full claimable balance (README's "On
// claiming" section). This sweeps every 'claimable' RewardDistribution for
// the address to 'claimed' — there's no third "pending" state in the
// RewardDistribution schema, so "claim-initiated" is expressed only in this
// response, not persisted as a distinct document status.
//
// If a contributor has more than one claimable distribution at once (e.g.
// an unclaimed payout lingering from an older wave), all of them are
// claimed together, but the locked-down response shape only carries a
// single distributionId — the most recently distributed one stands in as
// the reference. Flagging this as a known v1 simplification: it fits how
// the seed data behaves (at most one wave's payouts sit "claimable" at a
// time) but would need a real multi-distribution response shape if that
// assumption ever stops holding.
rewardsRouter.post('/claim', validate('body', claimBodySchema), async (_req, res) => {
  const { address } = res.locals.validated as { address: string };
  const distributions = await getRewardDistributionsByAddress(address);
  const claimable = distributions.filter((distribution) => distribution.status === 'claimable');

  if (claimable.length === 0) {
    throw new AppError(400, 'No claimable rewards for this address');
  }

  await RewardDistribution.updateMany(
    { _id: { $in: claimable.map((distribution) => distribution._id) } },
    { $set: { status: 'claimed' } },
  );

  const [primary] = claimable; // already sorted by distributedAt desc

  res.json({
    distributionId: primary.id,
    status: 'claim_initiated',
    // Placeholder until the real Soroban claim-contract interface exists
    // (see README's "On claiming" section). This endpoint only does
    // server-side bookkeeping — it never holds or signs contributor funds;
    // actual on-chain settlement happens client-side via the contributor's
    // own wallet (Stellar Wallets Kit) once that contract is finalized.
    transactionParams: null,
  });
});
