import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import { prisma } from './src/db.js';
import { authRequired, adminOnly, signToken } from './src/auth.js';
import {
  DEPT_IDS, validate, loginSchema, workerCreateSchema, workerUpdateSchema,
  taskCreateSchema, taskUpdateSchema, leaveCreateSchema, leaveUpdateSchema,
  availabilityCreateSchema, nightManagerSchema, deptSettingSchema,
  closureCreateSchema, closureUpdateSchema, binFillSchema, clockSchema,
  openShiftCreateSchema, taskBlockSchema,
} from './src/schemas.js';

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: '*' }));
app.use(express.json());

// Wraps an async route handler so a rejected promise (Prisma error, etc.)
// reaches Express's error middleware instead of hanging the request.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Hospital areas (full site) — static reference data, not user-editable ───
const AREAS = [
  'Emergency Dept (ED) — L2', 'ICU — L3',
  'Ward 31 (J31) — L3', 'Ward 32 — L3', 'Ward 33 — L3', 'Ward 34 — L3',
  'Ward 40 — L4', 'Ward 41 — L4', 'Ward 42 — L4', 'Ward 44 — L4',
  'Ward 51 N&S (J51) — L5', 'Ward 52 — L5', 'Ward 54 — L5', 'Birth Suite — L5', 'Maternity — L2',
  'Monash Imaging / Radiology — L2', 'CT Scan Level 3 — Orange Lift', 'Clinical Trials — L3',
  'Pharmacy — L2', 'Pathology Collection — L2',
  'Outpatient Clinics — L2', 'Dental Clinic — L2', 'Physiotherapy — L2', 'Discharge Lounge — L2',
  'Lecture Theatre 1 (LT1) — L2', 'Level 3 Conference Room (CL3)', 'Level 4 Conference Room (CL4)',
  'Café / Canteen', 'Chapel & Prayer Room — L2', 'Transit Lounge — L1', 'Security base — L1',
  'Loading Dock', 'Compactor Room', 'Linen Room', 'Public Toilets',
  'Main Corridors', 'Lift Lobbies', 'Staff Rooms', 'Reception / Entrance', 'Block P — L2',
];

const BREAK_MESSAGES = [
  "☕ Coffee o'clock! Down tools — the bins can survive 15 minutes without you, legend. 💪",
  "🍩 Break time! Go treat yourself. You've been moving more than the lifts tonight. 🛗",
  "😌 Psst… the kettle misses you. Take 15 and recharge those superhero batteries. 🦸",
  "☕ Official order from HQ: sit down, sip something warm, doom-scroll a little. You earned it. 📱",
  "🔋 Battery low? Grab a coffee and top up — the wards will cope without you for a bit. 😉",
  "🌙 Night-shift hero check-in: hydrate, caffeinate, and put those feet up for a sec. 👟",
  "🧋 Break unlocked! Achievement: 'Kept the whole hospital spotless'. Reward: one (1) cuppa. 🏆",
];

const getStatusFromLevel = (level) => (level >= 100 ? 'full' : level >= 75 ? 'medium' : 'empty');
// Leave dates are plain YYYY-MM-DD strings; a shift is treated as 8 hours (matches
// the 480-minute shift ring the frontend already assumes for every department).
const HOURS_PER_LEAVE_DAY = 8;
const leaveDaysInclusive = (startDate, endDate) => {
  const ms = new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const genPassword = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);

async function uniqueUsername(base) {
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.account.findUnique({ where: { username: candidate } })) {
    candidate = `${base}-${++n}`;
  }
  return candidate;
}

// ─── SSE ───
let sseClients = [];
const broadcast = (type, data) => {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(c => c.res.write(`data: ${payload}\n\n`));
};

const keyByDept = (rows) => Object.fromEntries(rows.map(r => [r.department, r]));

// The frontend has always addressed a task's assignee as `task.assignedTo`
// (a worker id). Prisma reserves that name for the relation object and
// generates the scalar FK as `assignedToId`, so translate at the boundary
// rather than touch every call site across the frontend.
const serializeTask = ({ assignedToId, ...rest }) => ({ ...rest, assignedTo: assignedToId });
const findTasks = async (where) => (await prisma.task.findMany({ where, orderBy: { createdAt: 'asc' } })).map(serializeTask);

