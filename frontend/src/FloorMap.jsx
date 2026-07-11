import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { WARDS, GENERAL_TASKS, ALL_TASKS, TOTAL_TASKS, useRounds } from './rounds.js';
import { LIFT_BADGE, STATUS, BRAND_BLUE, BRAND_NAVY, BRAND_SKY, PRIORITY_COLOR } from './theme.js';

// ══════════════════════════════════════════════════════════════════════
// MONASH MEDICAL CENTRE — CLAYTON · CLEANING ROUNDS FLOOR MAP
// Hand-drawn SVG floor plans (Overview + Levels 1–5) with a walkable
// corridor network, real-distance routing (Dijkstra), walk-time estimates
// and interactive cleaning-round markers.
// ══════════════════════════════════════════════════════════════════════

const IMG_W = 1024;
const IMG_H = 729;

// Real-world scale (approx — tune to taste). Main body ≈ 480px corridor span ≈ 144 m.
const M_PER_PX = 0.30;
const WALK_SPEED = 1.15; // m/s pushing a cage

// ─── Palette (Monash Health wayfinding style) ───
const MONASH = { blue: BRAND_BLUE, navy: BRAND_NAVY, ink: '#0b2233', sky: BRAND_SKY };
const C = {
  mapBg: '#eaeff4', park: '#c4ddbd', block: '#d8dee5', blockStroke: '#c7cfd8',
  roadCasing: '#c9d2da', road: '#ffffff', freeway: '#f4b64e',
  campus: '#dbe8f5', campusEdge: '#b3cde6',
  room: '#ffffff', roomEdge: '#a9bccf', label: '#0b3a5b', roadText: '#95a2ad',
  corridor: '#9fb6ca', route: BRAND_BLUE,
};

const FLOORS = [
  { id: 'overview', label: 'Overview', sub: 'Blocks & Lifts' },
  { id: '1', label: 'Level 1', sub: 'Support & Services' },
  { id: '2', label: 'Level 2', sub: 'Clinics · ED' },
  { id: '3', label: 'Level 3', sub: 'Wards 31–34 · ICU' },
  { id: '4', label: 'Level 4', sub: 'Wards 41–44 · CCU' },
  { id: '5', label: 'Level 5', sub: 'Wards 51–54 · Birth Suite' },
];

const CAMPUS = [
  { x: 350, y: 95,  w: 310, h: 272, r: 16 },
  { x: 135, y: 350, w: 592, h: 356, r: 22 },
  { x: 585, y: 352, w: 222, h: 220, r: 16 },
  { x: 132, y: 452, w: 155, h: 224, r: 46 },
  { x: 600, y: 556, w: 152, h: 126, r: 16 },
];

const ROADS_H = [
  { y: 88,  x1: 0,   x2: 760,  label: 'Murray St' },
  { y: 238, x1: 0,   x2: 360,  label: 'Dixon St' },
  { y: 298, x1: 655, x2: 812,  label: 'Tarella Rd' },
  { y: 360, x1: 830, x2: 1024, label: 'Lantana St' },
  { y: 712, x1: 0,   x2: 1024, label: 'Wright St' },
];
const ROADS_V = [
  { x: 812, y1: 296, y2: 712, label: 'Kanooka Grove' },
  { x: 995, y1: 0,   y2: 712, label: 'Browns Rd' },
];

const BLOCKS = [
  { x: 40, y: 20, w: 55, h: 45 }, { x: 105, y: 22, w: 70, h: 40 }, { x: 190, y: 20, w: 60, h: 42 },
  { x: 265, y: 24, w: 75, h: 38 }, { x: 40, y: 110, w: 90, h: 70 }, { x: 145, y: 108, w: 80, h: 60 },
  { x: 240, y: 110, w: 70, h: 55 }, { x: 60, y: 195, w: 60, h: 30 }, { x: 135, y: 190, w: 55, h: 32 },
  { x: 210, y: 190, w: 60, h: 30 }, { x: 470, y: 25, w: 120, h: 55 },
  { x: 855, y: 250, w: 55, h: 40 }, { x: 925, y: 250, w: 55, h: 40 }, { x: 855, y: 310, w: 55, h: 35 },
  { x: 925, y: 310, w: 55, h: 35 }, { x: 855, y: 390, w: 50, h: 45 }, { x: 920, y: 390, w: 55, h: 45 },
  { x: 855, y: 460, w: 50, h: 60 }, { x: 920, y: 460, w: 55, h: 60 }, { x: 860, y: 545, w: 50, h: 55 },
  { x: 925, y: 545, w: 50, h: 55 }, { x: 855, y: 625, w: 55, h: 45 }, { x: 925, y: 625, w: 55, h: 45 },
  { x: 180, y: 660, w: 70, h: 35 }, { x: 470, y: 665, w: 60, h: 30 }, { x: 700, y: 665, w: 60, h: 30 },
];

const LIFT_CORES = [
  { id: 'yellow', cx: 305, cy: 486, color: LIFT_BADGE.yellow, tc: '#000', label: 'Yellow' },
  { id: 'green',  cx: 508, cy: 470, color: LIFT_BADGE.green,  tc: '#fff', label: 'Green' },
  { id: 'blue',   cx: 432, cy: 512, color: LIFT_BADGE.blue,   tc: '#fff', label: 'Blue' },
  { id: 'orange', cx: 566, cy: 512, color: LIFT_BADGE.orange, tc: '#fff', label: 'Orange' },
  { id: 'grey',   cx: 652, cy: 642, color: LIFT_BADGE.grey,   tc: '#fff', label: 'Grey' },
  { id: 'purple', cx: 300, cy: 560, color: LIFT_BADGE.purple, tc: '#fff', label: 'Purple' },
];

// ─── Official Monash MMC Level 2 wayfinding grid (columns A B C D E F G H J × rows 1–15) ───
const L2_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
const L2_GRID = { x0: 152, y0: 360, colW: 63, rowH: 23.2, rows: 15 };
function l2xy(ref) {
  const col = L2_COLS.indexOf(ref[0]);
  const row = parseInt(ref.slice(1), 10);
  return { cx: L2_GRID.x0 + L2_GRID.colW * (col + 0.5), cy: L2_GRID.y0 + L2_GRID.rowH * (row - 0.5) };
}
// [gridRef, label] — placements from the official MMC directory (Effective Aug 2025)
const L2_BLOCKS = [
  ['A2', 'Maternity\nClinic'], ['A7', 'MRI'], ['A8', 'CT'], ['A9', 'Ultrasound'], ['A10', 'Nuclear\nMed'], ['A11', 'MCH Link'],
  ['B5', 'AIR Clinic'], ['B6', 'Discharge\nLounge'], ['B7', 'Occ.\nTherapy'], ['B11', 'SECASA'], ['B13', 'Emergency\nDept'], ['B14', 'ED Entry'],
  ['C2', 'Block S'], ['C7', 'Clinic N'], ['C8', 'Physio'], ['C11', 'Monash\nImaging'], ['C12', 'X-Ray'],
  ['D2', 'Neurology'], ['D3', 'Health\nFoundation'], ['D6', 'Lung &\nSleep'], ['D7', 'Neuro-\nsurgery'], ['D12', 'Adult\nShort Stay'],
  ['E5', 'Prayer\nRoom'], ['E6', 'Chapel'], ['E7', 'Café\n(Lil Henry)'], ['E8', 'Lecture\nTheatre 1'], ['E11', 'Café\n(Zuppa)'], ['E12', 'Reception'], ['E13', 'Admissions'], ['E14', 'Hospital\nEntry'],
  ['F6', 'Clinic O'], ['F7', 'Cashiers'], ['F8', 'BankVic'], ['F9', 'Café\n(Henry&Co)'], ['F10', 'Pharmacy'], ['F11', 'Infusion\nUnit'], ['F13', 'Jessie Mac\nRecept.'], ['F15', 'Psychiatric\nUnit'],
  ['G3', 'Block I'], ['G5', 'Clinic P'], ['G6', 'Aboriginal\nHealth'], ['G7', 'Endocrine'], ['G8', 'Clinic M'], ['G12', 'Dental\nClinic'], ['G13', 'Pathology\nCollection'], ['G15', 'Block P'],
  ['H2', 'Block E'], ['H5', 'Library'], ['H6', 'Site\nMgmt'], ['H10', 'Podiatry'], ['H11', 'Clinic B'], ['H12', 'Clinic A'],
];
const L2 = L2_BLOCKS.map(([ref, label]) => {
  const { cx, cy } = l2xy(ref);
  return { cx, cy, w: 58, h: label.includes('\n') ? 20 : 16, label, ref };
});
const LIFT_COLOR = { ...LIFT_BADGE, mch: '#e6007e' };
// Level-2 lift lobbies positioned on the grid corridor
const LIFT_CORES_L2 = [
  { id: 'yellow', ...l2xy('C9'), color: LIFT_BADGE.yellow, tc: '#000', label: 'Yellow' },
  { id: 'blue',   ...l2xy('D9'), color: LIFT_BADGE.blue,   tc: '#fff', label: 'Blue' },
  { id: 'purple', ...l2xy('E9'), color: LIFT_BADGE.purple, tc: '#fff', label: 'Purple' },
  { id: 'green',  ...l2xy('G9'), color: LIFT_BADGE.green,  tc: '#fff', label: 'Green' },
  { id: 'grey',   ...l2xy('H9'), color: LIFT_BADGE.grey,   tc: '#fff', label: 'Grey' },
  { id: 'orange', ...l2xy('F12'), color: LIFT_BADGE.orange, tc: '#fff', label: 'Orange' },
];

// ─── Walkable corridor network (shared building spine, all levels) ───
const CORRIDOR = {
  nodes: {
    C1: { x: 210, y: 402 }, C2: { x: 300, y: 402 }, C3: { x: 405, y: 402 }, C4: { x: 500, y: 402 }, C5: { x: 600, y: 402 }, C6: { x: 690, y: 402 },
    D1: { x: 210, y: 478 }, D2: { x: 300, y: 478 }, D3: { x: 405, y: 478 }, D4: { x: 500, y: 478 }, D5: { x: 600, y: 478 }, D6: { x: 690, y: 478 },
    E2: { x: 300, y: 530 }, E3: { x: 405, y: 530 }, E4: { x: 500, y: 530 }, E5: { x: 600, y: 530 },
    T3: { x: 405, y: 300 }, T4: { x: 500, y: 300 },
    R6: { x: 732, y: 512 },
  },
  edges: [
    ['C1','C2'],['C2','C3'],['C3','C4'],['C4','C5'],['C5','C6'],
    ['D1','D2'],['D2','D3'],['D3','D4'],['D4','D5'],['D5','D6'],
    ['E2','E3'],['E3','E4'],['E4','E5'],
    ['C1','D1'],['C2','D2'],['C3','D3'],['C4','D4'],['C5','D5'],['C6','D6'],
    ['D2','E2'],['D3','E3'],['D4','E4'],['D5','E5'],
    ['C3','T3'],['C4','T4'],['T3','T4'],
    ['C6','R6'],['D6','R6'],
  ],
};

