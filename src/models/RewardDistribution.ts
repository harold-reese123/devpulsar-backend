import { Schema, model, Types } from 'mongoose';
import { applyJsonTransform } from '../utils/mongooseJson';

export type RewardDistributionStatus = 'claimable' | 'claimed';

export interface RewardDistributionDocument {
  waveId: Types.ObjectId;
  amountUsdc: string;
  status: RewardDistributionStatus;
  txHash: string | null;
  distributedAt: Date;
  /** Internal link to the owning Contributor — not part of the public response shape. */
  walletAddress: string;
}

const rewardDistributionSchema = new Schema<RewardDistributionDocument>({
  waveId: { type: Schema.Types.ObjectId, ref: 'Wave', required: true, index: true },
  amountUsdc: { type: String, required: true },
  status: { type: String, required: true, enum: ['claimable', 'claimed'], index: true },
  txHash: { type: String, default: null },
  distributedAt: { type: Date, required: true },
  walletAddress: { type: String, required: true, index: true },
});

applyJsonTransform(rewardDistributionSchema, ['walletAddress']);

export const RewardDistribution = model<RewardDistributionDocument>(
  'RewardDistribution',
  rewardDistributionSchema,
);
