import { describe, it, expect, beforeEach } from 'vitest';
import { agent, resetDb, createAdmin, authHeader } from './helpers.js';

describe('smoke', () => {
  beforeEach(resetDb);

  it('health check responds ok', async () => {
    const res = await agent().get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('can create an admin fixture and hit an authenticated route', async () => {
    const { token } = await createAdmin('linen');
    const res = await agent().get('/api/state').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.workers).toEqual([]);
  });
});
