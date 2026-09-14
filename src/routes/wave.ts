import { Router } from 'express';
import { getCurrentWave, getWaveHistory } from '../services/wave.service';
import { AppError } from '../utils/errors';

export const waveRouter = Router();

// README is silent on the "no active wave" case (e.g. between wave close
// and the next wave opening); treating it as 404 since /wave/current's
// contract is a single wave object, not a nullable one.
waveRouter.get('/current', async (_req, res) => {
  const wave = await getCurrentWave();
  if (!wave) {
    throw new AppError(404, 'No active wave');
  }
  res.json(wave);
});

waveRouter.get('/history', async (_req, res) => {
  const waves = await getWaveHistory();
  res.json(waves);
});
