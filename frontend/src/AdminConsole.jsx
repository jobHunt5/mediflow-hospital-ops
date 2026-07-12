import React, { useState } from 'react';
import Dropdown from './Dropdown.jsx';
import PasswordInput from './PasswordInput.jsx';
import { PRIORITY_COLOR } from './theme.js';
import { PIN_LOCATIONS } from './FloorMap.jsx';
import { useToast } from './Toast.jsx';
import { useConfirm } from './ConfirmDialog.jsx';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const PRIORITY_OPTS = PRIORITIES.map(p => ({ value: p, label: `${cap(p)} priority`, dot: PRIORITY_COLOR[p] }));
const PRIORITY_OPTS_SHORT = PRIORITIES.map(p => ({ value: p, label: cap(p), dot: PRIORITY_COLOR[p] }));
const PIN_BY_ID = Object.fromEntries(PIN_LOCATIONS.map(l => [l.id, l]));
const PIN_OPTIONS = [{ value: '', label: 'No map pin' }, ...PIN_LOCATIONS.map(l => ({ value: l.id, label: `📍 ${l.name} — Level ${l.floor}` }))];
const pinLabel = (id) => (id && PIN_BY_ID[id] ? `${PIN_BY_ID[id].name} — Level ${PIN_BY_ID[id].floor}` : null);
const fmtH = (h) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
const initialsOf = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

