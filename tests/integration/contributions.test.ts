import request from 'supertest';
import { createApp } from '../../src/app';
import { Contribution } from '../../src/models/Contribution';
import { connectTestDb, disconnectTestDb } from './testDb';

const app = createApp();

beforeAll(() => connectTestDb());
afterAll(() => disconnectTestDb());

describe('GET /contributions/:address', () => {
  it('returns exactly the seeded contributions for a known address, shaped per the README', async () => {
    const sample = await Contribution.findOne();
    const address = sample!.walletAddress;
    const expectedCount = await Contribution.countDocuments({ walletAddress: address });

    const res = await request(app).get(`/contributions/${address}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(expectedCount);

    for (const item of res.body) {
      expect(item).toEqual({
        id: expect.any(String),
        repo: expect.any(String),
        prNumber: expect.any(Number),
        prUrl: expect.any(String),
        title: expect.any(String),
        points: expect.any(Number),
        status: expect.stringMatching(/^(points_assigned|reward_queued|rewarded)$/),
        mergedAt: expect.any(String),
        waveId: expect.any(String),
      });
    }
  });

  it('returns an empty array for an address with no contributions, not a 404', async () => {
    const res = await request(app).get(
      '/contributions/GUNKNOWNADDRESSWITHNODATA00000000000000000000000000000',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