const pushWorkers = async () => broadcast('WORKERS_SET', await prisma.worker.findMany({ orderBy: { createdAt: 'asc' } }));
const pushTasks = async () => broadcast('TASKS_SET', await findTasks());
const pushLeaves = async () => broadcast('LEAVES_SET', await prisma.leave.findMany({ orderBy: { createdAt: 'asc' } }));
const pushAvailability = async () => broadcast('AVAIL_SET', await prisma.availability.findMany({ orderBy: { createdAt: 'asc' } }));
const pushHours = async () => broadcast('HOURS_SET', await prisma.hoursLog.findMany());
const pushNightManagers = async () => broadcast('NIGHT_MANAGERS_SET', keyByDept(await prisma.nightManager.findMany()));
const pushClosures = async () => broadcast('CLOSURES_SET', await prisma.closure.findMany({ orderBy: { createdAt: 'desc' } }));
const pushDeptSettings = async () => broadcast('DEPT_SETTINGS_SET', keyByDept(await prisma.deptSetting.findMany()));
const serializeOpenShift = ({ ownerId, claimedById, ...rest }) => ({ ...rest, owner: ownerId, claimedBy: claimedById });
const findOpenShifts = async (where) => (await prisma.openShift.findMany({ where, orderBy: { createdAt: 'desc' } })).map(serializeOpenShift);
const pushOpenShifts = async () => broadcast('OPEN_SHIFTS_SET', await findOpenShifts());

// ══════════════════════════════ Auth ══════════════════════════════
app.post('/api/auth/login', validate(loginSchema), ah(async (req, res) => {
  const { username, password } = req.body;
  const account = await prisma.account.findUnique({ where: { username }, include: { worker: true } });
  if (!account) return res.status(401).json({ error: 'Invalid username or password' });
  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
  const token = signToken(account);
  res.json({
    success: true,
    token,
    role: account.role,
    department: account.department,
    workerId: account.workerId,
    name: account.worker?.name || null,
  });
}));

app.patch('/api/auth/password', authRequired, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'currentPassword and a newPassword of at least 6 characters are required' });
  }
  const account = await prisma.account.findUnique({ where: { id: req.auth.accountId } });
  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.account.update({ where: { id: account.id }, data: { passwordHash } });
  res.json({ success: true });
}));

// ══════════════════════════════ State snapshot ══════════════════════════════
app.get('/api/state', authRequired, ah(async (_req, res) => {
  const [bins, workers, tasks, notifications, leaves, availability, hoursLog, nightManagerRows, closures, deptSettingRows, openShifts] = await Promise.all([
    prisma.bin.findMany(),
    prisma.worker.findMany({ orderBy: { createdAt: 'asc' } }),
    findTasks(),
    prisma.notification.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.leave.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.availability.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.hoursLog.findMany(),
    prisma.nightManager.findMany(),
    prisma.closure.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.deptSetting.findMany(),
    findOpenShifts(),
  ]);
  res.json({
    bins, workers, tasks, notifications, areas: AREAS, leaves, availability, hoursLog,
    nightManagers: keyByDept(nightManagerRows), closures, deptSettings: keyByDept(deptSettingRows), openShifts,
  });
}));

// ─────────── Workers ───────────
app.post('/api/workers', authRequired, adminOnly, validate(workerCreateSchema), ah(async (req, res) => {
  const { name, role, zone, shift, phone, password } = req.body;
  const worker = await prisma.worker.create({
    data: { name, role, zone, shift, phone, department: req.auth.department },
  });
  const username = await uniqueUsername(slug(name));
  const tempPassword = password || genPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.account.create({
    data: { username, passwordHash, role: 'worker', department: req.auth.department, workerId: worker.id },
  });
  await pushWorkers();
  res.json({ success: true, worker, credentials: { username, password: tempPassword } });
}));

app.patch('/api/workers/:id', authRequired, adminOnly, validate(workerUpdateSchema), ah(async (req, res) => {
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Worker not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  const worker = await prisma.worker.update({ where: { id: req.params.id }, data: req.body });
  await pushWorkers();
  res.json({ success: true, worker });
}));

