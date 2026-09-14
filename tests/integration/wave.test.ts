import request from 'supertest';
import { createApp } from '../../src/app';
import { Wave } from '../../src/models/Wave';
import { connectTestDb, disconnectTestDb } from './testDb';

const app = createApp();

beforeAll(() => connectTestDb());
afterAll(() => disconnectTestDb());

describe('GET /wave/current', () => {
  it('returns the single active wave, shaped per the README', async () => {
    const res = await request(app).get('/wave/current');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      label: expect.any(String),
      status: 'active',
      startAt: expect.any(String),
      endAt: expect.any(String),
      totalPointsDistributed: expect.any(Number),
      totalRewardsUsdc: expect.stringMatching(/^\d+\.\d{2}$/),
      participantCount: expect.any(Number),
    });
  });
});

describe('GET /wave/history', () => {
  it('returns only completed waves', async () => {
    const res = await request(app).get('/wave/history');
    const expectedCount = await Wave.countDocuments({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(expectedCount);
    expect(res.body.length).toBeGreaterThan(0);

    for (const wave of res.body) {
      expect(wave.status).toBe('completed');
    }
  });
});