const ROOMS = {
  overview: [
    { cx: 495, cy: 240, w: 190, h: 150, label: "Monash\nChildren's\nHospital", fs: 13 },
    { cx: 632, cy: 392, w: 92,  h: 34, label: 'Community\nRehab' },
    { cx: 355, cy: 415, w: 70,  h: 30, label: 'G Block' },
    { cx: 545, cy: 415, w: 70,  h: 30, label: 'F Block' },
    { cx: 312, cy: 470, w: 78,  h: 30, label: 'H Block' },
    { cx: 600, cy: 465, w: 66,  h: 30, label: 'CAMHS' },
    { cx: 700, cy: 520, w: 128, h: 40, label: 'Monash Health\nTranslation Precinct' },
    { cx: 245, cy: 600, w: 58,  h: 30, label: 'P Block' },
    { cx: 355, cy: 600, w: 70,  h: 30, label: 'A Block' },
    { cx: 450, cy: 600, w: 70,  h: 30, label: 'B Block' },
    { cx: 540, cy: 600, w: 70,  h: 30, label: 'C Block' },
    { cx: 632, cy: 600, w: 70,  h: 30, label: 'D Block' },
    { cx: 648, cy: 568, w: 56,  h: 26, label: 'I Block' },
    { cx: 674, cy: 660, w: 60,  h: 28, label: 'E Block' },
    { cx: 748, cy: 592, w: 92,  h: 40, label: 'Research\nPrecinct' },
    { cx: 850, cy: 540, w: 96,  h: 36, label: 'Monash Institute\nof Medical Research' },
    { cx: 790, cy: 320, w: 96,  h: 30, label: 'Ronald\nMcDonald House' },
    { cx: 150, cy: 650, w: 84,  h: 30, label: 'Palliative\nCare Unit' },
    { cx: 150, cy: 690, w: 84,  h: 26, label: "McCulloch\nHouse" },
    { cx: 150, cy: 610, w: 84,  h: 26, label: 'Special Medicine\nCentre' },
  ],
  '1': [
    { cx: 332, cy: 385, w: 56,  h: 28, label: 'DTC' },
    { cx: 322, cy: 435, w: 92,  h: 30, label: 'Endoscopy' },
    { cx: 300, cy: 565, w: 96,  h: 30, label: 'Procurement' },
    { cx: 380, cy: 565, w: 70,  h: 30, label: 'Security' },
    { cx: 456, cy: 565, w: 66,  h: 30, label: 'Kitchen' },
    { cx: 416, cy: 600, w: 78,  h: 28, label: 'Pharmacy' },
    { cx: 560, cy: 545, w: 54,  h: 26, label: 'Gym' },
    { cx: 566, cy: 590, w: 44,  h: 24, label: 'IT' },
    { cx: 688, cy: 600, w: 112, h: 32, label: 'Quality &\nSafety' },
    { cx: 332, cy: 505, w: 78,  h: 30, label: 'Transit\nLounge' },
  ],
  '2': L2,
  '_unused2': [
    // Columns X1..X6 = 210,300,392,484,576,668 (92px apart) · Rows every 33px
    // Row 1 (y372) — Imaging & diagnostics band
    { cx: 210, cy: 372, w: 84, h: 22, label: 'Fast Track' },
    { cx: 300, cy: 372, w: 84, h: 22, label: 'Ultrasound' },
    { cx: 392, cy: 372, w: 64, h: 22, label: 'X-Ray' },
    { cx: 484, cy: 372, w: 40, h: 22, label: 'CT' },
    { cx: 576, cy: 372, w: 48, h: 22, label: 'MRI' },
    { cx: 668, cy: 372, w: 58, h: 22, label: 'EMR' },
    // Row 2 (y405)
    { cx: 210, cy: 405, w: 84, h: 28, label: 'Monash\nHeart' },
    { cx: 300, cy: 405, w: 84, h: 22, label: 'Nuclear Med' },
    { cx: 392, cy: 405, w: 88, h: 22, label: 'Physiotherapy' },
    { cx: 484, cy: 405, w: 40, h: 22, label: 'OT' },
    { cx: 576, cy: 405, w: 84, h: 28, label: 'Discharge\nLounge' },
    { cx: 668, cy: 405, w: 84, h: 28, label: 'Social\nWork' },
    // Row 3 (y438)
    { cx: 210, cy: 438, w: 84, h: 22, label: 'SECASA' },
    { cx: 300, cy: 438, w: 84, h: 22, label: 'Clinic N' },
    { cx: 392, cy: 438, w: 84, h: 22, label: 'Clinic O' },
    { cx: 484, cy: 438, w: 84, h: 22, label: 'Clinic P' },
    { cx: 576, cy: 438, w: 84, h: 28, label: 'Lung &\nSleep' },
    { cx: 668, cy: 438, w: 84, h: 22, label: 'ELMHS' },
    // Row 4 (y471) — lift lobby opens up in centre columns
    { cx: 210, cy: 471, w: 88, h: 28, label: 'Adult Mental\nHealth' },
    { cx: 392, cy: 471, w: 84, h: 22, label: 'Clinic A' },
    { cx: 576, cy: 471, w: 84, h: 28, label: 'Infection\nControl' },
    { cx: 668, cy: 471, w: 84, h: 28, label: 'Public\nAffairs' },
    // Row 5 (y504) — lift lobby
    { cx: 210, cy: 504, w: 88, h: 22, label: 'JMPH' },
    { cx: 668, cy: 504, w: 84, h: 28, label: 'Capital\nProjects' },
    // Row 6 (y537)
    { cx: 210, cy: 537, w: 84, h: 22, label: 'Clinic B' },
    { cx: 392, cy: 537, w: 84, h: 22, label: 'Clinic D' },
    { cx: 484, cy: 537, w: 84, h: 22, label: 'Clinic M' },
    { cx: 576, cy: 537, w: 84, h: 22, label: 'Podiatry' },
    { cx: 668, cy: 537, w: 84, h: 22, label: 'Nesso' },
    // Row 7 (y570)
    { cx: 210, cy: 570, w: 92, h: 28, label: 'Emergency\nDept (ED)' },
    { cx: 392, cy: 570, w: 84, h: 28, label: 'Path\nCollection' },
    { cx: 484, cy: 570, w: 84, h: 22, label: 'BankVic' },
    { cx: 576, cy: 570, w: 84, h: 22, label: 'Cashier' },
    { cx: 668, cy: 570, w: 84, h: 28, label: 'IMO\nLounge' },
    // Row 8 (y603) — retail & faith
    { cx: 210, cy: 603, w: 84, h: 22, label: 'Reception' },
    { cx: 300, cy: 603, w: 84, h: 28, label: 'Gift\nShop' },
    { cx: 392, cy: 603, w: 84, h: 22, label: 'Chapel' },
    { cx: 484, cy: 603, w: 84, h: 28, label: 'Prayer\nRoom' },
    { cx: 576, cy: 603, w: 84, h: 22, label: 'Library' },
    { cx: 668, cy: 603, w: 88, h: 28, label: 'Patient\nExperience' },
    // Row 9 (y636) — lecture theatres + admin
    { cx: 210, cy: 636, w: 84, h: 22, label: 'Zouki' },
    { cx: 300, cy: 636, w: 60, h: 22, label: 'LT1' },
    { cx: 392, cy: 636, w: 60, h: 22, label: 'LT2' },
    { cx: 484, cy: 636, w: 60, h: 22, label: 'LT3' },
    { cx: 576, cy: 636, w: 84, h: 28, label: 'MDW &\nRecruitment' },
    // Row 10 (y668) — main entrance band
    { cx: 210, cy: 668, w: 84, h: 22, label: 'Pharmacy' },
    { cx: 300, cy: 668, w: 88, h: 28, label: 'Hospital\nEntry' },
    { cx: 392, cy: 668, w: 88, h: 28, label: 'Café\nHenry & Co' },
    { cx: 576, cy: 668, w: 84, h: 28, label: 'Site\nManagement' },
  ],
  '3': [
    // Departments (row 1–2) — colour-coded by serving lift
    { cx: 210, cy: 372, w: 84, h: 28, label: 'CT Scan\nLevel 3', lift: 'orange' },
    { cx: 300, cy: 372, w: 84, h: 28, label: 'Clinical\nTrials', lift: 'orange' },
    { cx: 392, cy: 372, w: 84, h: 28, label: 'Block R\n(TRF)', lift: 'orange' },
    { cx: 484, cy: 372, w: 84, h: 28, label: 'Ritchie\nCentre', lift: 'orange' },
    { cx: 576, cy: 372, w: 84, h: 28, label: 'Haemo-\ndialysis', lift: 'orange' },
    { cx: 668, cy: 372, w: 84, h: 28, label: 'Day Treat\nCentre', lift: 'blue' },
    { cx: 210, cy: 405, w: 84, h: 28, label: 'Operating\nTheatres', lift: 'blue' },
    { cx: 300, cy: 405, w: 84, h: 22, label: 'Andrology', lift: 'grey' },
    { cx: 392, cy: 405, w: 84, h: 22, label: 'Endocrine', lift: 'grey' },
    { cx: 484, cy: 405, w: 84, h: 22, label: 'Nephrology', lift: 'grey' },
    { cx: 576, cy: 405, w: 84, h: 28, label: 'Oncology\nResearch', lift: 'grey' },
    { cx: 668, cy: 405, w: 84, h: 28, label: 'Peritoneal\nDialysis', lift: 'grey' },
    { cx: 210, cy: 438, w: 84, h: 22, label: 'Psychiatry', lift: 'purple' },
    { cx: 392, cy: 438, w: 84, h: 28, label: 'Anaesthetic\nOffices', lift: 'grey' },
    { cx: 484, cy: 438, w: 84, h: 22, label: 'Gastro\nOffices', lift: 'grey' },
    { cx: 576, cy: 438, w: 84, h: 28, label: 'Walkway\nto MHTP', lift: 'orange' },
    // Patient wards (row 8) — cleaning-round targets
    { cx: 210, cy: 603, w: 84, h: 28, label: 'ICU', lift: 'blue' },
    { cx: 300, cy: 603, w: 84, h: 28, label: 'Ward 31\n(J31)', lift: 'blue' },
    { cx: 392, cy: 603, w: 84, h: 28, label: 'Ward 32', lift: 'blue' },
    { cx: 484, cy: 603, w: 84, h: 28, label: 'Ward 33', lift: 'orange' },
    { cx: 576, cy: 603, w: 84, h: 28, label: 'Ward 34', lift: 'orange' },
  ],
  '4': [
    { cx: 210, cy: 372, w: 84, h: 22, label: 'Dietetics', lift: 'orange' },
    { cx: 300, cy: 372, w: 84, h: 28, label: 'General\nMedicine', lift: 'blue' },
    { cx: 392, cy: 372, w: 84, h: 28, label: 'HITH\nClinic', lift: 'blue' },
    { cx: 484, cy: 372, w: 84, h: 28, label: 'Infectious\nDiseases', lift: 'blue' },
    { cx: 576, cy: 372, w: 84, h: 28, label: 'Speech\nPathology', lift: 'blue' },
    { cx: 668, cy: 372, w: 84, h: 28, label: 'Paed.\nRheum', lift: 'blue' },
    { cx: 210, cy: 438, w: 84, h: 22, label: 'CCU', lift: 'blue' },
    { cx: 300, cy: 438, w: 84, h: 22, label: 'Pathology', lift: 'blue' },
    { cx: 392, cy: 438, w: 84, h: 22, label: 'Blood\nBank', lift: 'blue' },
    { cx: 484, cy: 438, w: 84, h: 22, label: 'BPT\nOffice', lift: 'blue' },
    { cx: 576, cy: 438, w: 84, h: 22, label: 'SMS\nLounge', lift: 'blue' },
    { cx: 210, cy: 603, w: 84, h: 28, label: 'Ward 40', lift: 'blue' },
    { cx: 300, cy: 603, w: 84, h: 28, label: 'Ward 41', lift: 'blue' },
    { cx: 392, cy: 603, w: 84, h: 28, label: 'Ward 42', lift: 'blue' },
    { cx: 484, cy: 603, w: 84, h: 28, label: 'Ward 44', lift: 'orange' },
  ],
  '5': [
    { cx: 210, cy: 372, w: 84, h: 28, label: 'Fetal\nSurveillance', lift: 'blue' },
    { cx: 300, cy: 372, w: 84, h: 28, label: 'Perinatal\nCare', lift: 'orange' },
    { cx: 392, cy: 372, w: 84, h: 28, label: 'Pregnancy\nUnit (PAU)', lift: 'blue' },
    { cx: 484, cy: 372, w: 84, h: 28, label: 'Dept of\nO&G', lift: 'green' },
    { cx: 576, cy: 372, w: 84, h: 28, label: 'Dept of\nMedicine', lift: 'grey' },
    { cx: 668, cy: 372, w: 84, h: 28, label: 'Dept of\nSurgery', lift: 'grey' },
    { cx: 210, cy: 438, w: 84, h: 22, label: 'SSU', lift: 'blue' },
    { cx: 210, cy: 603, w: 84, h: 28, label: 'Birth\nSuite', lift: 'blue' },
    { cx: 300, cy: 603, w: 84, h: 28, label: 'Ward 51\nN&S', lift: 'blue' },
    { cx: 392, cy: 603, w: 84, h: 28, label: 'Ward 52\nMaternity', lift: 'blue' },
    { cx: 484, cy: 603, w: 84, h: 28, label: 'Ward 54\nNeuro', lift: 'orange' },
  ],
};

