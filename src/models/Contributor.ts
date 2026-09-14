import { Schema, model } from 'mongoose';
import { applyJsonTransform } from '../utils/mongooseJson';

export interface ContributorDocument {
  walletAddress: string;
  githubUsername?: string;
  createdAt: Date;
}

const contributorSchema = new Schema<ContributorDocument>(
  {
    walletAddress: { type: String, required: true, unique: true },
    githubUsername: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

applyJsonTransform(contributorSchema);

export const Contributor = model<ContributorDocument>('Contributor', contributorSchema);
