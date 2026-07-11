// ══════════════════════════════════════════════════════════════════════
// Cleaning Rounds — single source of truth
// Shared by the Floor Map and the Dashboard so completion stays in sync.
// Domain: one Night Linen & Environmental Services Assistant working the
// Monash Clayton (MMC) overnight linen / waste cleaning rounds.
// ══════════════════════════════════════════════════════════════════════
import { useEffect, useReducer } from 'react';
import { LIFT_BADGE } from './theme.js';

export const STORAGE_KEY = 'mediflow-cleaning-rounds-v1';

// The one on-shift worker this app represents
export const ASSISTANT = {
  name: 'Night Linen Assistant',
  role: 'Linen & Environmental Services',
  site: 'Monash Medical Centre — Clayton',
  shift: '10:30 PM – 7:00 AM',
};

// Lift-zone accent colours (Monash wayfinding) — single source in theme.js
export { LIFT_BADGE };

// Wards / locations + their tasks (also carry map coords used by the Floor Map)
export const WARDS = [
  { key: 'l3-icu', floor: '3', name: 'ICU', x: 0.205, y: 0.827, tasks: [
    { id: 'l3-icu-b',  lift: 'blue', note: '3 pan rooms' },
    { id: 'l3-icu-r2', lift: 'blue', note: '2nd round — after 5:30 AM', round: 2 },
  ]},
  { key: 'l3-31', floor: '3', name: 'Ward 31 (J31)', x: 0.293, y: 0.827, tasks: [{ id: 'l3-31-b', lift: 'blue', note: '—' }] },
  { key: 'l3-32', floor: '3', name: 'Ward 32', x: 0.383, y: 0.827, tasks: [{ id: 'l3-32-b', lift: 'blue', note: '—' }] },
  { key: 'l3-33', floor: '3', name: 'Ward 33', x: 0.473, y: 0.827, tasks: [
    { id: 'l3-33-o', lift: 'orange', note: '1 cage' }, { id: 'l3-33-b', lift: 'blue', note: '1 pan room' },
  ]},
  { key: 'l3-34', floor: '3', name: 'Ward 34', x: 0.563, y: 0.827, tasks: [
    { id: 'l3-34-o', lift: 'orange', note: '—' }, { id: 'l3-34-b', lift: 'blue', note: '—' },
  ]},
  { key: 'l4-40', floor: '4', name: 'Ward 40', x: 0.205, y: 0.827, tasks: [{ id: 'l4-40-b', lift: 'blue', note: '1 staff room, 1 nurse room' }] },
  { key: 'l4-41', floor: '4', name: 'Ward 41', x: 0.293, y: 0.827, tasks: [{ id: 'l4-41-b', lift: 'blue', note: '1 cage' }] },
  { key: 'l4-42', floor: '4', name: 'Ward 42', x: 0.383, y: 0.827, tasks: [{ id: 'l4-42-b', lift: 'blue', note: '—' }] },
  { key: 'l4-44', floor: '4', name: 'Ward 44', x: 0.473, y: 0.827, tasks: [
    { id: 'l4-44-o', lift: 'orange', note: '—' }, { id: 'l4-44-b', lift: 'blue', note: '—' },
  ]},
  { key: 'l5-birth', floor: '5', name: 'Birth Suite', x: 0.205, y: 0.827, tasks: [
    { id: 'l5-birth-b',  lift: 'blue', note: '1 room' },
    { id: 'l5-birth-r2', lift: 'blue', note: '2nd round — 1 pan room (VB)', round: 2 },
  ]},
  { key: 'l5-51', floor: '5', name: 'Ward 51 N&S (J51)', x: 0.293, y: 0.827, tasks: [{ id: 'l5-51-b', lift: 'blue', note: '—' }] },
  { key: 'l5-52', floor: '5', name: 'Ward 52', x: 0.383, y: 0.827, tasks: [{ id: 'l5-52-b', lift: 'blue', note: '2 cages' }] },
  { key: 'l5-54', floor: '5', name: 'Ward 54', x: 0.473, y: 0.827, tasks: [
    { id: 'l5-54-o',  lift: 'orange', note: '1 cage' }, { id: 'l5-54-b', lift: 'blue', note: '—' },
    { id: 'l5-54-r2', lift: 'blue', note: '2nd round — after 5:30 AM', round: 2 },
  ]},
  { key: 'l2-ed', floor: '2', name: 'Emergency Dept (ED)', x: 0.240, y: 0.885, tasks: [
    { id: 'l2-ed-y',  lift: 'yellow', note: '1 pass' },
    { id: 'l2-ed-r2', lift: 'yellow', note: '2nd round — after 5:30 AM', round: 2 },
  ]},
];

export const GENERAL_TASKS = [
  { id: 'gen-cage', lift: 'blue', note: 'General — collect cage', wardName: 'General', floor: '3' },
];

// Flattened task list (one entry per checkable item)
export const ALL_TASKS = [
  ...WARDS.flatMap(w => w.tasks.map(t => ({ ...t, wardKey: w.key, wardName: w.name, floor: w.floor }))),
  ...GENERAL_TASKS,
];
export const TOTAL_TASKS = ALL_TASKS.length;

// Task groups by lift zone (matches the paper round sheet)
export const ROUND_GROUPS = [
  { key: 'orange', title: 'Orange Lift Area', tag: '1 pass', color: LIFT_BADGE.orange, tasks: ALL_TASKS.filter(t => t.lift === 'orange' && t.round !== 2) },
  { key: 'blue',   title: 'Blue Lift Area',   tag: '1 pass', color: LIFT_BADGE.blue,   tasks: ALL_TASKS.filter(t => t.lift === 'blue'   && t.round !== 2) },
  { key: 'yellow', title: 'Yellow Lift Area', tag: '1 pass', color: LIFT_BADGE.yellow, tasks: ALL_TASKS.filter(t => t.lift === 'yellow' && t.round !== 2) },
  { key: 'second', title: '2nd Round',        tag: 'after 5:30 AM', color: LIFT_BADGE.purple, tasks: ALL_TASKS.filter(t => t.round === 2) },
];

export const floorLabel = (f) => (f === '2' ? 'Level 2' : f === '3' ? 'Level 3' : f === '4' ? 'Level 4' : f === '5' ? 'Level 5' : f === '1' ? 'Level 1' : `Level ${f}`);

// ─── Shared completion store (localStorage-backed, live cross-component sync) ───
function load() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? new Set(JSON.parse(raw)) : new Set(); }
  catch { return new Set(); }
}
let _done = load();
const subscribers = new Set();
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([..._done])); } catch {} }
function emit() { subscribers.forEach(fn => fn()); }

export function getDone() { return _done; }
export function toggleTask(id) {
  const next = new Set(_done);
  next.has(id) ? next.delete(id) : next.add(id);
  _done = next; save(); emit();
}
export function setTaskDone(id, value) {
  const next = new Set(_done);
  value ? next.add(id) : next.delete(id);
  _done = next; save(); emit();
}
export function resetRounds() { _done = new Set(); save(); emit(); }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) { _done = load(); emit(); } });
}

// React hook: re-renders on any change to the shared completion set
export function useRounds() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const fn = () => force();
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }, []);
  const done = _done;
  const doneCount = ALL_TASKS.filter(t => done.has(t.id)).length;
  const pct = TOTAL_TASKS ? Math.round((doneCount / TOTAL_TASKS) * 100) : 0;
  return { done, toggle: toggleTask, setDone: setTaskDone, reset: resetRounds, doneCount, pct, total: TOTAL_TASKS };
}
