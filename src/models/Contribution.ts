import { Schema, model, Types } from 'mongoose';
import { applyJsonTransform } from '../utils/mongooseJson';

export type ContributionStatus = 'points_assigned' | 'reward_queued' | 'rewarded';

export interface ContributionDocument {
  repo: string;
  prNumber: number;
  prUrl: string;
  title: string;
  points: number;
  status: ContributionStatus;
  mergedAt: Date;
  waveId: Types.ObjectId;
  /** Internal link to the owning Contributor — not part of the public response shape. */
  walletAddress: string;
}

const contributionSchema = new Schema<ContributionDocument>({
  repo: { type: String, required: true },
  prNumber: { type: Number, required: true },
  prUrl: { type: String, required: true },
  title: { type: String, required: true },
  points: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['points_assigned', 'reward_queued', 'rewarded'],
  },
  mergedAt: { type: Date, required: true },
  waveId: { type: Schema.Types.ObjectId, ref: 'Wave', required: true, index: true },
  walletAddress: { type: String, required: true, index: true },
});

applyJsonTransform(contributionSchema, ['walletAddress']);

export const Contribution = model<ContributionDocument>('Contribution', contributionSchema);
