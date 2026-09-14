import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { seedDatabase } from './seedDatabase';
import { logger } from '../utils/logger';

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(MONGODB_URI);
  await seedDatabase();
  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error('Seed failed', { err });
  process.exit(1);
});
