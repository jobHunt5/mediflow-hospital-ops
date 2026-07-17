import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agent, resetDb, createAdmin, createWorker, authHeader } from './helpers.js';

describe('clock in/out', () => {
  beforeEach(resetDb);

  it('clocking in sets clockedInAt and status to "on shift"', async () => {
    const { token, workerId } = await createWorker('linen');
    const res = await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(token)).send({ action: 'in' });
    expect(res.status).toBe(200);
    expect(res.body.worker.status).toBe('on shift');
    expect(res.body.worker.clockedInAt).toBeTruthy();
  });

  it('clocking out after a known duration logs exactly that many hours', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-20T22:30:00.000Z'));
      const { token, workerId } = await createWorker('linen');
      await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(token)).send({ action: 'in' });

      vi.setSystemTime(new Date('2026-07-21T05:00:00.000Z')); // +6.5h, same UTC calendar day as clock-out
      const res = await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(token)).send({ action: 'out' });
      expect(res.status).toBe(200);
      expect(res.body.worker.clockedInAt).toBeNull();
      expect(res.body.worker.status).toBe('idle');

      const stateRes = await agent().get('/api/state').set(authHeader(token));
      const entry = stateRes.body.hoursLog.find(h => h.workerId === workerId);
      expect(entry.hours).toBe(6.5);
      expect(entry.date).toBe('2026-07-21');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clocking in while already clocked in is rejected (regression: used to silently lose the prior session\'s hours)', async () => {
    const { token, workerId } = await createWorker('linen');
    await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(token)).send({ action: 'in' });
    const res = await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(token)).send({ action: 'in' });
    expect(res.status).toBe(400);

    // The original clock-in timestamp must still be intact.
    const stateRes = await agent().get('/api/state').set(authHeader(token));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.clockedInAt).toBeTruthy();
  });

  it('a worker cannot clock in/out on behalf of another worker', async () => {
    const { token } = await createWorker('linen');
    const { workerId: otherWorkerId } = await createWorker('linen');
    const res = await agent().post(`/api/workers/${otherWorkerId}/clock`).set(authHeader(token)).send({ action: 'in' });
    expect(res.status).toBe(403);
  });

  it('admin force-clock-out closes a stuck session and logs hours', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-18T22:30:00.000Z'));
      const { token: adminToken } = await createAdmin('linen');
      const { token: workerToken, workerId } = await createWorker('linen');
      await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(workerToken)).send({ action: 'in' });

      vi.setSystemTime(new Date('2026-07-19T02:30:00.000Z')); // stuck clocked-in for 4h
      const res = await agent().post(`/api/workers/${workerId}/force-clock-out`).set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.worker.clockedInAt).toBeNull();

      const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
      const entry = stateRes.body.hoursLog.find(h => h.workerId === workerId);
      expect(entry.hours).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('force-clock-out on a worker who is not clocked in returns 400', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { workerId } = await createWorker('linen');
    const res = await agent().post(`/api/workers/${workerId}/force-clock-out`).set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });

  it('an admin cannot force-clock-out a worker in a different department', async () => {
    const { token: transportAdminToken } = await createAdmin('transport');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().post(`/api/workers/${workerId}/clock`).set(authHeader(workerToken)).send({ action: 'in' });
    const res = await agent().post(`/api/workers/${workerId}/force-clock-out`).set(authHeader(transportAdminToken));
    expect(res.status).toBe(403);
  });
});
