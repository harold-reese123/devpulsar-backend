import mongoose from 'mongoose';

export function connectTestDb() {
  return mongoose.connect(process.env.MONGODB_URI as string, { directConnection: true });
}

export function disconnectTestDb() {
  return mongoose.disconnect();
}