app.delete('/api/workers/:id', authRequired, adminOnly, ah(async (req, res) => {
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Worker not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  await prisma.worker.delete({ where: { id: req.params.id } });
  await Promise.all([pushWorkers(), pushTasks(), pushLeaves(), pushAvailability(), pushHours()]);
  res.json({ success: true });
}));

app.post('/api/workers/:id/reset-password', authRequired, adminOnly, ah(async (req, res) => {
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id }, include: { account: true } });
  if (!existing) return res.status(404).json({ error: 'Worker not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  if (!existing.account) return res.status(404).json({ error: 'This worker has no login account to reset' });
  const { password } = req.body || {};
  if (password && password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const newPassword = password || genPassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.account.update({ where: { id: existing.account.id }, data: { passwordHash } });
  res.json({ success: true, credentials: { username: existing.account.username, password: newPassword } });
}));

// Shared by a worker clocking themself out and an admin force-clocking a
// stuck worker out.
async function closeOutClockSession(worker, now) {
  const hrs = Math.round(((now - worker.clockedInAt) / 3600000) * 10) / 10;
  const date = now.toISOString().slice(0, 10);
  const existingEntry = await prisma.hoursLog.findUnique({ where: { workerId_date: { workerId: worker.id, date } } });
  if (existingEntry) {
    await prisma.hoursLog.update({ where: { id: existingEntry.id }, data: { hours: Math.round((existingEntry.hours + hrs) * 10) / 10 } });
  } else {
    await prisma.hoursLog.create({ data: { workerId: worker.id, date, hours: hrs } });
  }
  await prisma.worker.update({ where: { id: worker.id }, data: { clockedInAt: null, status: 'idle' } });
  await pushHours();
}

app.post('/api/workers/:id/clock', authRequired, validate(clockSchema), ah(async (req, res) => {
  if (req.auth.role !== 'worker' || req.auth.workerId !== req.params.id) {
    return res.status(403).json({ error: 'You can only clock yourself in or out' });
  }
  const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const { action } = req.body;
  const now = new Date();
  if (action === 'in') {
    // A worker who forgot to clock out still has clockedInAt set — clocking
    // in again would silently overwrite it and lose that shift's hours.
    if (worker.clockedInAt) return res.status(400).json({ error: 'You are still clocked in from a previous shift — ask your manager to fix it before clocking in again' });
    await prisma.worker.update({ where: { id: worker.id }, data: { clockedInAt: now, status: 'on shift' } });
  } else if (worker.clockedInAt) {
    await closeOutClockSession(worker, now);
  }
  await pushWorkers();
  res.json({ success: true, worker: await prisma.worker.findUnique({ where: { id: worker.id } }) });
}));

app.post('/api/workers/:id/force-clock-out', authRequired, adminOnly, ah(async (req, res) => {
  const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  if (worker.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  if (!worker.clockedInAt) return res.status(400).json({ error: 'This worker is not clocked in' });
  await closeOutClockSession(worker, new Date());
  await pushWorkers();
  res.json({ success: true, worker: await prisma.worker.findUnique({ where: { id: worker.id } }) });
}));

// ─────────── Tasks ───────────
app.post('/api/tasks', authRequired, adminOnly, validate(taskCreateSchema), ah(async (req, res) => {
  const { title, area, priority, assignedTo, easyWay, pinId } = req.body;
  if (assignedTo) {
    const w = await prisma.worker.findUnique({ where: { id: assignedTo } });
    if (!w || w.department !== req.auth.department) return res.status(400).json({ error: 'assignedTo must be a worker in your department' });
  }
  const task = await prisma.task.create({
    data: { title, area, priority, easyWay, pinId: pinId || null, department: req.auth.department, assignedToId: assignedTo || null },
  });
  await pushTasks();
  res.json({ success: true, task: serializeTask(task) });
}));

app.patch('/api/tasks/:id', authRequired, ah(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  if (req.auth.role !== 'admin') {
    // Workers may only flip `done`, or flag/unflag their own assigned task
    // as blocked with a note — nothing else.
    if (existing.assignedToId !== req.auth.workerId) return res.status(403).json({ error: 'Not your task' });
    const keys = Object.keys(req.body || {});
    if (keys.length === 1 && keys[0] === 'done' && typeof req.body.done === 'boolean') {
      const task = await prisma.task.update({ where: { id: req.params.id }, data: { done: req.body.done } });
      await pushTasks();
      return res.json({ success: true, task: serializeTask(task) });
    }
    const parsedBlock = taskBlockSchema.safeParse(req.body || {});
    if (!parsedBlock.success) return res.status(403).json({ error: 'Workers can only mark a task done/undone, or flag it as blocked' });
    const task = await prisma.task.update({ where: { id: req.params.id }, data: parsedBlock.data });
    await pushTasks();
    return res.json({ success: true, task: serializeTask(task) });
  }

  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  const parsed = taskUpdateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid request body' });
  const { assignedTo, ...rest } = parsed.data;
  if (assignedTo !== undefined && assignedTo) {
    const w = await prisma.worker.findUnique({ where: { id: assignedTo } });
    if (!w || w.department !== req.auth.department) return res.status(400).json({ error: 'assignedTo must be a worker in your department' });
  }
  const data = { ...rest };
  if (assignedTo !== undefined) data.assignedToId = assignedTo || null;
  const task = await prisma.task.update({ where: { id: req.params.id }, data });
  await pushTasks();
  res.json({ success: true, task: serializeTask(task) });
}));

