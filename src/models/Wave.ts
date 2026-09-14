import { Schema, model } from 'mongoose';
import { applyJsonTransform } from '../utils/mongooseJson';

export type WaveStatus = 'active' | 'completed';

export interface WaveDocument {
  label: string;
  status: WaveStatus;
  startAt: Date;
  endAt: Date;
  totalPointsDistributed: number;
  totalRewardsUsdc: string;
  participantCount: number;
}

const waveSchema = new Schema<WaveDocument>({
  label: { type: String, required: true },
  status: { type: String, required: true, enum: ['active', 'completed'], index: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  totalPointsDistributed: { type: Number, required: true, default: 0 },
  totalRewardsUsdc: { type: String, required: true, default: '0.00' },
  participantCount: { type: Number, required: true, default: 0 },
});

applyJsonTransform(waveSchema);

export const Wave = model<WaveDocument>('Wave', waveSchema);
