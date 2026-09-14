import request from 'supertest';
import { createApp } from '../../src/app';
import { connectTestDb, disconnectTestDb } from './testDb';

const app = createApp();

beforeAll(() => connectTestDb());
afterAll(() => disconnectTestDb());

describe('GET /leaderboard', () => {
  it('defaults to wave scope when scope is omitted', async () => {
    const [defaultRes, explicitRes] = await Promise.all([
      request(app).get('/leaderboard'),
      request(app).get('/leaderboard?scope=wave'),
    ]);

    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body).toEqual(explicitRes.body);
  });

  it('returns LeaderboardEntry[] ranked descending by points, with no USDC field', async () => {
    const res = await request(app).get('/leaderboard?scope=all-time');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((entry: Record<string, unknown>, index: number) => {
      expect(Object.keys(entry).sort()).toEqual(
        entry.githubUsername === undefined
          ? ['address', 'points', 'rank']
          : ['address', 'githubUsername', 'points', 'rank'],
      );
      expect(entry.rank).toBe(index + 1);
      expect(typeof entry.address).toBe('string');
      expect(typeof entry.points).toBe('number');

      if (index > 0) {
        const previous = res.body[index - 1];
        expect(entry.points as number).toBeLessThanOrEqual(previous.points);
      }
    });
  });

  it('produces different rankings for wave scope vs all-time scope', async () => {
    const [waveRes, allTimeRes] = await Promise.all([
      request(app).get('/leaderboard?scope=wave'),
      request(app).get('/leaderboard?scope=all-time'),
    ]);

    expect(waveRes.status).toBe(200);
    expect(allTimeRes.status).toBe(200);
    // all-time sums points across every wave; wave-scope only counts the
    // current wave — with 3 completed waves also seeded, these must differ.
    expect(waveRes.body).not.toEqual(allTimeRes.body);
  });

  it('rejects an invalid scope value with 400', async () => {
    const res = await request(app).get('/leaderboard?scope=bogus');
    expect(res.status).toBe(400);
  });
});