const LIFTS = {
  orange: { bg: LIFT_BADGE.orange, name: 'Orange Lift Area' },
  blue:   { bg: LIFT_BADGE.blue,   name: 'Blue Lift Area' },
  yellow: { bg: LIFT_BADGE.yellow, name: 'Yellow Lift Area' },
};

// ─── Official wayfinding guides (from Monash MMC wayfinding PDFs) ───
const GUIDES = [
  { id: 'imaging', name: 'Monash Imaging (CT / MRI)', floor: '2', lift: 'orange', destLabel: 'Monash\nImaging', steps: [
    'Proceed from the Hospital Entry towards the café, turn left',
    'Veer right at the end of the corridor',
    'Continue to the Monash Imaging reception (grid C11)',
    'Turn right at the end for Ultrasound, Nuclear Medicine, CT or MRI',
  ]},
  { id: 'clinical', name: 'Clinical Trials (Block R / TRF)', floor: '3', lift: 'orange', destLabel: 'Clinical\nTrials', steps: [
    'Proceed from the Hospital Entry past the café',
    'Take the Orange Lifts up to Level 3',
    'Follow the wayfinding signage to MHTP-TRF / Clinical Trials (Block R)',
  ]},
  { id: 'chapel', name: 'Chapel', floor: '2', lift: 'orange', destLabel: 'Chapel', steps: [
    'Proceed from the Hospital Entry past the café',
    'Turn left at the Orange Lifts and proceed to the Chapel',
  ]},
  { id: 'prayer', name: 'Prayer Room', floor: '2', lift: 'orange', destLabel: 'Prayer\nRoom', steps: [
    'Proceed from the Hospital Entry past the café',
    'Proceed to the end of the Orange lift lobby',
  ]},
  { id: 'lungsleep', name: 'Lung and Sleep', floor: '2', lift: 'green', destLabel: 'Lung &\nSleep', steps: [
    'Proceed from the Hospital Entry past the café',
    'Turn left at the Orange Lifts',
    'Turn right through the Green lift lobby',
  ]},
  { id: 'transit', name: 'Transit Lounge (Level 1)', floor: '1', lift: 'yellow', destLabel: 'Transit\nLounge', steps: [
    'Proceed from the Hospital Entry towards the café, turn left along the corridor',
    'Turn left towards the Yellow Lifts',
    'Take the Yellow Lifts to Level 1',
    'Transit Lounge is on your left as you exit the lifts',
  ]},
  { id: 'discharge', name: 'Discharge Lounge', floor: '2', lift: 'orange', destLabel: 'Discharge\nLounge', steps: [
    'Proceed from the Hospital Entry past the café',
    'Turn left at the Orange Lifts',
    'Turn right immediately before the glass double exit doors',
  ]},
  { id: 'ctscan', name: 'CT Scan — Level 3', floor: '3', lift: 'orange', destLabel: 'CT Scan\nLevel 3', steps: [
    'Proceed from the Hospital Entry past the café',
    'Take the Orange Lifts up to Level 3',
    'Follow the wayfinding signage to CT Scan Level 3',
  ]},
  { id: 'security', name: 'Security Base (Level 1)', floor: '1', lift: 'blue', destLabel: 'Security', steps: [
    'Take the Blue Lifts to Level 1',
    'Security is located near Quality, Safety & Patient Experience',
  ]},
];

// ─── Geometry + graph helpers ───
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmtDist = (px) => { const m = px * M_PER_PX; return m >= 100 ? `${Math.round(m)} m` : `${m.toFixed(1)} m`; };
const fmtTime = (px) => {
  const s = Math.round((px * M_PER_PX) / WALK_SPEED);
  const mm = Math.floor(s / 60), ss = s % 60;
  return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
};

// Build a routing graph for a floor: corridor nodes + rooms (+ lifts), each
// non-corridor node linked to its nearest corridor node.
function buildGraph(floorRooms, showLiftNodes) {
  const nodes = {};
  Object.entries(CORRIDOR.nodes).forEach(([id, p]) => { nodes[id] = { ...p, kind: 'corridor' }; });
  floorRooms.forEach(r => { nodes[r.id] = { x: r.cx, y: r.cy, kind: 'room', label: r.label.replace(/\n/g, ' ') }; });
  if (showLiftNodes) LIFT_CORES.forEach(l => { nodes['lift-' + l.id] = { x: l.cx, y: l.cy, kind: 'lift', label: l.label + ' Lift' }; });

  const adj = {};
  const addEdge = (a, b) => {
    const w = dist(nodes[a], nodes[b]);
    (adj[a] = adj[a] || []).push({ to: b, w });
    (adj[b] = adj[b] || []).push({ to: a, w });
  };
  CORRIDOR.edges.forEach(([a, b]) => addEdge(a, b));
  const corridorIds = Object.keys(CORRIDOR.nodes);
  Object.keys(nodes).forEach(id => {
    if (nodes[id].kind === 'corridor') return;
    let best = null, bd = Infinity;
    corridorIds.forEach(cid => { const d = dist(nodes[id], nodes[cid]); if (d < bd) { bd = d; best = cid; } });
    if (best) addEdge(id, best);
  });
  return { nodes, adj };
}

function dijkstra(graph, start, end) {
  const { nodes, adj } = graph;
  if (!nodes[start] || !nodes[end]) return null;
  const distv = {}, prev = {}, seen = new Set();
  Object.keys(nodes).forEach(id => distv[id] = Infinity);
  distv[start] = 0;
  while (true) {
    let u = null, ud = Infinity;
    Object.keys(distv).forEach(id => { if (!seen.has(id) && distv[id] < ud) { ud = distv[id]; u = id; } });
    if (u === null || u === end) break;
    seen.add(u);
    (adj[u] || []).forEach(({ to, w }) => {
      if (distv[u] + w < distv[to]) { distv[to] = distv[u] + w; prev[to] = u; }
    });
  }
  if (distv[end] === Infinity) return null;
  const path = []; let cur = end;
  while (cur !== undefined) { path.unshift(cur); cur = prev[cur]; }
  return { path, length: distv[end], pts: path.map(id => ({ x: nodes[id].x, y: nodes[id].y })) };
}

// ─── Multi-floor routing (rooms + corridors + lifts, connected vertically) ───
const ROUTE_FLOORS = ['1', '2', '3', '4', '5'];
const LIFT_IDS = ['yellow', 'green', 'blue', 'orange', 'grey', 'purple'];
const LIFT_INFO = Object.fromEntries(LIFT_CORES.map(l => [l.id, { color: l.color, label: l.label }]));
const VERT_COST = 55; // px-equivalent cost per level of lift travel
const liftCoresFor = (f) => (f === '2' ? LIFT_CORES_L2 : LIFT_CORES);

// Static index of every room by its global id `${floor}:${i}`
const ROOM_INDEX = {};
Object.entries(ROOMS).forEach(([f, arr]) => {
  if (f === '_unused2' || f === 'overview') return;
  arr.forEach((r, i) => { ROOM_INDEX[`${f}:${i}`] = { ...r, floor: f, name: r.label.replace(/\n/g, ' ') }; });
});

// Every named room a task can be pinned to (admin console location picker) —
// same ids the Floor Map itself uses, so a pinned task always resolves to a
// real marker position.
export const PIN_LOCATIONS = Object.entries(ROOM_INDEX)
  .map(([id, r]) => ({ id, floor: r.floor, name: r.name }))
  .sort((a, b) => (a.floor === b.floor ? a.name.localeCompare(b.name) : a.floor.localeCompare(b.floor)));

function buildMultiGraph() {
  const nodes = {}, adj = {};
  const addEdge = (a, b, extra = 0) => {
    if (!nodes[a] || !nodes[b]) return;
    const w = dist(nodes[a], nodes[b]) + extra;
    (adj[a] = adj[a] || []).push({ to: b, w });
    (adj[b] = adj[b] || []).push({ to: a, w });
  };
  const cids = Object.keys(CORRIDOR.nodes);
  ROUTE_FLOORS.forEach(f => {
    const cmap = {};
    Object.entries(CORRIDOR.nodes).forEach(([cid, p]) => { const id = `${f}#${cid}`; nodes[id] = { ...p, kind: 'corridor', floor: f }; cmap[cid] = id; });
    CORRIDOR.edges.forEach(([a, b]) => addEdge(cmap[a], cmap[b]));
    const nearestC = (pt) => { let best = null, bd = Infinity; cids.forEach(cid => { const d = dist(pt, CORRIDOR.nodes[cid]); if (d < bd) { bd = d; best = cid; } }); return best; };
    (ROOMS[f] || []).forEach((r, i) => {
      const id = `${f}:${i}`; nodes[id] = { x: r.cx, y: r.cy, kind: 'room', floor: f };
      addEdge(id, cmap[nearestC({ x: r.cx, y: r.cy })]);
    });
    liftCoresFor(f).forEach(l => {
      const id = `lift-${l.id}@${f}`; nodes[id] = { x: l.cx, y: l.cy, kind: 'lift', floor: f, lift: l.id };
      addEdge(id, cmap[nearestC({ x: l.cx, y: l.cy })]);
    });
  });
  LIFT_IDS.forEach(lid => {
    for (let i = 0; i < ROUTE_FLOORS.length - 1; i++) {
      addEdge(`lift-${lid}@${ROUTE_FLOORS[i]}`, `lift-${lid}@${ROUTE_FLOORS[i + 1]}`, VERT_COST);
    }
  });
  return { nodes, adj };
}
const GRAPH = buildMultiGraph();

