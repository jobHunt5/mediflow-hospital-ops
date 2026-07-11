// Seeds the same demo data the app used to boot with in-memory, plus real
// login accounts (one admin + one worker login per department) so the app
// is usable immediately after `npm run db:seed`.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'MediFlow2026!';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const BINS = [
  { id: 'bin-w54', name: 'Ward 54 (1 Cage)', floor: '5th Floor', area: 'Ward 54' },
  { id: 'bin-52', name: '52 (2 Cages)', floor: '5th Floor', area: 'Room 52' },
  { id: 'bin-51n', name: '51 North', floor: '5th Floor', area: 'Room 51' },
  { id: 'bin-51s', name: '51 South', floor: '5th Floor', area: 'Room 51' },
  { id: 'bin-w44', name: 'Ward 44', floor: '4th Floor', area: 'Ward 44' },
  { id: 'bin-42', name: '42', floor: '4th Floor', area: 'Room 42' },
  { id: 'bin-41', name: '41 (1 Cage)', floor: '4th Floor', area: 'Room 41' },
  { id: 'bin-w33', name: 'Ward 33 (1 Cage)', floor: '3rd Floor', area: 'Ward 33' },
  { id: 'bin-w34', name: 'Ward 34', floor: '3rd Floor', area: 'Ward 34' },
  { id: 'bin-32', name: '32', floor: '3rd Floor', area: 'Room 32' },
  { id: 'bin-31', name: '31', floor: '3rd Floor', area: 'Room 31' },
  { id: 'bin-blue', name: 'Blue', floor: 'ICU & Blue', area: 'Blue Zone' },
  { id: 'bin-icu1', name: 'ICU Pan Room 1', floor: 'ICU & Blue', area: 'ICU' },
  { id: 'bin-icu2', name: 'ICU Pan Room 2', floor: 'ICU & Blue', area: 'ICU' },
  { id: 'bin-icu3', name: 'ICU Pan Room 3', floor: 'ICU & Blue', area: 'ICU' },
];

const WORKERS = [
  { key: 'w1', name: 'Night Linen Assistant', role: 'Linen & Environmental Services', zone: 'All Floors', shift: '10:30 PM - 7:00 AM', department: 'linen' },
  { key: 'w2', name: 'Patient Transport Officer', role: 'Patient Transport & Portering', zone: 'All Floors', shift: '7:00 AM - 3:30 PM', department: 'transport' },
  { key: 'w3', name: 'Discharge Lounge Assistant', role: 'Discharge Lounge Coordination', zone: 'Level 2 — Grid B6', shift: '8:00 AM - 4:30 PM', department: 'discharge' },
  { key: 'w4', name: 'Imaging Patient Escort', role: 'Monash Imaging Support', zone: 'Level 2 Imaging / Level 3 CT', shift: '7:30 AM - 4:00 PM', department: 'imaging' },
  { key: 'w5', name: 'Room Setup & AV Officer', role: 'Meeting & Facilities Services', zone: 'Lecture Theatres & Conference Rooms', shift: '7:00 AM - 3:00 PM', department: 'events' },
  { key: 'w6', name: 'Security Officer', role: 'Security Services', zone: 'Level 1 Security base', shift: '10:00 PM - 6:00 AM', department: 'security' },
];

