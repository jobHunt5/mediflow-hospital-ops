import { describe, it, expect, beforeEach } from 'vitest';
import { agent, resetDb, createAdmin, createWorker, authHeader } from './helpers.js';

describe('auth', () => {
  beforeEach(resetDb);

  it('rejects an unknown username', async () => {
    const res = await agent().post('/api/auth/login').send({ username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong password', async () => {
    await createAdmin('linen', 'linen-admin');
    const res = await agent().post('/api/auth/login').send({ username: 'linen-admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in successfully and returns a token + role + department', async () => {
    await createAdmin('linen', 'linen-admin');
    const res = await agent().post('/api/auth/login').send({ username: 'linen-admin', password: 'Test-Password-1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('admin');
    expect(res.body.department).toBe('linen');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects requests with no token on protected routes', async () => {
    const res = await agent().get('/api/state');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a garbage token', async () => {
    const res = await agent().get('/api/state').set(authHeader('not-a-real-jwt'));
    expect(res.status).toBe(401);
  });

  describe('admin-only routes', () => {
    it('a worker cannot create another worker', async () => {
      const { token } = await createWorker('linen');
      const res = await agent().post('/api/workers').set(authHeader(token)).send({ name: 'Sneaky New Worker' });
      expect(res.status).toBe(403);
    });

    it('a worker cannot create a task', async () => {
      const { token } = await createWorker('linen');
      const res = await agent().post('/api/tasks').set(authHeader(token)).send({ title: 'Sneaky task' });
      expect(res.status).toBe(403);
    });

    it('a worker cannot approve their own leave', async () => {
      const { token, workerId } = await createWorker('linen');
      const leaveRes = await agent().post('/api/leave').set(authHeader(token))
        .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });
      const res = await agent().patch(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(token)).send({ status: 'approved' });
      expect(res.status).toBe(403);
      void workerId;
    });
  });

  describe('cross-department isolation', () => {
    it('an admin from one department cannot edit a worker in another department', async () => {
      const { token: transportAdminToken } = await createAdmin('transport');
      const { workerId: linenWorkerId } = await createWorker('linen');
      const res = await agent().patch(`/api/workers/${linenWorkerId}`).set(authHeader(transportAdminToken)).send({ name: 'Hijacked' });
      expect(res.status).toBe(403);
    });

    it('a worker in one department cannot claim an open shift in another department', async () => {
      const { token: linenAdminToken } = await createAdmin('linen');
      const { token: transportWorkerToken } = await createWorker('transport');
      const openShiftRes = await agent().post('/api/open-shifts').set(authHeader(linenAdminToken))
        .send({ date: '2026-08-10', from: '6:00 PM', to: '11:00 PM' });
      const res = await agent().post(`/api/open-shifts/${openShiftRes.body.openShift.id}/claim`).set(authHeader(transportWorkerToken));
      expect(res.status).toBe(403);
    });
  });
});