// Break a computed path into the lift transfers it uses.
function routeTransfers(path) {
  const nodes = GRAPH.nodes;
  const out = [];
  let i = 0;
  while (i < path.length) {
    if (nodes[path[i]].kind === 'lift') {
      const lift = nodes[path[i]].lift;
      const board = i > 0 ? nodes[path[i - 1]].floor : nodes[path[i]].floor;
      let j = i; while (j < path.length && nodes[path[j]].kind === 'lift') j++;
      const alight = j < path.length ? nodes[path[j]].floor : nodes[path[j - 1]].floor;
      if (board !== alight) out.push({ lift, from: board, to: alight });
      i = j;
    } else i++;
  }
  return out;
}

// Extract the polyline + markers for one floor from a multi-floor path.
function floorSegment(route, floor, fromId, toId) {
  const nodes = GRAPH.nodes;
  const pts = [], liftStops = [];
  route.path.forEach((id, k) => {
    const n = nodes[id];
    if (n.floor !== floor) return;
    pts.push({ x: n.x, y: n.y });
    if (n.kind === 'lift') {
      const prevOn = k > 0 && nodes[route.path[k - 1]].floor === floor;
      const nextOn = k < route.path.length - 1 && nodes[route.path[k + 1]].floor === floor;
      liftStops.push({ x: n.x, y: n.y, lift: n.lift, boarding: !nextOn && prevOn, arriving: !prevOn && nextOn });
    }
  });
  return { pts, liftStops, startsHere: nodes[fromId]?.floor === floor, endsHere: nodes[toId]?.floor === floor };
}

// ══════════ SVG PARTS ══════════
function RoomBlock({ r, onClick, onHover, endpoint, highlighted }) {
  const lines = r.label.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length));
  const fs = r.fs || Math.min(11, Math.max(7, (r.w * 1.7) / maxLen));
  const lh = fs * 1.15;
  const x = r.cx - r.w / 2, y = r.cy - r.h / 2;
  const stroke = endpoint === 'from' ? STATUS.good.mark : endpoint === 'to' ? STATUS.bad.mark : highlighted ? BRAND_BLUE : C.roomEdge;
  const sw = endpoint ? 2.5 : highlighted ? 2.5 : 1;
  return (
    <g style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onClick(r.id); }}
      onMouseEnter={() => onHover(r.id)} onMouseLeave={() => onHover(null)}>
      {highlighted && (
        <rect x={x - 5} y={y - 5} width={r.w + 10} height={r.h + 10} rx={7} fill="none" stroke="#3b82f6" strokeWidth={2} opacity={0.7}>
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.3s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={x} y={y} width={r.w} height={r.h} rx={4} fill={highlighted ? '#dcebfb' : C.room} stroke={stroke} strokeWidth={sw} />
      {r.lift && <circle cx={x + 7} cy={y + 7} r={3.5} fill={LIFT_COLOR[r.lift] || '#999'} stroke="#fff" strokeWidth={1} />}
      <text x={r.cx} y={r.cy - (lines.length - 1) * lh / 2 + fs * 0.35} textAnchor="middle"
        fontSize={fs} fontWeight={700} fill={C.label} fontFamily="'Inter',Arial,sans-serif" pointerEvents="none">
        {lines.map((ln, i) => <tspan key={i} x={r.cx} dy={i === 0 ? 0 : lh}>{ln}</tspan>)}
      </text>
      {endpoint && (
        <>
          <circle cx={x + r.w - 8} cy={y + 8} r={7} fill={endpoint === 'from' ? STATUS.good.mark : STATUS.bad.mark} stroke="#fff" strokeWidth={1.5} />
          <text x={x + r.w - 8} y={y + 11} textAnchor="middle" fontSize={8} fontWeight={900} fill="#fff" pointerEvents="none">
            {endpoint === 'from' ? 'A' : 'B'}
          </text>
        </>
      )}
    </g>
  );
}

function LiftIcon({ l, pulse }) {
  const R = 12;
  return (
    <g>
      {pulse && (
        <circle cx={l.cx} cy={l.cy} r={R + 4} fill="none" stroke={l.color} strokeWidth={2.5}>
          <animate attributeName="r" values={`${R + 3};${R + 12}`} dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      <rect x={l.cx - R} y={l.cy - R} width={R * 2} height={R * 2} rx={4} fill={l.color} stroke="#fff" strokeWidth={1.5} />
      <circle cx={l.cx} cy={l.cy - 4} r={3} fill={l.tc} />
      <rect x={l.cx - 3} y={l.cy - 1} width={6} height={7} rx={2} fill={l.tc} />
      <text x={l.cx} y={l.cy + R + 9} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={l.color} fontFamily="'Inter',Arial,sans-serif">{l.label}</text>
    </g>
  );
}

function FloorPlan({ floor, rooms, showLifts, showPaths, onRoomClick, hover, setHover, from, to, route, highlightLabel, pulseLiftId }) {
  const scaleBarPx = 25 / M_PER_PX; // 25 m
  return (
    <svg width={IMG_W} height={IMG_H} viewBox={`0 0 ${IMG_W} ${IMG_H}`} className="cm-svg">
      <defs>
        <filter id="campusShadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#1b3a5a" floodOpacity="0.20" />
        </filter>
        <linearGradient id="campusGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3eef8" />
          <stop offset="1" stopColor="#d2e2f2" />
        </linearGradient>
      </defs>
      <rect width={IMG_W} height={IMG_H} fill={C.mapBg} />
      <path d="M 770 0 L 1024 0 L 1024 34 Q 880 6 770 44 Z" fill={C.park} opacity="0.85" />
      {BLOCKS.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={2} fill={C.block} stroke={C.blockStroke} strokeWidth={1} />)}
      <rect x={8} y={0} width={20} height={IMG_H} fill={C.freeway} opacity={0.85} />
      <text x={18} y={370} fill="#fff" fontSize={9} fontWeight={700} transform="rotate(-90 18 370)" textAnchor="middle" fontFamily="'Inter',Arial,sans-serif">Clayton Rd</text>
      {ROADS_H.map((rd, i) => (
        <g key={`h${i}`}>
          <line x1={rd.x1} y1={rd.y} x2={rd.x2} y2={rd.y} stroke={C.roadCasing} strokeWidth={9} />
          <line x1={rd.x1} y1={rd.y} x2={rd.x2} y2={rd.y} stroke={C.road} strokeWidth={5} />
          <text x={rd.x1 + 70} y={rd.y - 4} fontSize={8.5} fill={C.roadText} fontStyle="italic" fontFamily="'Inter',Arial,sans-serif">{rd.label}</text>
        </g>
      ))}
      {ROADS_V.map((rd, i) => (
        <g key={`v${i}`}>
          <line x1={rd.x} y1={rd.y1} x2={rd.x} y2={rd.y2} stroke={C.roadCasing} strokeWidth={9} />
          <line x1={rd.x} y1={rd.y1} x2={rd.x} y2={rd.y2} stroke={C.road} strokeWidth={5} />
          <text x={rd.x - 4} y={rd.y1 + 120} fontSize={8.5} fill={C.roadText} fontStyle="italic" transform={`rotate(-90 ${rd.x - 4} ${rd.y1 + 120})`} textAnchor="middle" fontFamily="'Inter',Arial,sans-serif">{rd.label}</text>
        </g>
      ))}
      <g filter="url(#campusShadow)">
        {CAMPUS.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill="url(#campusGrad)" stroke={C.campusEdge} strokeWidth={1} />)}
      </g>

      {/* Level 2 official wayfinding grid overlay (A–J × 1–15) */}
      {floor === '2' && (
        <g pointerEvents="none" fontFamily="'Inter',Arial,sans-serif">
          {L2_COLS.map((c, i) => {
            const x = L2_GRID.x0 + L2_GRID.colW * i;
            return <line key={`gc${i}`} x1={x} y1={L2_GRID.y0} x2={x} y2={L2_GRID.y0 + L2_GRID.rowH * L2_GRID.rows} stroke="#bcd0e2" strokeWidth={0.7} opacity={0.55} />;
          })}
          <line x1={L2_GRID.x0 + L2_GRID.colW * L2_COLS.length} y1={L2_GRID.y0} x2={L2_GRID.x0 + L2_GRID.colW * L2_COLS.length} y2={L2_GRID.y0 + L2_GRID.rowH * L2_GRID.rows} stroke="#bcd0e2" strokeWidth={0.7} opacity={0.55} />
          {Array.from({ length: L2_GRID.rows + 1 }).map((_, r) => {
            const y = L2_GRID.y0 + L2_GRID.rowH * r;
            return <line key={`gr${r}`} x1={L2_GRID.x0} y1={y} x2={L2_GRID.x0 + L2_GRID.colW * L2_COLS.length} y2={y} stroke="#bcd0e2" strokeWidth={0.7} opacity={0.55} />;
          })}
          {L2_COLS.map((c, i) => (
            <text key={`cl${i}`} x={L2_GRID.x0 + L2_GRID.colW * (i + 0.5)} y={L2_GRID.y0 - 4} textAnchor="middle" fontSize={9} fontWeight={800} fill="#7f95a8">{c}</text>
          ))}
          {Array.from({ length: L2_GRID.rows }).map((_, r) => (
            <text key={`rl${r}`} x={L2_GRID.x0 - 6} y={L2_GRID.y0 + L2_GRID.rowH * (r + 0.5) + 3} textAnchor="middle" fontSize={8} fontWeight={800} fill="#7f95a8">{r + 1}</text>
          ))}
        </g>
      )}

      {/* corridor network */}
      {showPaths && floor !== 'overview' && (
        <g>
          {CORRIDOR.edges.map(([a, b], i) => {
            const p = CORRIDOR.nodes[a], q = CORRIDOR.nodes[b];
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={C.corridor} strokeWidth={7} strokeLinecap="round" opacity={0.28} />;
          })}
          {Object.values(CORRIDOR.nodes).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C.corridor} opacity={0.5} />)}
        </g>
      )}

      {rooms.map(r => (
        <RoomBlock key={r.id} r={r} onClick={onRoomClick} onHover={setHover}
          endpoint={from === r.id ? 'from' : to === r.id ? 'to' : null}
          highlighted={highlightLabel && r.label === highlightLabel} />
      ))}

      {showLifts && (floor === '2' ? LIFT_CORES_L2 : LIFT_CORES).map(l => <LiftIcon key={l.id} l={l} pulse={pulseLiftId === l.id} />)}

      {/* route (segment on this floor of a possibly multi-floor path) */}
      {route && route.pts.length > 1 && (
        <g pointerEvents="none">
          <polyline points={route.pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#fde68a" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
          <polyline points={route.pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.route} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 7">
            <animate attributeName="stroke-dashoffset" from="0" to="-76" dur="1.4s" repeatCount="indefinite" />
          </polyline>
          {route.startsHere && <circle cx={route.pts[0].x} cy={route.pts[0].y} r={7} fill={STATUS.good.mark} stroke="#fff" strokeWidth={2} />}
          {route.endsHere && <circle cx={route.pts[route.pts.length - 1].x} cy={route.pts[route.pts.length - 1].y} r={7} fill={STATUS.bad.mark} stroke="#fff" strokeWidth={2} />}
          {(route.liftStops || []).map((s, i) => (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r={10} fill="#fff" stroke={LIFT_COLOR[s.lift] || BRAND_BLUE} strokeWidth={2.5} />
              <text x={s.x} y={s.y + 3.5} textAnchor="middle" fontSize={11} fontWeight={900} fill={LIFT_COLOR[s.lift] || BRAND_BLUE} fontFamily="'Inter',Arial,sans-serif">{s.boarding ? '↑' : s.arriving ? '↓' : '⇅'}</text>
            </g>
          ))}
        </g>
      )}

      {/* hover tooltip */}
      {hover && rooms.find(r => r.id === hover) && (() => {
        const r = rooms.find(x => x.id === hover);
        const name = r.label.replace(/\n/g, ' ');
        const w = name.length * 6 + 16;
        const tx = Math.min(IMG_W - w - 4, Math.max(4, r.cx - w / 2));
        const ty = r.cy - r.h / 2 - 24;
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={w} height={18} rx={4} fill="#0c1e2c" stroke="#60a5fa" strokeWidth={1} />
            <text x={tx + w / 2} y={ty + 12.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#e0f2fe" fontFamily="'Inter',Arial,sans-serif">{name}</text>
          </g>
        );
      })()}

      {/* scale bar */}
      <g pointerEvents="none">
        <line x1={150} y1={690} x2={150 + scaleBarPx} y2={690} stroke="#41525f" strokeWidth={3} />
        <line x1={150} y1={686} x2={150} y2={694} stroke="#41525f" strokeWidth={3} />
        <line x1={150 + scaleBarPx} y1={686} x2={150 + scaleBarPx} y2={694} stroke="#41525f" strokeWidth={3} />
        <text x={150 + scaleBarPx / 2} y={683} textAnchor="middle" fontSize={9} fontWeight={700} fill="#41525f" fontFamily="'Inter',Arial,sans-serif">25 m</text>
      </g>

      <text x={140} y={344} fill="#7a8894" fontSize={11} fontWeight={700} letterSpacing="0.1em" fontFamily="'Inter',Arial,sans-serif">
        {floor === 'overview' ? 'CAMPUS OVERVIEW' : `LEVEL ${floor}`}
      </text>
    </svg>
  );
}