// Shift is stored as a plain display string ("10:30 PM - 7:00 AM"), but
// admins edit it as two real <input type="time"> pickers rather than free
// text -- these convert between the two.
function parseShiftRange(shiftStr, fallback = { shiftStart: '22:30', shiftEnd: '07:00' }) {
  const m = (shiftStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return fallback;
  const to24 = (h, mm, ap) => {
    h = parseInt(h, 10); mm = parseInt(mm, 10);
    if (/pm/i.test(ap) && h !== 12) h += 12;
    if (/am/i.test(ap) && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return { shiftStart: to24(m[1], m[2], m[3]), shiftEnd: to24(m[4], m[5], m[6]) };
}
function formatShiftRange(start, end) {
  const to12 = (hhmm) => {
    if (!hhmm) return '';
    let [h, m] = hhmm.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return start && end ? `${to12(start)} - ${to12(end)}` : '';
}
const TONE_VAR = { accent: 'var(--accent-color)', success: 'var(--color-success-ink)', warn: 'var(--color-warning-ink)', danger: 'var(--color-error-ink)' };

const AdmIcon = ({ name }) => {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'overview': return (<svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>);
    case 'workers': return (<svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.2" /><path d="M18 14.2A6 6 0 0 1 21 20" /></svg>);
    case 'tasks': return (<svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>);
    case 'bins': return (<svg {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>);
    case 'leave': return (<svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
    case 'avail': return (<svg {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>);
    case 'hours': return (<svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>);
    case 'alert': return (<svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
    case 'team': return (<svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /><path d="M16.5 4.5l1.2 1.2 2-2" /></svg>);
    case 'closure': return (<svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
    default: return null;
  }
};

function OverviewTile({ label, n, of, tone = 'accent' }) {
  return (
    <div className="adm-stat">
      <span className="adm-stat-n" style={{ color: TONE_VAR[tone] }}>
        {n}{of != null ? <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>/{of}</span> : ''}
      </span>
      <span className="adm-stat-l">{label}</span>
    </div>
  );
}

function WorkerRow({ worker, taskCount, onSave, onDelete, onBreak, onResetPassword }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(() => ({ ...worker, ...parseShiftRange(worker.shift, { shiftStart: '', shiftEnd: '' }) }));
  const toast = useToast();
  const confirmDialog = useConfirm();
  const save = () => {
    const shift = formatShiftRange(f.shiftStart, f.shiftEnd) || f.shift;
    onSave(worker.id, { name: f.name, role: f.role, zone: f.zone, shift, phone: f.phone });
    setEditing(false);
    toast.success('Worker updated', `${f.name}'s details were saved.`);
  };
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete ${worker.name}?`,
      body: 'This removes their profile and login. Tasks assigned to them will be unassigned. This can\'t be undone.',
      confirmLabel: 'Delete worker',
      danger: true,
    });
    if (!ok) return;
    onDelete(worker.id);
    toast.success('Worker deleted', `${worker.name} was removed.`);
  };

  if (editing) {
    return (
      <div className="adm-row adm-row-edit">
        <div className="adm-edit-grid">
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Name" />
          <input value={f.role} onChange={e => setF({ ...f, role: e.target.value })} placeholder="Role" />
          <input value={f.zone} onChange={e => setF({ ...f, zone: e.target.value })} placeholder="Zone / floor" />
          <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="Phone" />
          <label className="adm-shift-field">
            <span className="adm-shift-label">Shift start</span>
            <input type="time" value={f.shiftStart || ''} onChange={e => setF({ ...f, shiftStart: e.target.value })} />
          </label>
          <label className="adm-shift-field">
            <span className="adm-shift-label">Shift end</span>
            <input type="time" value={f.shiftEnd || ''} onChange={e => setF({ ...f, shiftEnd: e.target.value })} />
          </label>
        </div>
        <div className="adm-row-actions">
          <button className="adm-btn save" onClick={save}>Save</button>
          <button className="adm-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="adm-row">
      <div className="adm-avatar">{initialsOf(worker.name)}</div>
      <div className="adm-worker-main">
        <div className="adm-worker-name">
          {worker.name}
          {worker.clockedInAt && <span className="adm-live-badge">● on shift</span>}
        </div>
        <div className="adm-worker-sub">{worker.role || '—'}{worker.zone ? ` · ${worker.zone}` : ''}</div>
        <div className="adm-worker-meta">{worker.shift}{worker.phone ? ` · ${worker.phone}` : ''} · <b>{taskCount}</b> task{taskCount !== 1 ? 's' : ''}</div>
      </div>
      <div className="adm-row-actions">
        <button className="adm-btn coffee" onClick={() => onBreak(worker.id)}>☕ Break</button>
        <button className="adm-btn ghost" onClick={() => onResetPassword(worker.id)}>🔑 Reset password</button>
        <button className="adm-btn ghost" onClick={() => setEditing(true)}>Edit</button>
        <button className="adm-btn danger" onClick={remove}>Delete</button>
      </div>
    </div>
  );
}

function TaskRow({ task, workers, areas, onSave, onDelete, onToggle, onDuplicate }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(task);
  const toast = useToast();
  const confirmDialog = useConfirm();
  const save = () => {
    onSave(task.id, { title: f.title, area: f.area, easyWay: f.easyWay, pinId: f.pinId || null });
    setEditing(false);
    toast.success('Task updated', `"${f.title}" was saved.`);
  };
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete "${task.title}"?`,
      body: 'This removes the task and its map pin, if any. This can\'t be undone.',
      confirmLabel: 'Delete task',
      danger: true,
    });
    if (!ok) return;
    onDelete(task.id);
    toast.success('Task deleted', `"${task.title}" was removed.`);
  };
  const duplicate = () => { onDuplicate(task); toast.success('Task duplicated', `A copy of "${task.title}" was created.`); };

  return (
    <div className={`adm-row adm-task ${task.done ? 'is-done' : ''}`}>
      <button className={`adm-check ${task.done ? 'on' : ''}`} onClick={() => onToggle(task)} aria-label="toggle done">{task.done ? '✓' : ''}</button>
      <div className="adm-task-main">
        {editing ? (
          <div className="adm-edit-stack">
            <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Task title" />
            <Dropdown block value={f.area} onChange={v => setF({ ...f, area: v })} options={areas} placeholder="Select area…" />
            <Dropdown block value={f.pinId || ''} onChange={v => setF({ ...f, pinId: v })} options={PIN_OPTIONS} placeholder="Pin on map (optional)…" />
            <textarea value={f.easyWay || ''} onChange={e => setF({ ...f, easyWay: e.target.value })} placeholder="Easy way to complete (pathway / tip)…" rows={2} />
          </div>
        ) : (
          <>
            <div className="adm-task-title">{task.title}{task.easyWay ? <span className="adm-tip-flag" title={task.easyWay}> 💡</span> : ''}</div>
            <div className="adm-task-sub">{task.area || 'No area'}{pinLabel(task.pinId) ? ` · 📍 ${pinLabel(task.pinId)}` : ''}</div>
          </>
        )}
      </div>
      <Dropdown className="dd-priority" value={task.priority} onChange={v => onSave(task.id, { priority: v })} options={PRIORITY_OPTS_SHORT} />
      <Dropdown className="dd-assignee" value={task.assignedTo || ''} onChange={v => onSave(task.id, { assignedTo: v || null })}
        options={[{ value: '', label: 'Unassigned' }, ...workers.map(w => ({ value: w.id, label: w.name }))]} />
      <div className="adm-row-actions">
        {editing
          ? (<><button className="adm-btn save" onClick={save}>Save</button><button className="adm-btn ghost" onClick={() => setEditing(false)}>Cancel</button></>)
          : (<>
              <button className="adm-btn ghost" title="Duplicate for tomorrow night" aria-label="Duplicate task" onClick={duplicate}>⧉</button>
              <button className="adm-btn ghost" onClick={() => { setF(task); setEditing(true); }}>Edit</button>
              <button className="adm-btn danger" onClick={remove}>Delete</button>
            </>)}
      </div>
    </div>
  );
}

const emptyDept = { id: 'linen', name: 'Linen & Environmental Services', short: 'Linen', accent: 'var(--accent-color)', managerTitle: 'Night Manager', workerTitle: 'Worker', shiftDefault: '10:30 PM - 7:00 AM', hasBins: true };

export default function AdminConsole({ workers, tasks, areas = [], leaves = [], availability = [], nightManager, api, bins = [], notifications = [], hoursLog = [], department = 'linen', deptConfig = emptyDept, closures = [], showWardRounds = false }) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [tab, setTab] = useState('overview');
  const [wForm, setWForm] = useState(() => ({ name: '', role: '', zone: '', ...parseShiftRange(deptConfig.shiftDefault), phone: '', password: '' }));
  const [newCredentials, setNewCredentials] = useState(null);
  const [tForm, setTForm] = useState({ title: '', area: '', priority: 'normal', assignedTo: '', easyWay: '', pinId: '' });
  const [nm, setNm] = useState(nightManager || { name: '', role: '', phone: '', location: '' });
  const [nmSaved, setNmSaved] = useState(false);
  const [wSearch, setWSearch] = useState('');
  const [tSearch, setTSearch] = useState('');
  const [clForm, setClForm] = useState({ title: '', message: '' });

  React.useEffect(() => { setWForm(f => ({ ...f, ...parseShiftRange(deptConfig.shiftDefault) })); setTab('overview'); }, [department]);

  React.useEffect(() => { if (nightManager) setNm(nightManager); }, [nightManager]);

  const saveNightManager = () => {
    api.updateNightManager(nm);
    setNmSaved(true);
    setTimeout(() => setNmSaved(false), 2200);
  };

  const workerName = (id) => workers.find(w => w.id === id)?.name || 'Unknown';

  const resetWorkerPassword = async (id) => {
    const worker = workers.find(w => w.id === id);
    const ok = await confirmDialog({
      title: `Reset ${worker?.name || 'this worker'}'s password?`,
      body: 'Their old password stops working immediately and a new one-time password is generated.',
      confirmLabel: 'Reset password',
      danger: true,
    });
    if (!ok) return;
    const res = await api.resetWorkerPassword(id);
    const data = await res?.json?.().catch(() => null);
    if (data?.credentials) setNewCredentials(data.credentials);
    else toast.error('Could not reset password', 'Please try again.');
  };

  const submitWorker = async (e) => {
    e.preventDefault();
    if (!wForm.name.trim()) return;
    const shift = formatShiftRange(wForm.shiftStart, wForm.shiftEnd) || deptConfig.shiftDefault;
    const payload = { name: wForm.name, role: wForm.role, zone: wForm.zone, shift, phone: wForm.phone };
    if (wForm.password.trim()) payload.password = wForm.password.trim();
    const res = await api.createWorker(payload);
    const data = await res?.json?.().catch(() => null);
    if (data?.credentials) setNewCredentials(data.credentials);
    // Zone and shift stay put -- when adding several workers for the same
    // shift in a row, re-typing the same start/end time every time is the
    // exact friction this is meant to remove. Only the per-person fields reset.
    setWForm(f => ({ ...f, name: '', role: '', phone: '', password: '' }));
  };
  const submitTask = (e) => {
    e.preventDefault();
    if (!tForm.title.trim()) return;
    api.createTask({ ...tForm, assignedTo: tForm.assignedTo || null, pinId: tForm.pinId || null });
    toast.success('Task created', `"${tForm.title}" was added${tForm.assignedTo ? ` and assigned to ${workerName(tForm.assignedTo)}.` : '.'}`);
    setTForm({ title: '', area: '', priority: 'normal', assignedTo: '', easyWay: '', pinId: '' });
  };
  const duplicateTask = (task) => api.createTask({ title: task.title, area: task.area, priority: task.priority, assignedTo: null, easyWay: task.easyWay || '', pinId: task.pinId || null });
  const submitClosure = (e) => { e.preventDefault(); if (!clForm.title.trim() || !clForm.message.trim()) return; api.createClosure({ ...clForm, department }); setClForm({ title: '', message: '' }); };

  const doneCount = tasks.filter(t => t.done).length;
  const pendingLeave = leaves.filter(l => l.status === 'pending').length;
  const onShiftCount = workers.filter(w => w.clockedInAt).length;
  const binsFull = bins.filter(b => b.status === 'full').length;
  const binsMedium = bins.filter(b => b.status === 'medium').length;
  const activeAlerts = notifications
    .filter(n => n.status !== 'resolved')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const wq = wSearch.trim().toLowerCase();
  const filteredWorkers = wq ? workers.filter(w => [w.name, w.role, w.zone].some(s => (s || '').toLowerCase().includes(wq))) : workers;
  const tq = tSearch.trim().toLowerCase();
  const filteredTasks = tq ? tasks.filter(t => [t.title, t.area, t.priority].some(s => (s || '').toLowerCase().includes(tq))) : tasks;

  const exportHoursCSV = () => {
    const rows = [['Worker', 'Date', 'Hours']];
    hoursLog.forEach(h => rows.push([workerName(h.workerId), h.date, h.hours]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mediflow-hours.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'workers', label: `Workers (${workers.length})` },
    { key: 'tasks', label: `Tasks (${tasks.length})` },
    ...(deptConfig.hasBins ? [{ key: 'bins', label: `Bins (${bins.filter(b => b.status !== 'empty').length})` }] : []),
    { key: 'requests', label: `Requests (${pendingLeave + availability.length})` },
    { key: 'hours', label: 'Hours' },
    { key: 'team', label: deptConfig.managerTitle },
    { key: 'closures', label: `Wayfinding Alerts${closures.filter(c => c.active).length ? ` (${closures.filter(c => c.active).length})` : ''}` },
  ];

  return (
    <section className="admin-console">
      <div className="adm-dept-banner" style={{ '--dept-accent': deptConfig.accent }}>
        <span className="adm-dept-dot" />
        <div>
          <div className="adm-dept-name">{deptConfig.name}</div>
          <div className="adm-dept-summary">{deptConfig.summary}</div>
        </div>
      </div>
      <div className="adm-stats">
        <div className="adm-stat"><span className="adm-stat-n">{workers.length}</span><span className="adm-stat-l">Workers</span></div>
        <div className="adm-stat"><span className="adm-stat-n">{doneCount}/{tasks.length}</span><span className="adm-stat-l">Tasks done</span></div>
        <div className="adm-stat"><span className="adm-stat-n">{pendingLeave}</span><span className="adm-stat-l">Pending leave</span></div>
        <div className="adm-stat"><span className="adm-stat-n" style={{ color: activeAlerts.length ? 'var(--color-error-ink)' : undefined }}>{activeAlerts.length}</span><span className="adm-stat-l">Active alerts</span></div>
      </div>

      <div className="adm-tabs">
        {TABS.map(t => <button key={t.key} className={`adm-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'overview' && (
        <div className="adm-grid">
          <div className="adm-panel glass-panel">
            <div className="adm-panel-head">
              <span className="adm-panel-ic"><AdmIcon name="overview" /></span>
              <div className="adm-panel-hgroup">
                <span className="adm-panel-title">Tonight at a Glance</span>
                <span className="adm-panel-purpose">Live status pulled straight from the shift — no refresh needed.</span>
              </div>
            </div>
            <div className="adm-overview-grid">
              <OverviewTile label="On shift now" n={onShiftCount} of={workers.length} tone="accent" />
              <OverviewTile label="Tasks done" n={doneCount} of={tasks.length} tone="success" />
              <OverviewTile label="Bins full" n={binsFull} tone={binsFull ? 'danger' : 'success'} />
              <OverviewTile label="Bins high" n={binsMedium} tone={binsMedium ? 'warn' : 'success'} />
              <OverviewTile label="Pending leave" n={pendingLeave} tone={pendingLeave ? 'warn' : 'success'} />
              <OverviewTile label="Extra availability" n={availability.length} tone="accent" />
            </div>
          </div>

          <div className="adm-panel glass-panel">
            <div className="adm-panel-head">
              <span className="adm-panel-ic"><AdmIcon name="alert" /></span>
              <div className="adm-panel-hgroup">
                <span className="adm-panel-title">Active Alerts</span>
                <span className="adm-panel-purpose">Bin-full and break notifications waiting on a response.</span>
              </div>
              <span className="adm-panel-count">{activeAlerts.length}</span>
            </div>
            <div className="adm-list">
              {activeAlerts.length === 0 && <div className="adm-empty">All clear — nothing needs attention right now.</div>}
              {activeAlerts.map(n => (
                <div key={n.id} className="adm-row adm-req">
                  <span className="adm-alert-icon">{n.kind === 'break' ? '☕' : '🗑️'}</span>
                  <div className="adm-task-main">
                    <div className="adm-task-title">{n.message}</div>
                    <div className="adm-task-sub">
                      {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {n.workerId ? ` · ${workerName(n.workerId)}` : ''}
                    </div>
                  </div>
                  <span className={`req-status ${n.status === 'sent' ? 'pending' : 'approved'}`}>{n.status}</span>
                  <div className="adm-row-actions">
                    {n.status === 'sent' && <button className="adm-btn ghost" onClick={() => api.acknowledgeNotif(n.id)}>Acknowledge</button>}
                    <button className="adm-btn save" onClick={() => api.resolveNotif(n.id)}>Resolve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'workers' && (
        <div className="adm-panel glass-panel">
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="workers" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">{deptConfig.workerTitle} Profiles</span>
              <span className="adm-panel-purpose">Add the people working this shift and keep their details current.</span>
            </div>
            <span className="adm-panel-count">{workers.length}</span>
          </div>
          <form className="adm-form" onSubmit={submitWorker}>
            <div className="adm-form-grid">
              <input value={wForm.name} onChange={e => setWForm({ ...wForm, name: e.target.value })} placeholder="Full name *" />
              <input value={wForm.role} onChange={e => setWForm({ ...wForm, role: e.target.value })} placeholder={`Role (e.g. ${deptConfig.workerTitle})`} />
              <input value={wForm.zone} onChange={e => setWForm({ ...wForm, zone: e.target.value })} placeholder="Zone / floor" />
              <input value={wForm.phone} onChange={e => setWForm({ ...wForm, phone: e.target.value })} placeholder="Phone (optional)" />
              <PasswordInput value={wForm.password} onChange={e => setWForm({ ...wForm, password: e.target.value })} placeholder="Login password (optional — auto-generated if blank)" />
              <label className="adm-shift-field">
                <span className="adm-shift-label">Shift start</span>
                <input type="time" value={wForm.shiftStart || ''} onChange={e => setWForm({ ...wForm, shiftStart: e.target.value })} />
              </label>
              <label className="adm-shift-field">
                <span className="adm-shift-label">Shift end</span>
                <input type="time" value={wForm.shiftEnd || ''} onChange={e => setWForm({ ...wForm, shiftEnd: e.target.value })} />
              </label>
            </div>
            <button className="adm-btn primary" type="submit">+ Add worker</button>
          </form>
          {newCredentials && (
            <div className="adm-credentials-banner">
              <div>
                <b>{newCredentials.username}</b> can now sign in with password <b>{newCredentials.password}</b>.
                Share this with them now — it won't be shown again.
              </div>
              <button className="adm-btn ghost" onClick={() => setNewCredentials(null)}>Dismiss</button>
            </div>
          )}
          {workers.length > 4 && (
            <input className="ui-input" placeholder="Search workers by name, role or zone…" value={wSearch} onChange={e => setWSearch(e.target.value)} />
          )}
          <div className="adm-list">
            {workers.length === 0 && <div className="adm-empty">No workers yet — add one above.</div>}
            {workers.length > 0 && filteredWorkers.length === 0 && <div className="adm-empty">No workers match “{wSearch}”.</div>}
            {filteredWorkers.map(w => (
              <WorkerRow key={w.id} worker={w} taskCount={tasks.filter(t => t.assignedTo === w.id).length}
                onSave={api.updateWorker} onDelete={api.deleteWorker} onBreak={api.sendBreak} onResetPassword={resetWorkerPassword} />
            ))}
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="adm-panel glass-panel">
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="tasks" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Tasks &amp; Assignments</span>
              <span className="adm-panel-purpose">Create jobs, set priority, assign them to a worker, and optionally pin a location — pinned tasks show as a marker on the Floor Map that the worker can check off there too.</span>
            </div>
            <span className="adm-panel-count">{tasks.length}</span>
          </div>
          <form className="adm-form" onSubmit={submitTask}>
            <div className="adm-form-grid">
              <input value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} placeholder="Task title *" />
              <Dropdown block value={tForm.area} onChange={v => setTForm({ ...tForm, area: v })} options={areas} placeholder="Hospital area…" />
              <Dropdown block value={tForm.priority} onChange={v => setTForm({ ...tForm, priority: v })} options={PRIORITY_OPTS} />
              <Dropdown block value={tForm.assignedTo} onChange={v => setTForm({ ...tForm, assignedTo: v })}
                options={[{ value: '', label: 'Assign to… (optional)' }, ...workers.map(w => ({ value: w.id, label: w.name }))]} placeholder="Assign to… (optional)" />
              <Dropdown block value={tForm.pinId} onChange={v => setTForm({ ...tForm, pinId: v })} options={PIN_OPTIONS} placeholder="Pin on map (optional)…" />
            </div>
            <textarea className="adm-textarea" value={tForm.easyWay} onChange={e => setTForm({ ...tForm, easyWay: e.target.value })} placeholder="💡 Easy way to complete this task — pathway, which lift, order of areas, tips…" rows={2} />
            <button className="adm-btn primary" type="submit">+ Create task</button>
          </form>
          {tasks.length > 4 && (
            <input className="ui-input" placeholder="Search tasks by title, area or priority…" value={tSearch} onChange={e => setTSearch(e.target.value)} />
          )}
          <div className="adm-list">
            {tasks.length === 0 && <div className="adm-empty">No tasks yet — create one above.</div>}
            {tasks.length > 0 && filteredTasks.length === 0 && <div className="adm-empty">No tasks match “{tSearch}”.</div>}
            {filteredTasks.map(t => (
              <TaskRow key={t.id} task={t} workers={workers} areas={areas}
                onSave={api.updateTask} onDelete={api.deleteTask} onDuplicate={duplicateTask}
                onToggle={(task) => api.updateTask(task.id, { done: !task.done })} />
            ))}
          </div>
        </div>
      )}

      {tab === 'bins' && deptConfig.hasBins && (
        <div className="adm-panel glass-panel">
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="bins" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Waste Bin Sensors</span>
              <span className="adm-panel-purpose">Live fill levels across every floor — mark a bin emptied once it's collected.</span>
            </div>
            <span className="adm-panel-count">{bins.filter(b => b.status !== 'empty').length} need attention</span>
          </div>
          <div className="adm-bins-grid">
            {bins.length === 0 && <div className="adm-empty">No bins registered.</div>}
            {bins.map(b => (
              <div key={b.id} className={`bin-item-card ${b.status === 'full' ? 'is-full' : ''}`}>
                <div className="bin-meta-row">
                  <div className="bin-name-group"><span className="bin-name">{b.name}</span><span className="bin-area">{b.area} · {b.floor}</span></div>
                  <span className={`bin-badge ${b.status}`}>{b.status === 'full' ? 'FULL' : b.status === 'medium' ? 'HIGH' : 'OK'}</span>
                </div>
                <div className="fill-level-container">
                  <div className="fill-level-info"><span>Fill level</span><span>{b.fillLevel}%</span></div>
                  <div className="fill-level-track"><div className={`fill-level-bar ${b.status}`} style={{ width: `${b.fillLevel}%` }} /></div>
                </div>
                <div className="adm-bin-actions">
                  <button className="adm-btn save" disabled={b.fillLevel === 0} onClick={() => api.fillBin(b.id, 0)}>Mark emptied</button>
                  <button className="sim-btn" onClick={() => api.fillBin(b.id, 100)}>Simulate full</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="adm-grid">
          <div className="adm-panel glass-panel">
            <div className="adm-panel-head">
              <span className="adm-panel-ic"><AdmIcon name="leave" /></span>
              <div className="adm-panel-hgroup">
                <span className="adm-panel-title">Leave Requests</span>
                <span className="adm-panel-purpose">Approve or decline time off your team has asked for.</span>
              </div>
              <span className="adm-panel-count">{leaves.length}</span>
            </div>
            <div className="adm-list">
              {leaves.length === 0 && <div className="adm-empty">No leave requests.</div>}
              {leaves.map(l => (
                <div key={l.id} className="adm-row adm-req">
                  <span className={`req-status ${l.status}`}>{l.status}</span>
                  <div className="adm-task-main">
                    <div className="adm-task-title">{workerName(l.workerId)} · {l.type} leave</div>
                    <div className="adm-task-sub">{l.startDate} → {l.endDate}{l.reason ? ` · ${l.reason}` : ''}</div>
                  </div>
                  <div className="adm-row-actions">
                    {l.status !== 'approved' && <button className="adm-btn save" onClick={() => api.updateLeave(l.id, { status: 'approved' })}>Approve</button>}
                    {l.status !== 'declined' && <button className="adm-btn danger" onClick={() => api.updateLeave(l.id, { status: 'declined' })}>Decline</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-panel glass-panel">
            <div className="adm-panel-head">
              <span className="adm-panel-ic"><AdmIcon name="avail" /></span>
              <div className="adm-panel-hgroup">
                <span className="adm-panel-title">Extra Shift Availability</span>
                <span className="adm-panel-purpose">See who’s free to pick up extra shifts.</span>
              </div>
              <span className="adm-panel-count">{availability.length}</span>
            </div>
            <div className="adm-list">
              {availability.length === 0 && <div className="adm-empty">No availability submitted.</div>}
              {availability.map(a => (
                <div key={a.id} className="adm-row adm-req">
                  <span className="req-status available">free</span>
                  <div className="adm-task-main">
                    <div className="adm-task-title">{workerName(a.workerId)} · {a.date}</div>
                    <div className="adm-task-sub">{a.from || '—'}{a.to ? ` – ${a.to}` : ''}{a.note ? ` · ${a.note}` : ''}</div>
                  </div>
                  <div className="adm-row-actions">
                    <button className="adm-btn ghost" onClick={() => api.deleteAvailability(a.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'hours' && (
        <div className="adm-panel glass-panel">
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="hours" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Hours &amp; Payroll</span>
              <span className="adm-panel-purpose">Worked hours logged from clock-in / clock-out, ready to export.</span>
            </div>
            <button className="adm-btn ghost" onClick={exportHoursCSV}>⬇ Export CSV</button>
          </div>
          <div className="adm-list">
            {workers.length === 0 && <div className="adm-empty">No workers yet.</div>}
            {workers.map(w => {
              const entries = hoursLog.filter(h => h.workerId === w.id);
              const total = entries.reduce((s, e) => s + e.hours, 0);
              const shifts = entries.length;
              const avg = shifts ? total / shifts : 0;
              return (
                <div key={w.id} className="adm-row">
                  <div className="adm-avatar">{initialsOf(w.name)}</div>
                  <div className="adm-worker-main">
                    <div className="adm-worker-name">{w.name}</div>
                    <div className="adm-worker-sub">{fmtH(total)}h total · {shifts} shift{shifts !== 1 ? 's' : ''} logged · {fmtH(avg)}h avg</div>
                  </div>
                  <span className={`req-status ${w.clockedInAt ? 'approved' : 'declined'}`}>{w.clockedInAt ? 'on shift' : 'off shift'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="adm-panel glass-panel" style={{ maxWidth: 520 }}>
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="team" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Current {deptConfig.managerTitle}</span>
              <span className="adm-panel-purpose">Set this shift’s point of contact — workers see this on their Shift page.</span>
            </div>
          </div>
          <div className="adm-form">
            <div className="adm-form-grid">
              <input value={nm.name} onChange={e => setNm({ ...nm, name: e.target.value })} placeholder="Manager name" />
              <input value={nm.role} onChange={e => setNm({ ...nm, role: e.target.value })} placeholder="Role / title" />
              <input value={nm.phone} onChange={e => setNm({ ...nm, phone: e.target.value })} placeholder="Contact phone" />
              <input value={nm.location} onChange={e => setNm({ ...nm, location: e.target.value })} placeholder="Location / desk" />
            </div>
            <button className={`adm-btn ${nmSaved ? 'saved-ok' : 'primary'}`} onClick={saveNightManager}>
              {nmSaved ? '✓ Saved — workers updated' : 'Save point of contact'}
            </button>
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="adm-panel glass-panel" style={{ maxWidth: 520 }}>
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="overview" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Floor Map — Ward Rounds Checklist</span>
              <span className="adm-panel-purpose">A walk-every-ward checklist, grouped by lift zone, shown on the Floor Map. Off by default for every team except Linen — turn it on if a ward-by-ward round is useful for {deptConfig.workerTitle.toLowerCase()}s too.</span>
            </div>
          </div>
          <div className="adm-toggle-row">
            <div className="adm-toggle-text">
              <div className="adm-toggle-title">{showWardRounds ? 'Visible to your workers' : 'Hidden from your workers'}</div>
              <div className="adm-toggle-sub">Controls the ward checklist &amp; pins on the Floor Map — the map itself always stays available to everyone.</div>
            </div>
            <button className={`adm-switch ${showWardRounds ? 'on' : ''}`} role="switch" aria-checked={showWardRounds}
              onClick={() => api.updateDeptSettings({ showWardRounds: !showWardRounds })}>
              <span className="adm-switch-knob" />
            </button>
          </div>
        </div>
      )}

      {tab === 'closures' && (
        <div className="adm-panel glass-panel">
          <div className="adm-panel-head">
            <span className="adm-panel-ic"><AdmIcon name="closure" /></span>
            <div className="adm-panel-hgroup">
              <span className="adm-panel-title">Wayfinding Alerts &amp; Closures</span>
              <span className="adm-panel-purpose">Post a temporary reroute notice (e.g. concourse works) — it shows as a banner to affected workers.</span>
            </div>
            <span className="adm-panel-count">{closures.filter(c => c.active).length} active</span>
          </div>
          <form className="adm-form" onSubmit={submitClosure}>
            <input value={clForm.title} onChange={e => setClForm({ ...clForm, title: e.target.value })} placeholder="Closure title *  (e.g. Main Concourse Improvement Works)" />
            <textarea className="adm-textarea" value={clForm.message} onChange={e => setClForm({ ...clForm, message: e.target.value })} placeholder="Message workers will see — what's closed, what to do instead…" rows={2} />
            <button className="adm-btn primary" type="submit">+ Post alert for {deptConfig.name}</button>
          </form>
          <div className="adm-list">
            {closures.length === 0 && <div className="adm-empty">No wayfinding alerts posted.</div>}
            {closures.map(c => (
              <div key={c.id} className="adm-row adm-req">
                <span className={`req-status ${c.active ? 'pending' : 'declined'}`}>{c.active ? 'active' : 'resolved'}</span>
                <div className="adm-task-main">
                  <div className="adm-task-title">{c.title}</div>
                  <div className="adm-task-sub">{c.message}</div>
                </div>
                <div className="adm-row-actions">
                  {c.active
                    ? <button className="adm-btn save" onClick={() => api.updateClosure(c.id, { active: false })}>Mark resolved</button>
                    : <button className="adm-btn ghost" onClick={() => api.updateClosure(c.id, { active: true })}>Reactivate</button>}
                  <button className="adm-btn danger" onClick={() => api.deleteClosure(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