app.delete('/api/tasks/:id', authRequired, adminOnly, ah(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  await prisma.task.delete({ where: { id: req.params.id } });
  await pushTasks();
  res.json({ success: true });
}));

// ─────────── Leave ───────────
app.post('/api/leave', authRequired, validate(leaveCreateSchema), ah(async (req, res) => {
  if (req.auth.role !== 'worker') return res.status(403).json({ error: 'Only workers can request leave' });
  const leave = await prisma.leave.create({ data: { ...req.body, workerId: req.auth.workerId } });
  await pushLeaves();
  res.json({ success: true, leave });
}));

app.patch('/api/leave/:id', authRequired, adminOnly, validate(leaveUpdateSchema), ah(async (req, res) => {
  const existing = await prisma.leave.findUnique({ where: { id: req.params.id }, include: { worker: true } });
  if (!existing) return res.status(404).json({ error: 'Leave not found' });
  if (existing.worker.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  const leave = await prisma.leave.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  // Newly approving an Annual leave request draws down the worker's accrued
  // balance, same as the "Current Vested Balance" / "Taken to Date" pattern.
  if (req.body.status === 'approved' && existing.status !== 'approved' && existing.type === 'Annual') {
    const hours = leaveDaysInclusive(existing.startDate, existing.endDate) * HOURS_PER_LEAVE_DAY;
    await prisma.worker.update({
      where: { id: existing.workerId },
      data: { annualLeaveBalance: { decrement: hours }, annualLeaveTaken: { increment: hours } },
    });
    await pushWorkers();
  }
  await pushLeaves();
  res.json({ success: true, leave });
}));

app.delete('/api/leave/:id', authRequired, ah(async (req, res) => {
  const existing = await prisma.leave.findUnique({ where: { id: req.params.id }, include: { worker: true } });
  if (!existing) return res.status(404).json({ error: 'Leave not found' });
  const isOwner = req.auth.role === 'worker' && existing.workerId === req.auth.workerId;
  const isDeptAdmin = req.auth.role === 'admin' && existing.worker.department === req.auth.department;
  if (!isOwner && !isDeptAdmin) return res.status(403).json({ error: 'Not allowed' });
  await prisma.leave.delete({ where: { id: req.params.id } });
  await pushLeaves();
  res.json({ success: true });
}));

// ─────────── Availability ───────────
app.post('/api/availability', authRequired, validate(availabilityCreateSchema), ah(async (req, res) => {
  if (req.auth.role !== 'worker') return res.status(403).json({ error: 'Only workers can submit availability' });
  const a = await prisma.availability.create({ data: { ...req.body, workerId: req.auth.workerId } });
  await pushAvailability();
  res.json({ success: true, availability: a });
}));

app.delete('/api/availability/:id', authRequired, ah(async (req, res) => {
  const existing = await prisma.availability.findUnique({ where: { id: req.params.id }, include: { worker: true } });
  if (!existing) return res.status(404).json({ error: 'Availability not found' });
  const isOwner = req.auth.role === 'worker' && existing.workerId === req.auth.workerId;
  const isDeptAdmin = req.auth.role === 'admin' && existing.worker.department === req.auth.department;
  if (!isOwner && !isDeptAdmin) return res.status(403).json({ error: 'Not allowed' });
  await prisma.availability.delete({ where: { id: req.params.id } });
  await pushAvailability();
  res.json({ success: true });
}));

// ─────────── Open Shifts (swap board) ───────────
// Workers post a shift they can't work, or claim one someone else (or an
// admin, for an uncovered shift) has posted. No approval step — mirrors a
// simple "Open Shift Available" board rather than a negotiated swap.
app.post('/api/open-shifts', authRequired, validate(openShiftCreateSchema), ah(async (req, res) => {
  const { date, from, to, note, ownerId } = req.body;
  let finalOwnerId = null;
  if (req.auth.role === 'worker') {
    finalOwnerId = req.auth.workerId;
  } else if (ownerId) {
    const w = await prisma.worker.findUnique({ where: { id: ownerId } });
    if (!w || w.department !== req.auth.department) return res.status(400).json({ error: 'ownerId must be a worker in your department' });
    finalOwnerId = ownerId;
  }
  const openShift = await prisma.openShift.create({
    data: { date, from, to, note, department: req.auth.department, ownerId: finalOwnerId },
  });
  await pushOpenShifts();
  res.json({ success: true, openShift: serializeOpenShift(openShift) });
}));

app.post('/api/open-shifts/:id/claim', authRequired, ah(async (req, res) => {
  if (req.auth.role !== 'worker') return res.status(403).json({ error: 'Only workers can claim an open shift' });
  const existing = await prisma.openShift.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Open shift not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  if (existing.status !== 'open') return res.status(400).json({ error: 'This shift has already been claimed' });
  if (existing.ownerId === req.auth.workerId) return res.status(400).json({ error: "You can't claim your own shift" });
  const openShift = await prisma.openShift.update({
    where: { id: req.params.id }, data: { status: 'claimed', claimedById: req.auth.workerId },
  });
  await pushOpenShifts();
  res.json({ success: true, openShift: serializeOpenShift(openShift) });
}));

app.delete('/api/open-shifts/:id', authRequired, ah(async (req, res) => {
  const existing = await prisma.openShift.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Open shift not found' });
  const isOwner = req.auth.role === 'worker' && existing.ownerId === req.auth.workerId;
  const isDeptAdmin = req.auth.role === 'admin' && existing.department === req.auth.department;
  if (!isOwner && !isDeptAdmin) return res.status(403).json({ error: 'Not allowed' });
  await prisma.openShift.delete({ where: { id: req.params.id } });
  await pushOpenShifts();
  res.json({ success: true });
}));

// ─────────── Night manager (per department) ───────────
app.patch('/api/night-manager/:dept', authRequired, adminOnly, validate(nightManagerSchema), ah(async (req, res) => {
  const { dept } = req.params;
  if (dept !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  if (!DEPT_IDS.includes(dept)) return res.status(404).json({ error: 'Unknown department' });
  const nightManager = await prisma.nightManager.upsert({
    where: { department: dept },
    update: req.body,
    create: { department: dept, name: '', role: '', phone: '', location: '', ...req.body },
  });
  await pushNightManagers();
  res.json({ success: true, nightManager });
}));

// ─────────── Per-department Floor Map settings ───────────
app.patch('/api/dept-settings/:dept', authRequired, adminOnly, validate(deptSettingSchema), ah(async (req, res) => {
  const { dept } = req.params;
  if (dept !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  if (!DEPT_IDS.includes(dept)) return res.status(404).json({ error: 'Unknown department' });
  const deptSetting = await prisma.deptSetting.upsert({
    where: { department: dept },
    update: req.body,
    create: { department: dept, showWardRounds: false, ...req.body },
  });
  await pushDeptSettings();
  res.json({ success: true, deptSettings: deptSetting });
}));

// ─────────── Wayfinding closure alerts ───────────
app.post('/api/closures', authRequired, adminOnly, validate(closureCreateSchema), ah(async (req, res) => {
  const closure = await prisma.closure.create({ data: { ...req.body, department: req.auth.department, active: true } });
  await pushClosures();
  res.json({ success: true, closure });
}));

app.patch('/api/closures/:id', authRequired, adminOnly, validate(closureUpdateSchema), ah(async (req, res) => {
  const existing = await prisma.closure.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Closure not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  const closure = await prisma.closure.update({ where: { id: req.params.id }, data: req.body });
  await pushClosures();
  res.json({ success: true, closure });
}));

app.delete('/api/closures/:id', authRequired, adminOnly, ah(async (req, res) => {
  const existing = await prisma.closure.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Closure not found' });
  if (existing.department !== req.auth.department) return res.status(403).json({ error: 'Not your department' });
  await prisma.closure.delete({ where: { id: req.params.id } });
  await pushClosures();
  res.json({ success: true });
}));

// ─────────── Coffee break ───────────
app.post('/api/notifications/break', authRequired, adminOnly, ah(async (req, res) => {
  const { workerId = null } = req.body || {};
  if (workerId) {
    const w = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!w || w.department !== req.auth.department) return res.status(400).json({ error: 'Worker not in your department' });
  }
  const notif = await prisma.notification.create({
    data: {
      kind: 'break', workerId,
      message: BREAK_MESSAGES[Math.floor(Math.random() * BREAK_MESSAGES.length)],
      status: 'sent',
    },
  });
  broadcast('NEW_NOTIFICATION', notif);
  res.json({ success: true, notification: notif });
}));

// ─────────── Bin sensors ───────────
app.post('/api/bins/:id/fill', authRequired, validate(binFillSchema), ah(async (req, res) => {
  const bin = await prisma.bin.findUnique({ where: { id: req.params.id } });
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  const { fillLevel } = req.body;
  const previous = bin.fillLevel;
  const updated = await prisma.bin.update({ where: { id: bin.id }, data: { fillLevel, status: getStatusFromLevel(fillLevel) } });
  broadcast('BIN_UPDATE', updated);
  if (fillLevel >= 100 && previous < 100) {
    const notif = await prisma.notification.create({
      data: {
        kind: 'bin', binId: bin.id, binName: bin.name, floor: bin.floor, area: bin.area,
        message: `${bin.name} in ${bin.area} (${bin.floor}) is FULL — please empty.`,
        status: 'sent',
      },
    });
    broadcast('NEW_NOTIFICATION', notif);
  }
  res.json({ success: true, bin: updated });
}));

app.post('/api/notifications/:id/acknowledge', authRequired, ah(async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  if (n.status !== 'sent') return res.status(400).json({ error: `Cannot acknowledge status: ${n.status}` });
  const updated = await prisma.notification.update({ where: { id: n.id }, data: { status: 'acknowledged' } });
  broadcast('NOTIFICATION_UPDATE', updated);
  res.json({ success: true, notification: updated });
}));

app.post('/api/notifications/:id/resolve', authRequired, ah(async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  const updated = await prisma.notification.update({ where: { id: n.id }, data: { status: 'resolved' } });
  if (n.kind === 'bin' && n.binId) {
    const bin = await prisma.bin.update({ where: { id: n.binId }, data: { fillLevel: 0, status: 'empty' } }).catch(() => null);
    if (bin) broadcast('BIN_UPDATE', bin);
  }
  broadcast('NOTIFICATION_UPDATE', updated);
  res.json({ success: true, notification: updated });
}));

app.get('/api/notifications/stream', authRequired, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('data: {"type":"CONNECTED"}\n\n');
  const clientId = Date.now() + Math.random();
  sseClients.push({ id: clientId, res });
  const heartbeat = setInterval(() => res.write('data: {"type":"HEARTBEAT"}\n\n'), 15000);
  req.on('close', () => { clearInterval(heartbeat); sseClients = sseClients.filter(c => c.id !== clientId); });
});

// ─────────── Serve the built frontend in production (single Render service) ───────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  // Vite hashes JS/CSS filenames, so those can be cached forever — but
  // index.html itself must always be revalidated, or browsers can keep
  // serving a stale shell that points at an old (deleted) bundle hash.
  app.use(express.static(frontendDist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Final error handler — anything ah() forwarded, or a body-parser JSON error.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Backend server is running on http://localhost:${PORT}`));