// ══════════ MAIN ══════════
export default function FloorMap({ department = 'linen', showRounds = true, pinnedTasks = [], workers = [], onTogglePin }) {
  const [activeFloor, setActiveFloor] = useState('3');
  const [showLifts, setShowLifts] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const { done, toggle: toggleTask, reset: resetRounds } = useRounds();
  const [selectedWard, setSelectedWard] = useState(null);
  const [hoverWard, setHoverWard] = useState(null);
  const [hoverPin, setHoverPin] = useState(null);
  const [hover, setHover] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [navState, setNavState] = useState('idle'); // idle | walking | paused | done
  const [navDist, setNavDist] = useState(0);
  const [activeGuide, setActiveGuide] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [search, setSearch] = useState('');
  const [searchHit, setSearchHit] = useState(null); // { label, floor } — briefly highlighted
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile-only slide-over
  const dragRef = useRef(null);
  const wrapRef = useRef(null);

  const resetAll = () => { resetRounds(); setSelectedWard(null); };

  // ── Search every named room across every level ──
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(ROOM_INDEX)
      .filter(([, r]) => r.name.toLowerCase().includes(q))
      .map(([id, r]) => ({ id, ...r }))
      .slice(0, 8);
  }, [search]);
  const goToSearchResult = (r) => {
    setActiveFloor(r.floor);
    setSearchHit({ label: r.label, floor: r.floor });
    setSearch('');
    setSidebarOpen(false);
  };
  useEffect(() => {
    if (!searchHit) return;
    const t = setTimeout(() => setSearchHit(null), 4000);
    return () => clearTimeout(t);
  }, [searchHit]);

  const floor = FLOORS.find(f => f.id === activeFloor);
  const floorWards = useMemo(() => WARDS.filter(w => w.floor === activeFloor), [activeFloor]);

  // Admin-pinned task locations for this floor, grouped by room so several
  // pins on the same spot fan out instead of stacking on top of each other.
  const floorPinGroups = useMemo(() => {
    const byLoc = {};
    pinnedTasks.forEach(t => {
      const loc = t.pinId && ROOM_INDEX[t.pinId];
      if (!loc || loc.floor !== activeFloor) return;
      (byLoc[t.pinId] = byLoc[t.pinId] || []).push(t);
    });
    return byLoc;
  }, [pinnedTasks, activeFloor]);
  const workerName = useCallback((id) => workers.find(w => w.id === id)?.name || '', [workers]);

  // Floor rooms with stable ids
  const floorRooms = useMemo(
    () => (ROOMS[activeFloor] || []).map((r, i) => ({ ...r, id: `${activeFloor}:${i}` })),
    [activeFloor]
  );
  const route = useMemo(() => (from && to ? dijkstra(GRAPH, from, to) : null), [from, to]);
  const transfers = useMemo(() => (route ? routeTransfers(route.path) : []), [route]);
  const floorRoute = useMemo(
    () => (route ? floorSegment(route, activeFloor, from, to) : null),
    [route, activeFloor, from, to]
  );

  const roomLabel = useCallback((id) => (ROOM_INDEX[id] ? ROOM_INDEX[id].name : ''), []);
  const roomFloor = useCallback((id) => (ROOM_INDEX[id] ? ROOM_INDEX[id].floor : null), []);

  // ── Live navigation (simulated walking along the route) ──
  const NAV_SPEED_MULT = 6; // demo speed-up over real 1.15 m/s walking pace
  const navSegs = useMemo(() => {
    if (!route) return null;
    const pts = route.path.map(id => GRAPH.nodes[id]);
    const segs = []; let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const isLift = a.floor !== b.floor;
      const len = isLift ? VERT_COST : Math.hypot(a.x - b.x, a.y - b.y);
      segs.push({ a, b, len, isLift, start: acc, lift: a.lift || b.lift });
      acc += len;
    }
    return { segs, total: acc };
  }, [route]);

  const navPos = useMemo(() => {
    if (!navSegs) return null;
    const { segs, total } = navSegs;
    const d = Math.min(Math.max(navDist, 0), total);
    let seg = segs[segs.length - 1], t = 1;
    for (const s of segs) { if (d <= s.start + s.len) { seg = s; t = s.len > 0 ? (d - s.start) / s.len : 0; break; } }
    if (!seg) return null;
    if (seg.isLift) { const p = t < 0.5 ? seg.a : seg.b; return { x: p.x, y: p.y, floor: p.floor, riding: true, lift: seg.lift }; }
    return { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t, floor: seg.a.floor, riding: false, lift: null };
  }, [navSegs, navDist]);

  const navRemaining = navSegs ? Math.max(0, navSegs.total - navDist) : 0;
  const navPct = navSegs && navSegs.total > 0 ? Math.round((navDist / navSegs.total) * 100) : 0;

  const startNav = () => { if (!route) return; if (navState === 'done') setNavDist(0); if (from) setActiveFloor(roomFloor(from)); setNavState('walking'); };
  const pauseNav = () => setNavState(s => (s === 'walking' ? 'paused' : 'walking'));
  const stopNav = () => { setNavState('idle'); setNavDist(0); };

  // Reset navigation whenever the endpoints change
  useEffect(() => { setNavState('idle'); setNavDist(0); }, [from, to]);

  // Animation loop
  useEffect(() => {
    if (navState !== 'walking' || !navSegs) return;
    let raf, last = performance.now();
    const step = (now) => {
      const dt = (now - last) / 1000; last = now;
      setNavDist(prev => {
        const nd = prev + (WALK_SPEED / M_PER_PX) * NAV_SPEED_MULT * dt;
        if (nd >= navSegs.total) { setNavState('done'); return navSegs.total; }
        return nd;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [navState, navSegs]);

  // Follow the walker across floors
  useEffect(() => {
    if (navState === 'walking' && navPos && navPos.floor !== activeFloor) setActiveFloor(navPos.floor);
  }, [navPos, navState]);

  const onRoomClick = useCallback((id) => {
    if (!from || (from && to)) {
      // no start yet, or a full route already exists → begin fresh
      setFrom(id);
      setTo(null);
    } else if (id !== from) {
      // start chosen, pick destination
      setTo(id);
    }
  }, [from, to]);

  const clearRoute = () => { setFrom(null); setTo(null); };

  const openGuide = (g) => { setActiveGuide(g.id); setActiveFloor(g.floor); setFrom(null); setTo(null); };
  const guide = activeGuide ? GUIDES.find(g => g.id === activeGuide) : null;
  const guideOnFloor = guide && guide.floor === activeFloor ? guide : null;

  const doneCount = ALL_TASKS.filter(t => done.has(t.id)).length;
  const pct = TOTAL_TASKS ? Math.round((doneCount / TOTAL_TASKS) * 100) : 0;

  const wardState = useCallback((ward) => {
    const total = ward.tasks.length;
    const d = ward.tasks.filter(t => done.has(t.id)).length;
    const primary = ward.tasks.some(t => t.lift === 'orange') ? 'orange' : ward.tasks.some(t => t.lift === 'yellow') ? 'yellow' : 'blue';
    return { total, done: d, complete: d === total && total > 0, primary };
  }, [done]);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const fn = e => { e.preventDefault(); setZoom(z => Math.max(0.5, Math.min(4, z * (e.deltaY < 0 ? 1.1 : 0.9)))); };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);
  const onMD = e => { setDrag(true); dragRef.current = { sx: e.clientX - pan.x, sy: e.clientY - pan.y, moved: false }; };
  const onMM = e => { if (drag && dragRef.current) { dragRef.current.moved = true; setPan({ x: e.clientX - dragRef.current.sx, y: e.clientY - dragRef.current.sy }); } };
  const onMU = () => setDrag(false);
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  useEffect(() => { setSelectedWard(null); resetView(); }, [activeFloor]);

  const rounds = useMemo(() => {
    const wardTasks = WARDS.flatMap(w => w.tasks.map(t => ({ ...t, wardKey: w.key, wardName: w.name, floor: w.floor })));
    const all = [...wardTasks, ...GENERAL_TASKS];
    return {
      orange: all.filter(t => t.lift === 'orange' && t.round !== 2),
      blue:   all.filter(t => t.lift === 'blue'   && t.round !== 2),
      yellow: all.filter(t => t.lift === 'yellow' && t.round !== 2),
      second: all.filter(t => t.round === 2),
    };
  }, []);

  const selWard = selectedWard ? WARDS.find(w => w.key === selectedWard) : null;
  const goToTask = (t) => { if (t.floor && t.floor !== activeFloor) setActiveFloor(t.floor); if (t.wardKey) setSelectedWard(t.wardKey); };

  return (
    <div className="cm-shell">
      <style>{CM_CSS}</style>

      <button className="cm-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle wayfinding panel">
        {sidebarOpen ? '✕ Close' : '☰ Wayfinding & rounds'}
      </button>
      {sidebarOpen && <div className="cm-sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      {/* ══ SIDEBAR ══ */}
      <aside className={`cm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="cm-logo">
          <div className="cm-logo-m">M</div>
          <div>
            <div className="cm-logo-name">Monash Clayton</div>
            <div className="cm-logo-sub">{showRounds ? 'Campus Wayfinding & Rounds' : 'Campus Wayfinding'}</div>
          </div>
          <button className="cm-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close">✕</button>
        </div>

        {/* Room search */}
        <div className="cm-search-box">
          <span className="cm-search-ic">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search any room, ward or clinic…" />
          {search && <button className="cm-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>}
          {searchResults.length > 0 && (
            <div className="cm-search-results">
              {searchResults.map(r => (
                <button key={r.id} className="cm-search-result" onClick={() => goToSearchResult(r)}>
                  <span className="cm-search-result-name">{r.name}</span>
                  <span className="cm-search-result-floor">{r.floor === 'overview' ? 'Overview' : `L${r.floor}`}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="cm-search-results"><div className="cm-search-empty">No rooms match “{search}”.</div></div>
          )}
        </div>

        {/* Route planner */}
        <div className="cm-route-card">
          <div className="cm-route-title">🧭 Route Planner <span className="cm-route-hint">any level → any level</span></div>
          <div className="cm-route-row">
            <span className="cm-ab a">A</span>
            <span className={`cm-route-val ${from ? '' : 'dim'}`}>{from ? roomLabel(from) : 'Tap a room to start'}</span>
            {from && <button className={`cm-route-lvl ${roomFloor(from) === activeFloor ? 'here' : ''}`} onClick={() => setActiveFloor(roomFloor(from))}>L{roomFloor(from)}</button>}
          </div>
          <div className="cm-route-row">
            <span className="cm-ab b">B</span>
            <span className={`cm-route-val ${to ? '' : 'dim'}`}>{to ? roomLabel(to) : 'Pick a destination on any level'}</span>
            {to && <button className={`cm-route-lvl ${roomFloor(to) === activeFloor ? 'here' : ''}`} onClick={() => setActiveFloor(roomFloor(to))}>L{roomFloor(to)}</button>}
          </div>
          {route && (
            <div className="cm-route-stats">
              <div><span className="cm-stat-num">{fmtDist(route.length)}</span><span className="cm-stat-lbl">distance</span></div>
              <div><span className="cm-stat-num">{fmtTime(route.length)}</span><span className="cm-stat-lbl">walk time</span></div>
            </div>
          )}
          {transfers.length > 0 && (
            <div className="cm-transfers">
              {transfers.map((t, i) => (
                <button key={i} className="cm-transfer" onClick={() => setActiveFloor(t.to)}>
                  <span className="cm-transfer-dot" style={{ background: LIFT_INFO[t.lift].color }} />
                  <span className="cm-transfer-txt">Take the <b>{LIFT_INFO[t.lift].label} Lift</b> · Level {t.from} → {t.to}</span>
                </button>
              ))}
            </div>
          )}
          {route && (
            <div className="cm-nav">
              {navState === 'idle' || navState === 'done' ? (
                <button className="cm-nav-start" onClick={startNav}>
                  {navState === 'done' ? '↻ Restart navigation' : '▶ Start navigation'}
                </button>
              ) : (
                <div className="cm-nav-live">
                  <div className="cm-nav-row">
                    <span className={`cm-nav-badge ${navState === 'paused' ? 'paused' : ''}`}>{navState === 'paused' ? '❚❚ Paused' : '● Live'}</span>
                    <span className="cm-nav-remain">
                      {navPos?.riding
                        ? `Taking the ${LIFT_INFO[navPos.lift]?.label || ''} Lift…`
                        : `${fmtDist(navRemaining)} · ${fmtTime(navRemaining)} left`}
                    </span>
                  </div>
                  <div className="cm-nav-track"><div className="cm-nav-fill" style={{ width: `${navPct}%` }} /></div>
                  <div className="cm-nav-btns">
                    <button onClick={pauseNav}>{navState === 'paused' ? '▶ Resume' : '❚❚ Pause'}</button>
                    <button onClick={stopNav}>■ Stop</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {from && to && !route && <div className="cm-route-none">⚠ No path found.</div>}
          {(from || to) && <button className="cm-route-clear" onClick={clearRoute}>✕ Clear route</button>}
        </div>

        {/* Wayfinding guides (from official MMC guides) */}
        <div className="cm-guides-card">
          <div className="cm-route-title">🧭 Wayfinding Guides</div>
          {guide ? (
            <div className="cm-guide-active">
              <div className="cm-guide-name">{guide.name} <span className="cm-guide-lvl">Level {guide.floor}</span></div>
              <ol className="cm-guide-steps">
                {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <div className="cm-guide-lift">Via <span style={{ color: LIFT_CORES.find(l => l.id === guide.lift)?.color }}>● {guide.lift.charAt(0).toUpperCase() + guide.lift.slice(1)} Lifts</span></div>
              <button className="cm-route-clear" onClick={() => setActiveGuide(null)}>✕ Close guide</button>
            </div>
          ) : (
            <div className="cm-guide-list">
              {GUIDES.map(g => (
                <button key={g.id} className="cm-guide-btn" onClick={() => openGuide(g)}>
                  <span className="cm-guide-dot" style={{ background: LIFT_CORES.find(l => l.id === g.lift)?.color }} />
                  <span className="cm-guide-btn-name">{g.name}</span>
                  <span className="cm-guide-btn-lvl">L{g.floor}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ward-round checklist — Linen by default; other teams only see this
            once their admin turns it on from the Admin console. */}
        {showRounds && (
          <>
            <div className="cm-progress-card">
              <div className="cm-progress-top">
                <span>Round progress</span>
                <span className={pct === 100 ? 'cm-done-txt' : ''}>{doneCount}/{TOTAL_TASKS}</span>
              </div>
              <div className="cm-progress-track"><div className="cm-progress-fill" style={{ width: `${pct}%` }} /></div>
              <button className="cm-reset" onClick={resetAll}>↺ Reset shift</button>
            </div>

            {selWard && (
              <div className="cm-sel-card">
                <div className="cm-sel-head"><span>{selWard.name}</span><span className="cm-sel-floor">Level {selWard.floor}</span></div>
                {selWard.tasks.map(t => (
                  <label key={t.id} className={`cm-task ${done.has(t.id) ? 'is-done' : ''}`}>
                    <input type="checkbox" checked={done.has(t.id)} onChange={() => toggleTask(t.id)} />
                    <span className="cm-lift-dot" style={{ background: LIFTS[t.lift].bg }} />
                    <span className="cm-task-note">{t.note}</span>
                    {t.round === 2 && <span className="cm-r2">2nd</span>}
                  </label>
                ))}
              </div>
            )}

            <div className="cm-rounds">
              <RoundGroup title="Orange Lift Area" tag="1 pass" color={LIFTS.orange.bg} tasks={rounds.orange} done={done} onToggle={toggleTask} onGo={goToTask} />
              <RoundGroup title="Blue Lift Area" tag="1 pass" color={LIFTS.blue.bg} tasks={rounds.blue} done={done} onToggle={toggleTask} onGo={goToTask} />
              <RoundGroup title="Yellow Lift Area" tag="1 pass" color={LIFTS.yellow.bg} tasks={rounds.yellow} done={done} onToggle={toggleTask} onGo={goToTask} />
              <RoundGroup title="2nd Round" tag="after 5:30 AM" color={LIFT_BADGE.purple} tasks={rounds.second} done={done} onToggle={toggleTask} onGo={goToTask} />
            </div>
          </>
        )}

        <div className="cm-tip">💡 Tap a room for A, switch levels and tap another for B — the planner routes via the right lift.{showRounds ? ' Tap a ward pin to tick it off.' : ''}{pinnedTasks.length ? ' 📍 pins are admin-assigned tasks — tap one to check it off.' : ''} Scroll to zoom · drag to pan.</div>
      </aside>

      {/* ══ MAP ══ */}
      <div className="cm-canvas-wrap">
        <div className="cm-floortabs">
          {FLOORS.map(f => (
            <button key={f.id} className={`cm-floortab ${activeFloor === f.id ? 'active' : ''}`} onClick={() => { setActiveFloor(f.id); setActiveGuide(null); }}>
              <span className="cm-floortab-label">{f.label}</span>
              <span className="cm-floortab-sub">{f.sub}</span>
            </button>
          ))}
        </div>

        <div className="cm-toolbar">
          <div className="cm-toolbar-title">{floor.label} — Monash Medical Centre, Clayton</div>
          {route && <span className="cm-route-badge">🧭 {fmtDist(route.length)} · {fmtTime(route.length)}</span>}
          {showRounds && (
            <div className="cm-legend">
              {Object.entries(LIFTS).map(([k, v]) => (
                <span key={k} className="cm-legend-item"><span className="cm-legend-dot" style={{ background: v.bg }} /> {v.name}</span>
              ))}
            </div>
          )}
          <label className="cm-chk"><input type="checkbox" checked={showPaths} onChange={() => setShowPaths(s => !s)} /> Paths</label>
          <label className="cm-chk"><input type="checkbox" checked={showLifts} onChange={() => setShowLifts(s => !s)} /> Lifts</label>
          <div className="cm-zoom">
            <button onClick={() => setZoom(z => Math.min(4, z * 1.15))}>＋</button>
            <button onClick={() => setZoom(z => Math.max(0.5, z / 1.15))}>－</button>
            <button onClick={resetView}>⌂</button>
          </div>
        </div>

        <div ref={wrapRef} className="cm-viewport" onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
          style={{ cursor: drag ? 'grabbing' : 'grab' }}>
          <div className="cm-stage" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, width: IMG_W, height: IMG_H, transition: drag ? 'none' : 'transform 0.08s ease' }}>
            <FloorPlan floor={activeFloor} rooms={floorRooms} showLifts={showLifts} showPaths={showPaths}
              onRoomClick={onRoomClick} hover={hover} setHover={setHover} from={from} to={to} route={floorRoute}
              highlightLabel={guideOnFloor?.destLabel || (searchHit?.floor === activeFloor ? searchHit.label : null)} pulseLiftId={guideOnFloor?.lift} />

            {showRounds && floorWards.map(w => {
              const st = wardState(w);
              const isSel = selectedWard === w.key;
              const isHov = hoverWard === w.key;
              const color = st.complete ? STATUS.good.mark : LIFTS[st.primary].bg;
              return (
                <div key={w.key} className={`cm-marker ${st.complete ? 'complete' : ''} ${isSel ? 'selected' : ''}`}
                  style={{ left: `${w.x * 100}%`, top: `${w.y * 100}%` }}
                  onMouseEnter={() => setHoverWard(w.key)} onMouseLeave={() => setHoverWard(null)}
                  onClick={(e) => { e.stopPropagation(); if (dragRef.current?.moved) return; setSelectedWard(w.key); if (w.tasks.length === 1) toggleTask(w.tasks[0].id); }}>
                  <div className="cm-pin" style={{ borderColor: color, background: st.complete ? color : '#fff' }}>
                    {st.complete ? <span className="cm-pin-check">✓</span> : <span className="cm-pin-count" style={{ color }}>{st.done}/{st.total}</span>}
                  </div>
                  {(isHov || isSel) && <div className="cm-pin-label" style={{ borderColor: color }}>{w.name}</div>}
                </div>
              );
            })}

            {Object.entries(floorPinGroups).map(([locId, ts]) => {
              const loc = ROOM_INDEX[locId];
              return ts.map((t, i) => {
                const cx = loc.cx + (i - (ts.length - 1) / 2) * 26;
                const cy = loc.cy - loc.h / 2 - 16;
                const wName = workerName(t.assignedTo);
                const color = t.done ? STATUS.good.mark : (PRIORITY_COLOR[t.priority] || BRAND_BLUE);
                const isHov = hoverPin === t.id;
                return (
                  <div key={t.id} className={`cm-marker cm-taskpin ${t.done ? 'complete' : ''}`}
                    style={{ left: `${(cx / IMG_W) * 100}%`, top: `${(cy / IMG_H) * 100}%` }}
                    onMouseEnter={() => setHoverPin(t.id)} onMouseLeave={() => setHoverPin(null)}
                    onClick={(e) => { e.stopPropagation(); if (dragRef.current?.moved) return; onTogglePin && onTogglePin(t); }}>
                    <div className="cm-pin cm-pin-task" style={{ borderColor: color, background: t.done ? color : '#fff' }}>
                      {t.done ? <span className="cm-pin-check">✓</span> : <span className="cm-pin-flag">📍</span>}
                    </div>
                    {isHov && (
                      <div className="cm-pin-label" style={{ borderColor: color }}>
                        {t.title}{wName ? ` · ${wName}` : ''}
                      </div>
                    )}
                  </div>
                );
              });
            })}

            {navState !== 'idle' && navPos && navPos.floor === activeFloor && (
              <div className="cm-navdot" style={{ left: `${(navPos.x / IMG_W) * 100}%`, top: `${(navPos.y / IMG_H) * 100}%` }}>
                <span className="cm-navdot-pulse" />
                <span className="cm-navdot-core" />
                <span className="cm-navdot-tag">You</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundGroup({ title, tag, color, tasks, done, onToggle, onGo }) {
  if (!tasks.length) return null;
  const d = tasks.filter(t => done.has(t.id)).length;
  return (
    <div className="cm-round-group">
      <div className="cm-round-head">
        <span className="cm-round-dot" style={{ background: color }} />
        <span className="cm-round-title">{title}</span>
        <span className="cm-round-tag">{tag}</span>
        <span className="cm-round-count">{d}/{tasks.length}</span>
      </div>
      <div className="cm-round-list">
        {tasks.map(t => (
          <div key={t.id} className={`cm-round-row ${done.has(t.id) ? 'is-done' : ''}`}>
            <input type="checkbox" checked={done.has(t.id)} onChange={() => onToggle(t.id)} />
            <button className="cm-round-ward" onClick={() => onGo(t)} title="Show on map">
              <span className="cm-round-ward-name">{t.wardName}</span>
              {t.note !== '—' && <span className="cm-round-ward-note">{t.note}</span>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const CM_CSS = `
.cm-shell{display:flex;height:100%;width:100%;background:var(--bg-primary);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter','Helvetica Neue',Arial,sans-serif;letter-spacing:-0.01em;overflow:hidden;border-radius:18px;box-shadow:0 1px 2px rgba(16,40,70,0.05),0 4px 14px rgba(16,40,70,0.06);}
.cm-sidebar{width:320px;min-width:320px;background:var(--bg-surface);border-right:1px solid var(--border-color);display:flex;flex-direction:column;overflow-y:auto;padding:18px;gap:14px;}
.cm-logo{display:flex;align-items:center;gap:11px;padding-bottom:14px;border-bottom:1px solid var(--border-color);}
.cm-logo-m{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--accent-color),var(--accent-dark));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:var(--text-on-accent);box-shadow:0 3px 8px rgba(0,92,169,0.3);}
.cm-logo-name{font-weight:800;font-size:15.5px;color:var(--accent-dark);letter-spacing:-0.01em;}
.cm-logo-sub{font-size:11px;color:var(--text-muted);}
.cm-logo{position:relative;}
.cm-sidebar-close{display:none;position:absolute;top:0;right:0;width:26px;height:26px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-elevated);color:var(--text-secondary);font-size:12px;cursor:pointer;align-items:center;justify-content:center;}
.cm-sidebar-toggle{display:none;}
.cm-sidebar-scrim{display:none;}

/* ── Room search ── */
.cm-search-box{position:relative;display:flex;align-items:center;gap:8px;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:11px;padding:9px 11px;}
.cm-search-box:focus-within{border-color:var(--accent-color);box-shadow:0 0 0 3px var(--accent-glow);background:var(--bg-surface);}
.cm-search-ic{font-size:12px;flex-shrink:0;opacity:0.65;}
.cm-search-box input{flex:1;min-width:0;border:none;background:transparent;outline:none;font-size:12.5px;font-family:inherit;color:var(--text-primary);}
.cm-search-box input::placeholder{color:var(--text-muted);}
.cm-search-clear{flex-shrink:0;border:none;background:transparent;color:var(--text-muted);font-size:11px;cursor:pointer;padding:2px 4px;}
.cm-search-clear:hover{color:var(--color-error-ink);}
.cm-search-results{position:absolute;z-index:60;top:calc(100% + 6px);left:0;right:0;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;box-shadow:var(--shadow-lg);padding:5px;display:flex;flex-direction:column;gap:2px;max-height:260px;overflow-y:auto;}
.cm-search-result{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border:none;background:transparent;border-radius:8px;font-size:12.5px;font-weight:600;color:var(--text-primary);cursor:pointer;text-align:left;font-family:inherit;}
.cm-search-result:hover{background:var(--accent-soft);}
.cm-search-result-floor{font-size:9.5px;font-weight:800;color:var(--text-secondary);background:var(--bg-primary);padding:2px 7px;border-radius:20px;flex-shrink:0;}
.cm-search-empty{padding:10px;font-size:12px;color:var(--text-muted);text-align:center;}
.cm-route-card{background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:12px;padding:13px;}
.cm-route-title{font-weight:800;font-size:12.5px;margin-bottom:10px;color:var(--accent-dark);letter-spacing:-0.01em;}
.cm-route-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.cm-ab{width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--text-on-accent);flex-shrink:0;}
.cm-ab.a{background:var(--color-success);} .cm-ab.b{background:var(--color-error);}
.cm-route-val{font-size:12px;font-weight:600;color:var(--text-primary);}
.cm-route-val.dim{color:var(--text-muted);font-weight:500;font-style:italic;}
.cm-route-stats{display:flex;gap:10px;margin:10px 0 4px;}
.cm-route-stats>div{flex:1;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:9px;padding:8px;text-align:center;}
.cm-stat-num{display:block;font-size:16px;font-weight:800;color:var(--accent-color);}
.cm-stat-lbl{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;}
.cm-route-none{font-size:11px;color:var(--color-error);margin-top:6px;}
.cm-route-hint{font-weight:600;font-size:9.5px;color:var(--text-muted);letter-spacing:0;text-transform:none;}
.cm-route-lvl{margin-left:auto;flex-shrink:0;font-size:9.5px;font-weight:800;color:var(--text-secondary);background:var(--bg-primary);border:1px solid var(--border-strong);padding:1px 8px;border-radius:20px;cursor:pointer;transition:all .12s;}
.cm-route-lvl:hover{background:var(--accent-soft);}
.cm-route-lvl.here{background:var(--accent-color);border-color:var(--accent-color);color:var(--text-on-accent);}
.cm-transfers{display:flex;flex-direction:column;gap:6px;margin-top:10px;}
.cm-transfer{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:var(--accent-soft);border:1px solid var(--border-color);border-radius:9px;padding:7px 9px;cursor:pointer;transition:all .12s;}
.cm-transfer:hover{background:var(--accent-soft);border-color:var(--accent-color);}
.cm-transfer-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0;box-shadow:0 0 0 2px var(--bg-surface),0 0 0 3px rgba(0,0,0,0.06);}
.cm-transfer-txt{font-size:11px;color:var(--text-primary);line-height:1.35;}
.cm-transfer-txt b{color:var(--accent-dark);}
.cm-route-clear{margin-top:9px;width:100%;background:var(--bg-surface);border:1px solid var(--border-strong);color:var(--text-secondary);padding:6px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:600;}
.cm-route-clear:hover{background:var(--bg-elevated);border-color:var(--border-strong);}
.cm-guides-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:13px;}
.cm-guide-list{display:flex;flex-direction:column;gap:6px;}
.cm-guide-btn{display:flex;align-items:center;gap:9px;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:9px;padding:8px 10px;cursor:pointer;color:var(--text-primary);text-align:left;transition:all .12s;}
.cm-guide-btn:hover{background:var(--accent-soft);border-color:var(--accent-color);transform:translateX(2px);}
.cm-guide-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.cm-guide-btn-name{flex:1;font-size:11.5px;font-weight:600;}
.cm-guide-btn-lvl{font-size:9.5px;font-weight:800;color:var(--text-secondary);background:var(--bg-elevated);padding:1px 7px;border-radius:10px;}
.cm-guide-name{font-size:13px;font-weight:800;color:var(--accent-dark);margin-bottom:9px;}
.cm-guide-lvl{font-size:9.5px;font-weight:800;color:var(--text-secondary);background:var(--bg-elevated);padding:1px 7px;border-radius:10px;margin-left:4px;}
.cm-guide-steps{margin:0 0 9px;padding-left:20px;display:flex;flex-direction:column;gap:7px;}
.cm-guide-steps li{font-size:11.5px;line-height:1.45;color:var(--text-secondary);}
.cm-guide-steps li::marker{color:var(--accent-color);font-weight:800;}
.cm-guide-lift{font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:9px;}
.cm-progress-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:13px;}
.cm-progress-top{display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;margin-bottom:8px;color:var(--text-secondary);}
.cm-progress-top .cm-done-txt{color:var(--color-success);}
.cm-progress-track{height:9px;background:var(--border-color);border-radius:5px;overflow:hidden;}
.cm-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent-color),var(--accent-mid));border-radius:5px;transition:width .3s ease;}
.cm-reset{margin-top:11px;width:100%;background:var(--bg-surface);border:1px solid var(--border-strong);color:var(--text-secondary);padding:7px;border-radius:8px;font-size:11.5px;cursor:pointer;font-weight:600;}
.cm-reset:hover{background:var(--bg-elevated);}
.cm-sel-card{background:var(--bg-elevated);border:1px solid var(--accent-color);border-radius:12px;padding:12px;}
.cm-sel-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:13.5px;margin-bottom:8px;color:var(--accent-dark);}
.cm-sel-floor{font-size:10.5px;color:var(--text-secondary);font-weight:700;background:var(--bg-elevated);padding:2px 8px;border-radius:20px;}
.cm-task{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:7px;cursor:pointer;font-size:12.5px;color:var(--text-primary);}
.cm-task:hover{background:var(--accent-soft);}
.cm-task input{width:16px;height:16px;accent-color:var(--color-success);cursor:pointer;}
.cm-task.is-done .cm-task-note{text-decoration:line-through;color:var(--text-muted);}
.cm-lift-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.cm-task-note{flex:1;}
.cm-r2{font-size:9px;font-weight:800;color:var(--cat-purple);background:var(--accent-soft);padding:1px 6px;border-radius:10px;}
.cm-rounds{display:flex;flex-direction:column;gap:11px;}
.cm-round-group{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;overflow:hidden;}
.cm-round-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-elevated);border-bottom:1px solid var(--border-color);}
.cm-round-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;}
.cm-round-title{font-weight:800;font-size:12.5px;color:var(--accent-dark);}
.cm-round-tag{font-size:9.5px;color:var(--text-muted);font-style:italic;}
.cm-round-count{margin-left:auto;font-size:11px;font-weight:800;color:var(--text-secondary);}
.cm-round-list{padding:5px 7px 9px;}
.cm-round-row{display:flex;align-items:center;gap:9px;padding:5px;border-radius:7px;}
.cm-round-row:hover{background:var(--accent-soft);}
.cm-round-row input{width:16px;height:16px;accent-color:var(--color-success);cursor:pointer;flex-shrink:0;}
.cm-round-ward{flex:1;display:flex;flex-direction:column;align-items:flex-start;background:none;border:none;color:inherit;cursor:pointer;text-align:left;padding:0;}
.cm-round-ward-name{font-size:12px;font-weight:600;color:var(--text-primary);}
.cm-round-ward-note{font-size:10.5px;color:var(--text-muted);}
.cm-round-row.is-done .cm-round-ward-name{text-decoration:line-through;color:var(--text-muted);}
.cm-tip{font-size:10.5px;color:var(--text-muted);line-height:1.55;padding:2px;margin-top:auto;}
.cm-canvas-wrap{flex:1;display:flex;flex-direction:column;background:var(--bg-primary);min-width:0;}
.cm-floortabs{display:flex;gap:6px;padding:12px 14px 0;flex-wrap:wrap;}
.cm-floortab{display:flex;flex-direction:column;align-items:flex-start;background:var(--bg-surface);border:1px solid var(--border-strong);border-bottom:none;border-radius:9px 9px 0 0;padding:8px 15px;cursor:pointer;color:var(--text-secondary);transition:all .14s;}
.cm-floortab:hover{background:var(--bg-elevated);}
.cm-floortab.active{background:var(--accent-color);border-color:var(--accent-color);color:var(--text-on-accent);box-shadow:0 -2px 8px rgba(0,92,169,0.2);}
.cm-floortab-label{font-weight:800;font-size:12.5px;}
.cm-floortab-sub{font-size:9.5px;opacity:.8;}
.cm-toolbar{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg-surface);border-bottom:1px solid var(--border-color);flex-wrap:wrap;}
.cm-toolbar-title{font-size:13px;font-weight:800;color:var(--accent-dark);letter-spacing:-0.01em;}
.cm-route-badge{font-size:11px;font-weight:800;color:var(--text-on-accent);background:var(--accent-color);padding:3px 11px;border-radius:20px;}
.cm-legend{display:flex;gap:13px;margin-left:6px;}
.cm-legend-item{display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-secondary);font-weight:500;}
.cm-legend-dot{width:11px;height:11px;border-radius:50%;}
.cm-chk{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-secondary);cursor:pointer;font-weight:600;}
.cm-chk input{accent-color:var(--accent-color);cursor:pointer;}
.cm-zoom{margin-left:auto;display:flex;gap:6px;}
.cm-zoom button{width:32px;height:32px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border-strong);color:var(--text-secondary);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;}
.cm-zoom button:hover{background:var(--accent-soft);border-color:var(--accent-color);}
.cm-viewport{flex:1;position:relative;overflow:hidden;background:var(--bg-primary);}
.cm-stage{position:absolute;top:0;left:0;transform-origin:0 0;}
.cm-svg{display:block;user-select:none;box-shadow:0 10px 44px rgba(20,50,80,0.18);border-radius:8px;}
.cm-marker{position:absolute;transform:translate(-50%,-50%);cursor:pointer;z-index:5;}
.cm-marker.selected{z-index:8;}
.cm-pin{width:30px;height:30px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 9px rgba(20,50,80,0.35);transition:transform .12s;}
.cm-marker:hover .cm-pin{transform:scale(1.15);}
.cm-marker.selected .cm-pin{box-shadow:0 0 0 4px rgba(0,92,169,0.35),0 3px 9px rgba(20,50,80,0.35);}
.cm-pin-count{font-size:10px;font-weight:800;}
.cm-pin-check{color:#fff;font-size:15px;font-weight:900;}
.cm-pin-label{position:absolute;top:34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--accent-dark);border:1px solid var(--accent-dark);border-radius:7px;padding:3px 9px;font-size:11px;font-weight:700;color:var(--text-on-accent);box-shadow:0 3px 10px rgba(20,50,80,0.35);}
.cm-taskpin{z-index:7;}
.cm-pin-task{width:24px;height:24px;}
.cm-pin-flag{font-size:12px;line-height:1;}
.cm-taskpin .cm-pin-label{top:28px;}

