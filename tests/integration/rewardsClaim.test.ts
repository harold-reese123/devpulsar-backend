import request from 'supertest';
import { createApp } from '../../src/app';
import { RewardDistribution } from '../../src/models/RewardDistribution';
import { connectTestDb, disconnectTestDb } from './testDb';

const app = createApp();

beforeAll(() => connectTestDb());
afterAll(() => disconnectTestDb());

describe('POST /rewards/claim', () => {
  it('claims the full claimable balance and is reflected in a subsequent GET /rewards/:address', async () => {
    const claimableBefore = await RewardDistribution.find({ status: 'claimable' });
    expect(claimableBefore.length).toBeGreaterThan(0); // sanity check on seed data

    const address = claimableBefore[0].walletAddress;
    const addressClaimableBefore = claimableBefore.filter((d) => d.walletAddress === address);
    const claimedElsewhereCount = await RewardDistribution.countDocuments({ status: 'claimed' });

    const claimRes = await request(app).post('/rewards/claim').send({ address });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body).toEqual({
      distributionId: expect.any(String),
      status: 'claim_initiated',
      transactionParams: null,
    });
    expect(addressClaimableBefore.map((d) => d.id)).toContain(claimRes.body.distributionId);

    // The claimed distribution(s) are no longer 'claimable' in the DB.
    const stillClaimableForAddress = await RewardDistribution.countDocuments({
      walletAddress: address,
      status: 'claimable',
    });
    expect(stillClaimableForAddress).toBe(0);

    const claimedNowCount = await RewardDistribution.countDocuments({ status: 'claimed' });
    expect(claimedNowCount).toBe(claimedElsewhereCount + addressClaimableBefore.length);

    // Reflected in a subsequent GET.
    const getRes = await request(app).get(`/rewards/${address}`);
    expect(getRes.status).toBe(200);

    const claimedIds = new Set(addressClaimableBefore.map((d) => d.id));
    for (const distribution of getRes.body.distributions) {
      if (claimedIds.has(distribution.id)) {
        expect(distribution.status).toBe('claimed');
      }
    }

    const remainingClaimableUsdc = getRes.body.distributions
      .filter((d: { status: string }) => d.status === 'claimable')
      .reduce((sum: number, d: { amountUsdc: string }) => sum + Number(d.amountUsdc), 0)
      .toFixed(2);
    expect(getRes.body.claimableUsdc).toBe(remainingClaimableUsdc);
  });

  it('returns 400 when the address has nothing claimable', async () => {
    const res = await request(app)
      .post('/rewards/claim')
      .send({ address: 'GUNKNOWNADDRESSWITHNODATA00000000000000000000000000000' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when the request body is missing address', async () => {
    const res = await request(app).post('/rewards/claim').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
