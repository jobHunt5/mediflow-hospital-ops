import { z } from 'zod';

export const DEPT_IDS = ['linen', 'transport', 'discharge', 'imaging', 'events', 'security'];
const dept = z.enum(DEPT_IDS);
const priority = z.enum(['low', 'normal', 'high', 'urgent']);

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const workerCreateSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  shift: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  password: z.string().min(6).optional(),
});

export const workerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.string().optional(),
  zone: z.string().optional(),
  shift: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1),
  area: z.string().optional().default(''),
  priority: priority.optional().default('normal'),
  assignedTo: z.string().nullable().optional(),
  easyWay: z.string().optional().default(''),
  pinId: z.string().nullable().optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  area: z.string().optional(),
  priority: priority.optional(),
  assignedTo: z.string().nullable().optional(),
  done: z.boolean().optional(),
  easyWay: z.string().optional(),
  pinId: z.string().nullable().optional(),
});

export const leaveCreateSchema = z.object({
  type: z.string().optional().default('Annual'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional().default(''),
});

export const leaveUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'declined']),
});

export const availabilityCreateSchema = z.object({
  date: z.string().min(1),
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

export const nightManagerSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export const deptSettingSchema = z.object({
  showWardRounds: z.boolean().optional(),
});

export const closureCreateSchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const closureUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export const binFillSchema = z.object({
  fillLevel: z.number().min(0).max(100),
});

export const clockSchema = z.object({
  action: z.enum(['in', 'out']),
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) return res.status(400).json({ error: result.error.issues[0]?.message || 'Invalid request body' });
    req.body = result.data;
    next();
  };
}