/* ══════════ APPLE SYSTEM PASS — softer weights, elevation, segmented tabs ══════════ */
.cm-shell button,.cm-shell input{font-family:inherit;letter-spacing:-0.01em;}
.cm-sidebar{border-right:1px solid var(--border-color);padding:16px;gap:12px;}
.cm-logo-m{border-radius:12px;box-shadow:0 2px 8px rgba(0,92,169,0.25);}
.cm-logo-name{font-weight:700;}
/* Cards: unified soft elevation + larger radius */
.cm-route-card,.cm-guides-card,.cm-progress-card,.cm-sel-card,.cm-round-group{border-radius:16px;border-color:var(--border-color);box-shadow:0 1px 2px rgba(16,40,70,0.04),0 4px 14px rgba(16,40,70,0.05);}
.cm-route-card{background:var(--bg-elevated);border-color:var(--border-color);}
.cm-round-head{border-bottom-color:var(--border-color);}
/* Soften bold headings to SF-style weights */
.cm-route-title,.cm-guide-name,.cm-round-title,.cm-sel-head,.cm-toolbar-title,.cm-stat-num,.cm-pin-count,.cm-progress-top{font-weight:700;letter-spacing:-0.015em;}
/* Muted-text contrast, consistent with the dashboard */
.cm-stat-lbl,.cm-round-tag,.cm-guide-btn-lvl,.cm-tip,.cm-round-ward-note{color:var(--text-muted);}
.cm-legend-item,.cm-chk,.cm-guide-lift,.cm-route-hint{color:var(--text-secondary);}
/* Buttons & interactive surfaces */
.cm-guide-btn,.cm-transfer,.cm-route-lvl,.cm-route-clear,.cm-reset,.cm-zoom button{transition:all .16s ease;}
.cm-guide-btn:hover{transform:none;background:var(--accent-soft);border-color:var(--accent-color);box-shadow:0 2px 8px rgba(16,40,70,0.06);}
.cm-reset,.cm-route-clear{border-radius:10px;}
.cm-zoom button{border-radius:10px;box-shadow:0 1px 2px rgba(16,40,70,0.05);}
/* Floor tabs → Apple segmented control (matches the dashboard nav tabs) */
.cm-floortabs{display:inline-flex;flex-wrap:wrap;gap:3px;margin:14px 14px 2px;padding:3px;background:var(--bg-segment);border:1px solid var(--border-color);border-radius:14px;}
.cm-floortab{background:transparent;border:none;box-shadow:none;border-radius:11px;color:var(--text-secondary);padding:7px 15px;}
.cm-floortab-label{font-weight:600;letter-spacing:-0.01em;}
.cm-floortab-sub{opacity:.75;}
.cm-floortab:hover{background:var(--bg-elevated);color:var(--text-primary);}
.cm-floortab.active{background:var(--bg-surface);color:var(--accent-dark);box-shadow:0 1px 2px rgba(16,40,70,0.08),0 1px 3px rgba(16,40,70,0.06);}
/* Toolbar strip */
.cm-toolbar{border-bottom:1px solid var(--border-color);gap:14px;}
.cm-route-badge{font-weight:700;box-shadow:0 2px 8px rgba(0,92,169,0.25);}
/* Map surface & pins */
.cm-svg{border-radius:14px;box-shadow:0 10px 40px rgba(20,50,80,0.14);}
.cm-pin{box-shadow:0 2px 8px rgba(20,50,80,0.28);}

