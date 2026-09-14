import request from 'supertest';
import { createApp } from '../../src/app';
import { RewardDistribution } from '../../src/models/RewardDistribution';
import { connectTestDb, disconnectTestDb } from './testDb';

const app = createApp();

beforeAll(() => connectTestDb());
afterAll(() => disconnectTestDb());

describe('GET /rewards/:address', () => {
  it('returns claimableUsdc + distributions for a known address, shaped per the README', async () => {
    const sample = await RewardDistribution.findOne({ status: 'claimable' });
    const address = sample!.walletAddress;

    const res = await request(app).get(`/rewards/${address}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['claimableUsdc', 'distributions']);
    expect(res.body.claimableUsdc).toEqual(expect.stringMatching(/^\d+\.\d{2}$/));
    expect(Array.isArray(res.body.distributions)).toBe(true);

    const claimableDocs = await RewardDistribution.find({ walletAddress: address, status: 'claimable' });
    const expectedClaimable = claimableDocs.reduce((sum, doc) => sum + Number(doc.amountUsdc), 0).toFixed(2);
    expect(res.body.claimableUsdc).toBe(expectedClaimable);

    for (const distribution of res.body.distributions) {
      expect(distribution).toEqual({
        id: expect.any(String),
        waveId: expect.any(String),
        amountUsdc: expect.any(String),
        status: expect.stringMatching(/^(claimable|claimed)$/),
        txHash: distribution.txHash === null ? null : expect.any(String),
        distributedAt: expect.any(String),
      });
    }
  });

  it('returns a zero balance and empty distributions for an address with no rewards, not a 404', async () => {
    const res = await request(app).get(
      '/rewards/GUNKNOWNADDRESSWITHNODATA00000000000000000000000000000',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ claimableUsdc: '0.00', distributions: [] });
  });
});
