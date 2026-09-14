import { RewardDistribution, RewardDistributionDocument } from '../models/RewardDistribution';
import { HydratedDocument } from 'mongoose';

export function getRewardDistributionsByAddress(walletAddress: string) {
  return RewardDistribution.find({ walletAddress }).sort({ distributedAt: -1 });
}

export function sumClaimableUsdc(distributions: HydratedDocument<RewardDistributionDocument>[]): string {
  return distributions
    .filter((distribution) => distribution.status === 'claimable')
    .reduce((sum, distribution) => sum + Number(distribution.amountUsdc), 0)
    .toFixed(2);
}