/* ── Live navigation controls ── */
.cm-nav{margin-top:10px;}
.cm-nav-start{width:100%;background:var(--accent-color);color:var(--text-on-accent);border:none;border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,92,169,0.28);transition:all .15s;}
.cm-nav-start:hover{background:var(--accent-dark);box-shadow:0 4px 12px rgba(0,92,169,0.32);}
.cm-nav-live{display:flex;flex-direction:column;gap:7px;}
.cm-nav-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.cm-nav-badge{font-size:10px;font-weight:800;color:var(--text-on-accent);background:var(--color-success);padding:2px 9px;border-radius:20px;letter-spacing:.02em;}
.cm-nav-badge.paused{background:var(--color-warning-ink);}
.cm-nav-remain{font-size:11px;font-weight:600;color:var(--text-secondary);text-align:right;}
.cm-nav-track{height:6px;background:var(--border-color);border-radius:4px;overflow:hidden;}
.cm-nav-fill{height:100%;background:linear-gradient(90deg,var(--accent-color),var(--accent-mid));border-radius:4px;transition:width .12s linear;}
.cm-nav-btns{display:flex;gap:6px;}
.cm-nav-btns button{flex:1;background:var(--bg-surface);border:1px solid var(--border-strong);color:var(--text-secondary);border-radius:8px;padding:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;}
.cm-nav-btns button:hover{background:var(--bg-elevated);border-color:var(--border-strong);}

