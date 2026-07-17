import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../server.js';
import { prisma } from '../src/db.js';

export const agent = () => request(app);

// Wipes every table between tests so each test starts from a clean slate,
// without needing to re-run migrations (fast) or restart the DB connection.
export async function resetDb() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.bin.deleteMany(),
    prisma.openShift.deleteMany(),
    prisma.closure.deleteMany(),
    prisma.deptSetting.deleteMany(),
    prisma.nightManager.deleteMany(),
    prisma.hoursLog.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.leave.deleteMany(),
    prisma.task.deleteMany(),
    prisma.account.deleteMany(),
    prisma.worker.deleteMany(),
  ]);
}

const PASSWORD = 'Test-Password-1';

// Creates an admin account for a department and returns its bearer token.
export async function createAdmin(department = 'linen', username = `${department}-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.account.create({ data: { username, passwordHash, role: 'admin', department } });
  const res = await agent().post('/api/auth/login').send({ username, password: PASSWORD });
  return { token: res.body.token, username, department };
}

// Creates a worker (Worker row + login Account) in a department and returns
// its bearer token plus the worker's id.
export async function createWorker(department = 'linen', overrides = {}) {
  const worker = await prisma.worker.create({ data: { name: 'Test Worker', department, ...overrides } });
  const username = `worker-${worker.id}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.account.create({ data: { username, passwordHash, role: 'worker', department, workerId: worker.id } });
  const res = await agent().post('/api/auth/login').send({ username, password: PASSWORD });
  return { token: res.body.token, workerId: worker.id, username, department };
}

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