const TASKS = [
  { title: 'Take out linen from all wards', area: 'Main Corridors', priority: 'high', worker: 'w1', department: 'linen', easyWay: 'Start on L5 and work down using the Blue lift. Collect each ward’s linen skip into one cage per floor so you only ride the lift once per level.' },
  { title: 'Move the linen to the dock', area: 'Loading Dock', priority: 'normal', worker: 'w1', department: 'linen', easyWay: 'Take the Grey (service) lift straight to the Loading Dock — it fits a full cage and avoids the public corridors.' },
  { title: 'Return empty cages to chutes', area: 'Linen Room', priority: 'normal', worker: 'w1', department: 'linen', easyWay: 'Stack empties two-high and return via the Blue lift lobby to the Linen Room on each floor.' },
  { title: 'Clean the canteen', area: 'Café / Canteen', priority: 'normal', worker: 'w1', department: 'linen', easyWay: 'Do this right after the L2 round so you’re already near the café — wipe tables, empty bins, mop the servery.' },
  { title: 'Push the bin to the compressor', area: 'Compactor Room', priority: 'high', worker: 'w1', department: 'linen', easyWay: 'Use the Grey lift to the dock, then the compactor is on your right. Press green to run once the bin is locked in.' },
  { title: 'Redo ward linen checks', area: 'Main Corridors', priority: 'low', worker: 'w1', department: 'linen', easyWay: 'Quick sweep after 5:30 AM — only re-check ICU, Ward 54 and Birth Suite where second rounds are common.' },

  { title: 'Transfer patient — Ward 31 to CT Scan Level 3', area: 'CT Scan Level 3 — Orange Lift', priority: 'high', worker: 'w2', department: 'transport', easyWay: 'Bring the patient down to Level 2, past the café, then take the Orange Lifts to Level 3 and follow the wayfinding signage to CT Scan Level 3.' },
  { title: 'Escort patient — Ward 42 to Monash Imaging (MRI)', area: 'Monash Imaging / Radiology — L2', priority: 'normal', worker: 'w2', department: 'transport', easyWay: 'From Level 2, proceed towards the café, turn left, veer right at the end of the corridor for MRI.' },
  { title: 'Transfer discharged patient to Discharge Lounge', area: 'Discharge Lounge — L2', priority: 'normal', worker: 'w2', department: 'transport', easyWay: 'Past the café, turn left at the Orange Lifts, then right immediately before the glass double exit doors.' },
  { title: 'Return wheelchair to Emergency Department', area: 'Emergency Dept (ED) — L2', priority: 'low', worker: 'w2', department: 'transport', easyWay: '' },
  { title: 'Collect bed from Ward 54, deliver to Ward 32', area: 'Ward 54 — L5', priority: 'normal', worker: 'w2', department: 'transport', easyWay: 'Ward 54 is Orange lift zone on L5; Ward 32 is Blue lift zone on L3 — swap lifts at Level 2.' },

  { title: 'Prepare Discharge Lounge for morning intake', area: 'Discharge Lounge — L2', priority: 'high', worker: 'w3', department: 'discharge', easyWay: '' },
  { title: 'Collect discharged patient from Ward 42', area: 'Ward 42 — L4', priority: 'high', worker: 'w3', department: 'discharge', easyWay: 'Ward 42 is Level 4, Blue lift — bring the patient down, past the café, left at the Orange Lifts, right before the glass double doors.' },
  { title: 'Call family for transport pickup', area: 'Discharge Lounge — L2', priority: 'normal', worker: 'w3', department: 'discharge', easyWay: '' },
  { title: 'Restock refreshments in lounge', area: 'Discharge Lounge — L2', priority: 'low', worker: 'w3', department: 'discharge', easyWay: '' },
  { title: 'Notify Ward 44 that a bed is now free', area: 'Ward 44 — L4', priority: 'normal', worker: 'w3', department: 'discharge', easyWay: '' },

  { title: 'Escort 9:00 AM patient list to CT', area: 'Monash Imaging / Radiology — L2', priority: 'high', worker: 'w4', department: 'imaging', easyWay: 'Towards the café, turn left, veer right at the end of the corridor, then continue and turn right for CT.' },
  { title: 'Escort patient to MRI', area: 'Monash Imaging / Radiology — L2', priority: 'normal', worker: 'w4', department: 'imaging', easyWay: 'Same corridor as CT — MRI is at the far end.' },
  { title: 'Escort patient to Ultrasound / Nuclear Medicine', area: 'Monash Imaging / Radiology — L2', priority: 'normal', worker: 'w4', department: 'imaging', easyWay: 'Continue past Imaging reception and turn right at the end of the corridor.' },
  { title: 'Escort patient to CT Scan Level 3', area: 'CT Scan Level 3 — Orange Lift', priority: 'high', worker: 'w4', department: 'imaging', easyWay: 'Past the café, take the Orange Lifts to Level 3, follow the wayfinding signage. Check active closure notices first — this route sometimes changes to the Blue Lifts during concourse works.' },
  { title: 'Return films / reports to Clinic O', area: 'Outpatient Clinics — L2', priority: 'low', worker: 'w4', department: 'imaging', easyWay: '' },

  { title: 'Set up Lecture Theatre 1 for 9am trial briefing', area: 'Lecture Theatre 1 (LT1) — L2', priority: 'high', worker: 'w5', department: 'events', easyWay: 'LT1 is on Level 2, near the Discharge Lounge / Green Lifts.' },
  { title: 'AV check — Level 3 Conference Room (CL3)', area: 'Level 3 Conference Room (CL3)', priority: 'normal', worker: 'w5', department: 'events', easyWay: 'Take the Orange Lifts to Level 3, follow the wayfinding signage to CL3.' },
  { title: 'Reset Seminar Rooms 1–3 after morning session', area: 'Outpatient Clinics — L2', priority: 'normal', worker: 'w5', department: 'events', easyWay: 'SR1–SR3 are on Level 2, near Clinic M / Café (Henry & Co).' },
  { title: 'Prepare CL4 for afternoon meeting', area: 'Level 4 Conference Room (CL4)', priority: 'normal', worker: 'w5', department: 'events', easyWay: 'Take the Blue Lifts to Level 4, follow the wayfinding signage to CL4.' },
  { title: 'Restock The Meeting Point info desk', area: 'Reception / Entrance', priority: 'low', worker: 'w5', department: 'events', easyWay: '' },

  { title: 'Patrol — Level 1 main concourse & car park access', area: 'Security base — L1', priority: 'high', worker: 'w6', department: 'security', easyWay: 'Take the Blue Lifts to Level 1.' },
  { title: 'Access control check — Block P (Psychiatric Unit)', area: 'Block P — L2', priority: 'high', worker: 'w6', department: 'security', easyWay: 'Take the Purple Lifts, Block P is on Level 2.' },
  { title: 'Respond to duress alarm check — Emergency Department', area: 'Emergency Dept (ED) — L2', priority: 'urgent', worker: 'w6', department: 'security', easyWay: '' },
  { title: 'Lock down café & retail after hours', area: 'Café / Canteen', priority: 'normal', worker: 'w6', department: 'security', easyWay: '' },
  { title: 'Security round — Loading Dock & Compactor Room', area: 'Loading Dock', priority: 'normal', worker: 'w6', department: 'security', easyWay: '' },
];