/* ── "You are here" live dot ── */
.cm-navdot{position:absolute;transform:translate(-50%,-50%);z-index:12;pointer-events:none;}
.cm-navdot-core{display:block;width:18px;height:18px;border-radius:50%;background:var(--accent-color);border:3px solid var(--bg-surface);box-shadow:0 2px 9px rgba(0,92,169,0.55);position:relative;z-index:2;}
.cm-navdot-pulse{position:absolute;top:50%;left:50%;width:18px;height:18px;border-radius:50%;background:rgba(0,92,169,0.35);transform:translate(-50%,-50%);z-index:1;animation:cmnavpulse 1.5s ease-out infinite;}
@keyframes cmnavpulse{0%{width:18px;height:18px;opacity:.7;}100%{width:56px;height:56px;opacity:0;}}
.cm-navdot-tag{position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--accent-dark);color:var(--text-on-accent);font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:6px;box-shadow:0 3px 8px rgba(20,50,80,0.35);}

/* ══════════ RESPONSIVE — tablet & phone ══════════ */
@media (max-width: 860px){
  .cm-shell{border-radius:0;height:100%;}
  .cm-sidebar-toggle{
    display:flex;align-items:center;gap:6px;position:absolute;top:10px;left:10px;z-index:40;
    background:var(--accent-color);color:var(--text-on-accent);border:none;border-radius:10px;padding:9px 13px;font-size:12px;font-weight:700;
    cursor:pointer;box-shadow:0 4px 14px rgba(0,92,169,0.35);font-family:inherit;
  }
  .cm-sidebar-scrim{display:block;position:absolute;inset:0;background:rgba(10,20,35,0.4);z-index:29;}
  .cm-sidebar{
    position:absolute;top:0;left:0;bottom:0;z-index:30;width:86vw;max-width:360px;min-width:0;
    transform:translateX(-100%);transition:transform 0.22s ease;box-shadow:0 0 40px rgba(0,0,0,0.25);
  }
  .cm-sidebar.open{transform:translateX(0);}
  .cm-sidebar-close{display:flex;}
  .cm-canvas-wrap{width:100%;}
  .cm-floortabs{margin:52px 10px 2px;}
  .cm-toolbar{flex-wrap:wrap;gap:8px;padding:10px;}
  .cm-legend{margin-left:0;order:3;width:100%;overflow-x:auto;}
  .cm-zoom{margin-left:auto;}
}
@media (max-width: 480px){
  .cm-toolbar-title{font-size:11.5px;}
  .cm-route-badge{display:none;}
  .cm-floortab{padding:6px 10px;}
  .cm-floortab-sub{display:none;}
}
`;
