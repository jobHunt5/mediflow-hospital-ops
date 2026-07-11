// ══════════════════════════════════════════════════════════════════════
// Non-clinical support departments at Monash Medical Centre — Clayton.
// Doctors/nurses are out of scope; these are the operational teams that
// keep the building running. Locations, lift colours and directions are
// sourced from Monash Health's own wayfinding guides (Level 2 directory,
// Monash Imaging, Meeting Facilities, Discharge Lounge, and the Main
// Concourse Closure notice for Clinical Trials / CT Scan Level 3).
// ══════════════════════════════════════════════════════════════════════

export const DEPARTMENTS = [
  {
    id: 'linen',
    name: 'Linen & Environmental Services',
    short: 'Linen',
    accent: 'var(--cat-blue)',
    managerTitle: 'Night Manager',
    workerTitle: 'Night Linen Assistant',
    shiftDefault: '10:30 PM - 7:00 AM',
    levels: 'L2 – L5',
    summary: 'Nightly waste & linen rounds, bin sensors, ward cleaning across Wards 31–54.',
    hasBins: true,
    hasRounds: true,
  },
  {
    id: 'transport',
    name: 'Patient Transport & Portering',
    short: 'Transport',
    accent: 'var(--cat-purple)',
    managerTitle: 'Portering Team Leader',
    workerTitle: 'Patient Transport Officer',
    shiftDefault: '7:00 AM - 3:30 PM',
    levels: 'L1 – L5',
    summary: 'Move patients, beds and equipment between wards, Imaging, theatres and the Discharge Lounge.',
    hasBins: false,
    hasRounds: false,
  },
  {
    id: 'discharge',
    name: 'Discharge Lounge Coordination',
    short: 'Discharge',
    accent: 'var(--cat-green)',
    managerTitle: 'Discharge Lounge Coordinator',
    workerTitle: 'Discharge Lounge Assistant',
    shiftDefault: '8:00 AM - 4:30 PM',
    levels: 'L2 · Grid B6',
    summary: 'Receive discharged patients, arrange transport home and help free up ward beds faster.',
    hasBins: false,
    hasRounds: false,
  },
  {
    id: 'imaging',
    name: 'Monash Imaging Support',
    short: 'Imaging',
    accent: 'var(--cat-orange)',
    managerTitle: 'Imaging Services Supervisor',
    workerTitle: 'Imaging Patient Escort',
    shiftDefault: '7:30 AM - 4:00 PM',
    levels: 'L2 (Imaging) · L3 (CT Scan)',
    summary: 'Escort patients to CT, MRI, Ultrasound, Nuclear Medicine, X-ray and CT Scan Level 3.',
    hasBins: false,
    hasRounds: false,
  },
  {
    id: 'events',
    name: 'Meeting & Facilities Services',
    short: 'Facilities',
    accent: 'var(--cat-yellow)',
    managerTitle: 'Facilities Services Manager',
    workerTitle: 'Room Setup & AV Officer',
    shiftDefault: '7:00 AM - 3:00 PM',
    levels: 'L2 – L4',
    summary: 'Set up Lecture Theatres, Seminar and Conference Rooms for trial and education sessions.',
    hasBins: false,
    hasRounds: false,
  },
  {
    id: 'security',
    name: 'Security Services',
    short: 'Security',
    accent: 'var(--cat-grey)',
    managerTitle: 'Security Shift Manager',
    workerTitle: 'Security Officer',
    shiftDefault: '10:00 PM - 6:00 AM',
    levels: 'L1 (Security base)',
    summary: 'Patrols, access control and incident response from the Level 1 Security base.',
    hasBins: false,
    hasRounds: false,
  },
];

export const DEPT = Object.fromEntries(DEPARTMENTS.map(d => [d.id, d]));
export const DEPT_IDS = DEPARTMENTS.map(d => d.id);