const NIGHT_MANAGERS = [
  { department: 'linen', name: 'Sarah Nguyen', role: 'Night Nurse Manager', phone: '0400 123 456', location: 'Level 2 — Hospital Coordination Desk' },
  { department: 'transport', name: 'Marcus Webb', role: 'Portering Team Leader', phone: '0400 222 111', location: 'Level 2 — Portering Base' },
  { department: 'discharge', name: 'Priya Anand', role: 'Discharge Lounge Coordinator', phone: '0400 333 222', location: 'Level 2 — Discharge Lounge (Grid B6)' },
  { department: 'imaging', name: 'Chen Wei', role: 'Imaging Services Supervisor', phone: '0400 444 333', location: 'Level 2 — Monash Imaging Reception' },
  { department: 'events', name: 'Olivia Bennett', role: 'Facilities Services Manager', phone: '0400 555 444', location: 'Level 2 — The Meeting Point' },
  { department: 'security', name: 'Dave Kowalski', role: 'Security Shift Manager', phone: '0400 666 555', location: 'Level 1 — Security Base' },
];

const DEPT_IDS = ['linen', 'transport', 'discharge', 'imaging', 'events', 'security'];

async function main() {
  console.log('Seeding…');

  // Wipe in FK-safe order (idempotent re-seed for local/dev use).
  await prisma.notification.deleteMany();
  await prisma.hoursLog.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.task.deleteMany();
  await prisma.account.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.nightManager.deleteMany();
  await prisma.closure.deleteMany();
  await prisma.deptSetting.deleteMany();

  await prisma.bin.createMany({ data: BINS.map(b => ({ ...b, fillLevel: 0, status: 'empty' })) });

  const workerByKey = {};
  for (const w of WORKERS) {
    const created = await prisma.worker.create({
      data: { name: w.name, role: w.role, zone: w.zone, shift: w.shift, department: w.department },
    });
    workerByKey[w.key] = created;
  }

  await prisma.task.createMany({
    data: TASKS.map(t => ({
      title: t.title, area: t.area, priority: t.priority, easyWay: t.easyWay,
      department: t.department, assignedToId: workerByKey[t.worker].id,
    })),
  });

  await prisma.nightManager.createMany({ data: NIGHT_MANAGERS });

  await prisma.closure.create({
    data: {
      title: 'Main Concourse Improvement Works',
      message: 'Clinical Trials & CT Scan Level 3 are temporarily reached via the BLUE Lifts (not the usual Orange Lifts) while concourse flooring, panelling and lighting works continue near Reception.',
      department: 'imaging',
      active: true,
    },
  });

  await prisma.deptSetting.createMany({
    data: DEPT_IDS.map(d => ({ department: d, showWardRounds: d === 'linen' })),
  });

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const credentials = [];

  for (const dept of DEPT_IDS) {
    const username = `${dept}-admin`;
    await prisma.account.create({ data: { username, passwordHash, role: 'admin', department: dept } });
    credentials.push({ username, password: DEFAULT_PASSWORD, role: 'admin', department: dept });
  }
  for (const w of WORKERS) {
    const username = slug(w.name);
    await prisma.account.create({
      data: { username, passwordHash, role: 'worker', department: w.department, workerId: workerByKey[w.key].id },
    });
    credentials.push({ username, password: DEFAULT_PASSWORD, role: 'worker', department: w.department, name: w.name });
  }

  console.log('\nSeed complete. Login credentials (all use the same default password — change them once you have real users):\n');
  console.log(`Default password for every seeded account: ${DEFAULT_PASSWORD}\n`);
  console.table(credentials.map(({ username, role, department, name }) => ({ username, role, department, name: name || '(admin)' })));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
