import { describe, it, expect, beforeEach } from 'vitest';
import { agent, resetDb, createAdmin, createWorker, authHeader } from './helpers.js';

describe('leave requests + accrual', () => {
  beforeEach(resetDb);

  it('worker can request leave, defaults to pending', async () => {
    const { token } = await createWorker('linen');
    const res = await agent().post('/api/leave').set(authHeader(token))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02', reason: 'Trip' });
    expect(res.status).toBe(200);
    expect(res.body.leave.status).toBe('pending');
  });

  it('approving a 2-day Annual leave request deducts 16h (2 days * 8h) from the balance', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().patch(`/api/workers/${workerId}`).set(authHeader(adminToken)).send({ annualLeaveBalance: 40 });

    const leaveRes = await agent().post('/api/leave').set(authHeader(workerToken))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });

    const approveRes = await agent().patch(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(adminToken)).send({ status: 'approved' });
    expect(approveRes.status).toBe(200);

    const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.annualLeaveBalance).toBe(24);
    expect(worker.annualLeaveTaken).toBe(16);
  });

  it('a single-day leave request deducts exactly 8h', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().patch(`/api/workers/${workerId}`).set(authHeader(adminToken)).send({ annualLeaveBalance: 40 });

    const leaveRes = await agent().post('/api/leave').set(authHeader(workerToken))
      .send({ type: 'Annual', startDate: '2026-08-05', endDate: '2026-08-05' });
    await agent().patch(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(adminToken)).send({ status: 'approved' });

    const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.annualLeaveBalance).toBe(32);
    expect(worker.annualLeaveTaken).toBe(8);
  });

  it('re-approving an already-approved request does not double-deduct', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().patch(`/api/workers/${workerId}`).set(authHeader(adminToken)).send({ annualLeaveBalance: 40 });

    const leaveRes = await agent().post('/api/leave').set(authHeader(workerToken))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });
    const leaveId = leaveRes.body.leave.id;

    await agent().patch(`/api/leave/${leaveId}`).set(authHeader(adminToken)).send({ status: 'approved' });
    // Admin "saves" the same status again — should be a no-op on the balance.
    await agent().patch(`/api/leave/${leaveId}`).set(authHeader(adminToken)).send({ status: 'approved' });

    const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.annualLeaveBalance).toBe(24);
    expect(worker.annualLeaveTaken).toBe(16);
  });

  it('declining a leave request does not touch the balance', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().patch(`/api/workers/${workerId}`).set(authHeader(adminToken)).send({ annualLeaveBalance: 40 });

    const leaveRes = await agent().post('/api/leave').set(authHeader(workerToken))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });
    await agent().patch(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(adminToken)).send({ status: 'declined' });

    const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.annualLeaveBalance).toBe(40);
    expect(worker.annualLeaveTaken).toBe(0);
  });

  it('non-Annual leave types do not deduct the annual leave balance', async () => {
    const { token: adminToken } = await createAdmin('linen');
    const { token: workerToken, workerId } = await createWorker('linen');
    await agent().patch(`/api/workers/${workerId}`).set(authHeader(adminToken)).send({ annualLeaveBalance: 40 });

    const leaveRes = await agent().post('/api/leave').set(authHeader(workerToken))
      .send({ type: 'Sick', startDate: '2026-08-01', endDate: '2026-08-01' });
    await agent().patch(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(adminToken)).send({ status: 'approved' });

    const stateRes = await agent().get('/api/state').set(authHeader(adminToken));
    const worker = stateRes.body.workers.find(w => w.id === workerId);
    expect(worker.annualLeaveBalance).toBe(40);
    expect(worker.annualLeaveTaken).toBe(0);
  });

  it('worker can cancel their own pending leave request', async () => {
    const { token } = await createWorker('linen');
    const leaveRes = await agent().post('/api/leave').set(authHeader(token))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });
    const res = await agent().delete(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it('worker cannot cancel another worker\'s leave request', async () => {
    const { token: ownerToken } = await createWorker('linen');
    const { token: otherToken } = await createWorker('linen');
    const leaveRes = await agent().post('/api/leave').set(authHeader(ownerToken))
      .send({ type: 'Annual', startDate: '2026-08-01', endDate: '2026-08-02' });
    const res = await agent().delete(`/api/leave/${leaveRes.body.leave.id}`).set(authHeader(otherToken));
    expect(res.status).toBe(403);
  });
});
