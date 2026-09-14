import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('POST /webhooks/github', () => {
  it('returns 501 Not Implemented, per the README', async () => {
    const res = await request(app).post('/webhooks/github').send({});
    expect(res.status).toBe(501);
    expect(res.body).toHaveProperty('error');
  });
});
