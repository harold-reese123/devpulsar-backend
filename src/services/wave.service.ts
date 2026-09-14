import { Wave } from '../models/Wave';

export function getCurrentWave() {
  return Wave.findOne({ status: 'active' }).sort({ startAt: -1 });
}

export function getWaveHistory() {
  return Wave.find({ status: 'completed' }).sort({ startAt: -1 });
}