// ── Official wayfinding directions, verbatim from the Monash Health PDFs ──
export const DEPT_GUIDES = {
  imaging: [
    {
      title: 'Monash Imaging (CT / MRI / Ultrasound / Nuclear Medicine / X-Ray)',
      source: 'MMC Imaging Wayfinding · Ver. 20240902',
      steps: [
        'Proceed towards the café, turn left',
        'Veer right at the end of the corridor',
        'Proceed to the Imaging reception desk, or continue and turn right at the end of the corridor for Ultrasound, Nuclear Medicine, CT or MRI',
      ],
    },
    {
      title: 'CT Scan — Level 3',
      source: 'MMC Imaging Wayfinding · Ver. 20240902',
      steps: [
        'Proceed from the Hospital entry past the café',
        'Take the Orange Lifts up to Level 3',
        'Follow the wayfinding signage to CT Scan Level 3',
      ],
    },
  ],
  discharge: [
    {
      title: 'Discharge Lounge (Level 2, Grid B6)',
      source: 'MMC Discharge Lounge Wayfinding · Ver. 20180220',
      steps: [
        'Proceed from the Hospital entry past the café',
        'Turn left at the Orange Lifts',
        'Turn right immediately before the glass double exit doors',
      ],
    },
  ],
  events: [
    {
      title: 'Lecture Theatre 1 (LT1) & Level 3 Conference Room (CL3)',
      source: 'MMC Meeting Facilities Wayfinding · Ver. 20190903',
      steps: [
        'LT1 is on Level 2, near Discharge Lounge / the Green Lifts',
        'CL3 — take the Orange Lifts to Level 3, follow the wayfinding signage',
      ],
    },
    {
      title: 'Lecture Theatre 2, Seminar Rooms 1–3 & Seminar Room 6 / LT3',
      source: 'MMC Meeting Facilities Wayfinding · Ver. 20190903',
      steps: [
        'LT2, SR1, SR2 and SR3 are on Level 2 near Clinic M / Café (Henry & Co)',
        'SR6 and LT3 are on Level 2 near the Library',
      ],
    },
    {
      title: 'Level 4 Seminar Room (SL4) & Level 4 Conference Room (CL4)',
      source: 'MMC Meeting Facilities Wayfinding · Ver. 20190903',
      steps: [
        'Take the Blue Lifts to Level 4',
        'Follow the wayfinding signage to SL4 / CL4',
      ],
    },
  ],
  security: [
    {
      title: 'Security base (Level 1)',
      source: 'MMC Wayfinding Directory · Effective Aug 5, 2025',
      steps: [
        'Take the Blue Lifts to Level 1',
        'Security is located near Quality, Safety & Patient Experience and the level 1 concourse',
      ],
    },
  ],
  transport: [
    {
      title: 'Patient wards → Monash Imaging',
      source: 'MMC Imaging Wayfinding · Ver. 20240902',
      steps: [
        'From the ward, take the ward\'s lift down to Level 2',
        'Proceed towards the café, turn left, veer right at the end of the corridor for Imaging reception',
      ],
    },
    {
      title: 'Patient wards → CT Scan Level 3',
      source: 'MMC Imaging Wayfinding · Ver. 20240902',
      steps: [
        'Proceed to the Hospital entry level (Level 2) past the café',
        'Take the Orange Lifts to Level 3',
      ],
    },
    {
      title: 'Ward → Discharge Lounge (Level 2, B6)',
      source: 'MMC Discharge Lounge Wayfinding · Ver. 20180220',
      steps: [
        'Bring the patient down to Level 2, proceed past the café',
        'Turn left at the Orange Lifts, then right before the glass double exit doors',
      ],
    },
  ],
};

// ── Active wayfinding alerts seed reference (mirrors the Main Concourse
// Closure notice — the live version of this lives in the backend `closures`
// collection so admins can post/resolve it, this is just the source text). ──
export const CLOSURE_SEED = {
  title: 'Main Concourse Improvement Works',
  message: "Clinical Trials & CT Scan Level 3 are temporarily reached via the BLUE Lifts (not the usual Orange Lifts) while concourse flooring, panelling and lighting works continue near Reception.",
  department: 'imaging',
};
