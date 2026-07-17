import { describe, it, expect, beforeEach } from 'vitest';
import { agent, resetDb, createAdmin, createWorker, authHeader } from './helpers.js';
import { prisma } from '../src/db.js';

describe('open shifts', () => {
  beforeEach(resetDb);

  it('a worker posts their own shift as open', async () => {
    const { token, workerId } = await createWorker('linen');
    const res = await agent().post('/api/open-shifts').set(authHeader(token))
      .send({ date: '2026-08-05', from: '10:30 PM', to: '7:00 AM', note: 'Family thing' });
    expect(res.status).toBe(200);
    expect(res.body.openShift.owner).toBe(workerId);
    expect(res.body.openShift.status).toBe('open');
  });

  it('admin posts an uncovered shift with no owner', async () => {
    const { token } = await createAdmin('linen');
    const res = await agent().post('/api/open-shifts').set(authHeader(token))
      .send({ date: '2026-08-10', from: '6:00 PM', to: '11:00 PM', note: 'Needs coverage' });
    expect(res.status).toBe(200);
    expect(res.body.openShift.owner).toBeNull();
  });

  it('a different worker can claim an open shift', async () => {
    const { token: ownerToken } = await createWorker('linen');
    const { token: claimerToken, workerId: claimerId } = await createWorker('linen');
    const postRes = await agent().post('/api/open-shifts').set(authHeader(ownerToken)).send({ date: '2026-08-05' });
    const res = await agent().post(`/api/open-shifts/${postRes.body.openShift.id}/claim`).set(authHeader(claimerToken));
    expect(res.status).toBe(200);
    expect(res.body.openShift.status).toBe('claimed');
    expect(res.body.openShift.claimedBy).toBe(claimerId);
  });

  it('a worker cannot claim their own posted shift', async () => {
    const { token, workerId } = await createWorker('linen');
    const postRes = await agent().post('/api/open-shifts').set(authHeader(token)).send({ date: '2026-08-05' });
    const res = await agent().post(`/api/open-shifts/${postRes.body.openShift.id}/claim`).set(authHeader(token));
    expect(res.status).toBe(400);
    void workerId;
  });

  it('cannot claim a shift that is already claimed', async () => {
    const { token: ownerToken } = await createWorker('linen');
    const { token: firstClaimer } = await createWorker('linen');
    const { token: secondClaimer } = await createWorker('linen');
    const postRes = await agent().post('/api/open-shifts').set(authHeader(ownerToken)).send({ date: '2026-08-05' });
    await agent().post(`/api/open-shifts/${postRes.body.openShift.id}/claim`).set(authHeader(firstClaimer));
    const res = await agent().post(`/api/open-shifts/${postRes.body.openShift.id}/claim`).set(authHeader(secondClaimer));
    expect(res.status).toBe(400);
  });

  it('the owner can cancel their own open shift', async () => {
    const { token } = await createWorker('linen');
    const postRes = await agent().post('/api/open-shifts').set(authHeader(token)).send({ date: '2026-08-05' });
    const res = await agent().delete(`/api/open-shifts/${postRes.body.openShift.id}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it('a worker cannot cancel someone else\'s open shift', async () => {
    const { token: ownerToken } = await createWorker('linen');
    const { token: otherToken } = await createWorker('linen');
    const postRes = await agent().post('/api/open-shifts').set(authHeader(ownerToken)).send({ date: '2026-08-05' });
    const res = await agent().delete(`/api/open-shifts/${postRes.body.openShift.id}`).set(authHeader(otherToken));
    expect(res.status).toBe(403);
  });
});

describe('bin sensors', () => {
  beforeEach(resetDb);

  async function makeBin(id = 'test-bin-1') {
    return prisma.bin.create({ data: { id, name: 'Ward 52', floor: 'L5', area: 'Ward 52' } });
  }

  it('filling a bin to 100% flips status to full and creates a notification', async () => {
    const { token } = await createAdmin('linen');
    const bin = await makeBin();
    const res = await agent().post(`/api/bins/${bin.id}/fill`).set(authHeader(token)).send({ fillLevel: 100 });
    expect(res.status).toBe(200);
    expect(res.body.bin.status).toBe('full');

    const stateRes = await agent().get('/api/state').set(authHeader(token));
    const notif = stateRes.body.notifications.find(n => n.binId === bin.id);
    expect(notif).toBeTruthy();
    expect(notif.kind).toBe('bin');
    expect(notif.status).toBe('sent');
  });

  it('resolving a bin-full notification empties the bin', async () => {
    const { token } = await createAdmin('linen');
    const bin = await makeBin();
    await agent().post(`/api/bins/${bin.id}/fill`).set(authHeader(token)).send({ fillLevel: 100 });
    const stateRes = await agent().get('/api/state').set(authHeader(token));
    const notif = stateRes.body.notifications.find(n => n.binId === bin.id);

    const res = await agent().post(`/api/notifications/${notif.id}/resolve`).set(authHeader(token));
    expect(res.status).toBe(200);

    const stateRes2 = await agent().get('/api/state').set(authHeader(token));
    const bin2 = stateRes2.body.bins.find(b => b.id === bin.id);
    expect(bin2.fillLevel).toBe(0);
    expect(bin2.status).toBe('empty');
  });

  it('rejects an out-of-range fill level', async () => {
    const { token } = await createAdmin('linen');
    const bin = await makeBin();
    const res = await agent().post(`/api/bins/${bin.id}/fill`).set(authHeader(token)).send({ fillLevel: 150 });
    expect(res.status).toBe(400);
  });
});

describe('wayfinding closures', () => {
  beforeEach(resetDb);

  it('admin creates a closure scoped to their department', async () => {
    const { token } = await createAdmin('linen');
    const res = await agent().post('/api/closures').set(authHeader(token))
      .send({ title: 'Lift outage', message: 'Use the stairs near Ward 31' });
    expect(res.status).toBe(200);
    expect(res.body.closure.active).toBe(true);
    expect(res.body.closure.department).toBe('linen');
  });

  it('a worker cannot create a closure', async () => {
    const { token } = await createWorker('linen');
    const res = await agent().post('/api/closures').set(authHeader(token)).send({ title: 'x', message: 'y' });
    expect(res.status).toBe(403);
  });

  it('admin from a different department cannot resolve another department\'s closure', async () => {
    const { token: linenAdmin } = await createAdmin('linen');
    const { token: transportAdmin } = await createAdmin('transport');
    const createRes = await agent().post('/api/closures').set(authHeader(linenAdmin)).send({ title: 'x', message: 'y' });
    const res = await agent().patch(`/api/closures/${createRes.body.closure.id}`).set(authHeader(transportAdmin)).send({ active: false });
    expect(res.status).toBe(403);
  });

  it('admin can mark their own closure resolved', async () => {
    const { token } = await createAdmin('linen');
    const createRes = await agent().post('/api/closures').set(authHeader(token)).send({ title: 'x', message: 'y' });
    const res = await agent().patch(`/api/closures/${createRes.body.closure.id}`).set(authHeader(token)).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.closure.active).toBe(false);
  });
});
