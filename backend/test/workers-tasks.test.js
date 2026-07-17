import { describe, it, expect, beforeEach } from 'vitest';
import { agent, resetDb, createAdmin, createWorker, authHeader } from './helpers.js';

describe('workers', () => {
  beforeEach(resetDb);

  it('admin creates a worker and gets back login credentials', async () => {
    const { token } = await createAdmin('linen');
    const res = await agent().post('/api/workers').set(authHeader(token)).send({ name: 'Jane Doe', role: 'Cleaner' });
    expect(res.status).toBe(200);
    expect(res.body.worker.name).toBe('Jane Doe');
    expect(res.body.worker.department).toBe('linen');
    expect(res.body.credentials.username).toBeTruthy();
    expect(res.body.credentials.password).toBeTruthy();
  });

  it('admin can update a worker including annualLeaveBalance', async () => {
    const { token } = await createAdmin('linen');
    const { workerId } = await createWorker('linen');
    const res = await agent().patch(`/api/workers/${workerId}`).set(authHeader(token)).send({ annualLeaveBalance: 40 });
    expect(res.status).toBe(200);
    expect(res.body.worker.annualLeaveBalance).toBe(40);
  });

  it('admin can delete a worker, cascading their account', async () => {
    const { token } = await createAdmin('linen');
    const { workerId } = await createWorker('linen');
    const res = await agent().delete(`/api/workers/${workerId}`).set(authHeader(token));
    expect(res.status).toBe(200);
    const stateRes = await agent().get('/api/state').set(authHeader(token));
    expect(stateRes.body.workers.find(w => w.id === workerId)).toBeUndefined();
  });

  it('reset-password issues a new one-time password', async () => {
    const { token } = await createAdmin('linen');
    const { workerId } = await createWorker('linen');
    const res = await agent().post(`/api/workers/${workerId}/reset-password`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.credentials.password).toBeTruthy();
  });
});

describe('tasks', () => {
  beforeEach(resetDb);

  it('admin creates a task and assigns it to a worker', async () => {
    const { token } = await createAdmin('linen');
    const { workerId } = await createWorker('linen');
    const res = await agent().post('/api/tasks').set(authHeader(token))
      .send({ title: 'Empty bin 52', assignedTo: workerId, priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.task.assignedTo).toBe(workerId);
    expect(res.body.task.priority).toBe('high');
    expect(res.body.task.blocked).toBe(false);
  });

  it('rejects assigning a task to a worker in a different department', async () => {
    const { token: linenAdmin } = await createAdmin('linen');
    const { workerId: transportWorkerId } = await createWorker('transport');
    const res = await agent().post('/api/tasks').set(authHeader(linenAdmin))
      .send({ title: 'Cross-dept task', assignedTo: transportWorkerId });
    expect(res.status).toBe(400);
  });

  describe('worker permission boundary on PATCH /api/tasks/:id', () => {
    async function setupAssignedTask() {
      const { token: adminToken } = await createAdmin('linen');
      const { token: workerToken, workerId } = await createWorker('linen');
      const taskRes = await agent().post('/api/tasks').set(authHeader(adminToken))
        .send({ title: 'Take out linen', assignedTo: workerId });
      return { adminToken, workerToken, workerId, taskId: taskRes.body.task.id };
    }

    it('worker can mark their own task done', async () => {
      const { workerToken, taskId } = await setupAssignedTask();
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(workerToken)).send({ done: true });
      expect(res.status).toBe(200);
      expect(res.body.task.done).toBe(true);
    });

    it('worker can flag their own task as blocked with a note', async () => {
      const { workerToken, taskId } = await setupAssignedTask();
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(workerToken))
        .send({ blocked: true, blockedNote: 'Room is locked' });
      expect(res.status).toBe(200);
      expect(res.body.task.blocked).toBe(true);
      expect(res.body.task.blockedNote).toBe('Room is locked');
    });

    it('worker cannot change the task title (privilege escalation attempt)', async () => {
      const { workerToken, taskId } = await setupAssignedTask();
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(workerToken)).send({ title: 'Hacked title' });
      expect(res.status).toBe(403);
    });

    it('worker cannot smuggle a title change alongside a valid done flag', async () => {
      const { workerToken, taskId } = await setupAssignedTask();
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(workerToken)).send({ done: true, title: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('worker cannot touch a task assigned to someone else', async () => {
      const { adminToken, taskId } = await setupAssignedTask();
      const { token: otherWorkerToken } = await createWorker('linen');
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(otherWorkerToken)).send({ done: true });
      expect(res.status).toBe(403);
      void adminToken;
    });

    it('admin can clear a blocked flag', async () => {
      const { adminToken, workerToken, taskId } = await setupAssignedTask();
      await agent().patch(`/api/tasks/${taskId}`).set(authHeader(workerToken)).send({ blocked: true, blockedNote: 'Stuck' });
      const res = await agent().patch(`/api/tasks/${taskId}`).set(authHeader(adminToken)).send({ blocked: false, blockedNote: '' });
      expect(res.status).toBe(200);
      expect(res.body.task.blocked).toBe(false);
    });
  });
});
