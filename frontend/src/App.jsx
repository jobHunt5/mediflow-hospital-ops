import React, { useState, useEffect } from 'react';
import FloorMap from './FloorMap.jsx';
import AdminConsole from './AdminConsole.jsx';
import HoursChart from './HoursChart.jsx';
import Dropdown from './Dropdown.jsx';
import { MonashMark } from './MonashLogo.jsx';
import Login from './Login.jsx';
import { useTheme } from './useTheme.js';
import { ASSISTANT, ROUND_GROUPS, LIFT_BADGE, floorLabel, useRounds } from './rounds.js';
import { PRIORITY_COLOR } from './theme.js';
import { DEPT, DEPT_GUIDES } from './departments.js';

const SESSION_STORAGE_KEY = 'mediflow-session';

const SUB_TABS = [
  { key: 'shift', label: 'Shift' },
  { key: 'hours', label: 'Hours' },
  { key: 'leave', label: 'Leave' },
  { key: 'availability', label: 'Availability' },
  { key: 'openshifts', label: 'Open Shifts' },
];
const SECTION_PURPOSE = {
  shift: 'Your shift at a glance — assigned tasks, wayfinding and live alerts.',
  hours: 'Track the hours you work. Clock in when you arrive, clock out when you leave.',
  leave: 'Request time off. Your manager sees it straight away.',
  availability: 'Tell us the shifts you’re free to pick up extra work.',
  openshifts: 'Can’t make a shift? Post it here. Free that night? Pick one up.',
};
const LEAVE_TYPES = [
  { value: 'Annual', label: 'Annual leave' },
  { value: 'Sick', label: 'Sick leave' },
  { value: 'Personal', label: 'Personal leave' },
  { value: 'Carer', label: 'Carer leave' },
  { value: 'Unpaid', label: 'Unpaid leave' },
];
const SubTabIcon = ({ name }) => {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'shift': return (<svg {...p}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 13l2 2 4-4" /></svg>);
    case 'hours': return (<svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>);
    case 'leave': return (<svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
    case 'availability': return (<svg {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>);
    case 'openshifts': return (<svg {...p}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>);
    default: return null;
  }
};

const playCheckSound = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = new AC();
    const tone = (f, t, d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d); };
    const n = ctx.currentTime; tone(659.25, n, 0.12); tone(880, n + 0.06, 0.18);
  } catch {}
};
const playAlertSound = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = new AC();
    const beep = (f, t, d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d); };
    const n = ctx.currentTime; beep(880, n, 0.14); beep(660, n + 0.16, 0.2);
  } catch {}
};

export default function App() {
  const [session, setSession] = useState(() => {
    try { const raw = localStorage.getItem(SESSION_STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [activeTab, setActiveTab] = useState(session?.role === 'admin' ? 'admin' : 'worker'); // worker | admin | map
  const [workerSection, setWorkerSection] = useState('shift'); // shift | hours | leave | availability
  const [selectedDept, setSelectedDept] = useState(session?.department || 'linen');
  const [bins, setBins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [hoursLog, setHoursLog] = useState([]);
  const [nightManagers, setNightManagers] = useState({});
  const [closures, setClosures] = useState([]);
  const [deptSettings, setDeptSettings] = useState({});
  const [openShifts, setOpenShifts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(session?.workerId || null);
  const [leaveForm, setLeaveForm] = useState({ type: 'Annual', startDate: '', endDate: '', reason: '' });
  const [availForm, setAvailForm] = useState({ date: '', from: '', to: '', note: '' });
  const [openShiftForm, setOpenShiftForm] = useState({ date: '', from: '', to: '', note: '' });
  const [openEasyWay, setOpenEasyWay] = useState(null);
  const [flaggingTaskId, setFlaggingTaskId] = useState(null);
  const [flagNoteDraft, setFlagNoteDraft] = useState('');
  // Ward-round groups are collapsed by default (undefined => collapsed) — the
  // shift card above already shows each group's progress at a glance, so the
  // full ward-by-ward checklist is progressive disclosure, not the default view.
  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const { done, toggle, reset, doneCount, pct, total } = useRounds();
  const { toggle: toggleTheme, isDark } = useTheme();

  const deptConfig = DEPT[selectedDept] || DEPT.linen;

  const login = (payload) => {
    setSession(payload);
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload)); } catch {}
    setSelectedDept(payload.department);
    setActiveTab(payload.role === 'admin' ? 'admin' : 'worker');
    setWorkerSection('shift');
    if (payload.role === 'worker') setSelectedWorkerId(payload.workerId);
  };
  const logout = () => {
    setSession(null);
    setSelectedWorkerId(null);
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    setBins([]); setNotifications([]); setWorkers([]); setTasks([]); setLeaves([]);
    setAvailability([]); setHoursLog([]); setNightManagers({}); setClosures([]); setDeptSettings({});
    setOpenShifts([]);
    setDataLoaded(false);
  };

  // Authenticated fetch helper — attaches the session's bearer token and
  // logs the user out if the server says that token is no longer valid.
  const jsonReq = (url, method, body) => fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(res => { if (res.status === 401) logout(); return res; }).catch(() => {});

  // Clock
  useEffect(() => {
    const upd = () => { const d = new Date(); let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; setCurrentTimeStr(`${h}:${m} ${ap}`); };
    upd(); const id = setInterval(upd, 1000); return () => clearInterval(id);
  }, []);

  // Initial state — only once we have a session token to authenticate with
  useEffect(() => {
    if (!session?.token) return;
    fetch('/api/state', { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => { if (r.status === 401) { logout(); return null; } return r.json(); })
      .then(d => {
        if (!d) return;
        setBins(d.bins || []); setNotifications(d.notifications || []);
        setWorkers(d.workers || []); setTasks(d.tasks || []);
        setAreas(d.areas || []); setLeaves(d.leaves || []);
        setAvailability(d.availability || []); setHoursLog(d.hoursLog || []);
        setNightManagers(d.nightManagers || {}); setClosures(d.closures || []);
        setDeptSettings(d.deptSettings || {}); setOpenShifts(d.openShifts || []);
      }).catch(() => {}).finally(() => setDataLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  // Department-scoped views
  const deptWorkers = workers.filter(w => (w.department || 'linen') === selectedDept);
  const deptWorkerIds = new Set(deptWorkers.map(w => w.id));
  const deptTasks = tasks.filter(t => (t.department || 'linen') === selectedDept);
  const deptOpenShifts = openShifts.filter(o => o.department === selectedDept);
  const workerNameById = (id) => (id ? (workers.find(w => w.id === id)?.name || 'Unknown') : null);

  // Keep a valid selected worker for the current department
  useEffect(() => {
    if (deptWorkers.length && !deptWorkers.find(w => w.id === selectedWorkerId)) setSelectedWorkerId(deptWorkers[0].id);
    if (!deptWorkers.length) setSelectedWorkerId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, workers]);

  // SSE — EventSource can't set an Authorization header, so the token rides in the query string.
  useEffect(() => {
    if (!session?.token) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(session.token)}`);
    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);
    es.onmessage = (e) => {
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      switch (msg.type) {
        case 'CONNECTED': setIsConnected(true); break;
        case 'BIN_UPDATE': setBins(p => p.map(b => (b.id === msg.data.id ? msg.data : b))); break;
        case 'NEW_NOTIFICATION': playAlertSound(); setNotifications(p => [...p, msg.data]); break;
        case 'NOTIFICATION_UPDATE': setNotifications(p => p.map(n => (n.id === msg.data.id ? msg.data : n))); break;
        case 'WORKERS_SET': setWorkers(msg.data || []); break;
        case 'TASKS_SET': setTasks(msg.data || []); break;
        case 'LEAVES_SET': setLeaves(msg.data || []); break;
        case 'AVAIL_SET': setAvailability(msg.data || []); break;
        case 'HOURS_SET': setHoursLog(msg.data || []); break;
        case 'NIGHT_MANAGERS_SET': setNightManagers(msg.data || {}); break;
        case 'CLOSURES_SET': setClosures(msg.data || []); break;
        case 'DEPT_SETTINGS_SET': setDeptSettings(msg.data || {}); break;
        case 'OPEN_SHIFTS_SET': setOpenShifts(msg.data || []); break;
        case 'RESET_STATE':
          setBins(msg.data.bins || []); setNotifications(msg.data.notifications || []);
          setWorkers(msg.data.workers || []); setTasks(msg.data.tasks || []);
          setAreas(msg.data.areas || []); setLeaves(msg.data.leaves || []);
          setAvailability(msg.data.availability || []); setHoursLog(msg.data.hoursLog || []);
          setNightManagers(msg.data.nightManagers || {}); setClosures(msg.data.closures || []);
          setDeptSettings(msg.data.deptSettings || {}); setOpenShifts(msg.data.openShifts || []);
          break;
        default: break;
      }
    };
    return () => es.close();
  }, [session?.token]);

  const api = {
    createWorker: (b) => jsonReq('/api/workers', 'POST', b),
    updateWorker: (id, b) => jsonReq(`/api/workers/${id}`, 'PATCH', b),
    deleteWorker: (id) => jsonReq(`/api/workers/${id}`, 'DELETE'),
    resetWorkerPassword: (id, password) => jsonReq(`/api/workers/${id}/reset-password`, 'POST', password ? { password } : {}),
    createTask: (b) => jsonReq('/api/tasks', 'POST', b),
    updateTask: (id, b) => jsonReq(`/api/tasks/${id}`, 'PATCH', b),
    deleteTask: (id) => jsonReq(`/api/tasks/${id}`, 'DELETE'),
    createLeave: (b) => jsonReq('/api/leave', 'POST', b),
    updateLeave: (id, b) => jsonReq(`/api/leave/${id}`, 'PATCH', b),
    deleteLeave: (id) => jsonReq(`/api/leave/${id}`, 'DELETE'),
    createAvailability: (b) => jsonReq('/api/availability', 'POST', b),
    deleteAvailability: (id) => jsonReq(`/api/availability/${id}`, 'DELETE'),
    updateNightManager: (b) => jsonReq(`/api/night-manager/${selectedDept}`, 'PATCH', b),
    sendBreak: (workerId) => jsonReq('/api/notifications/break', 'POST', { workerId }),
    clockWorker: (id, action) => jsonReq(`/api/workers/${id}/clock`, 'POST', { action }),
    forceClockOut: (id) => jsonReq(`/api/workers/${id}/force-clock-out`, 'POST'),
    fillBin: (id, fillLevel) => jsonReq(`/api/bins/${id}/fill`, 'POST', { fillLevel }),
    acknowledgeNotif: (id) => jsonReq(`/api/notifications/${id}/acknowledge`, 'POST'),
    resolveNotif: (id) => jsonReq(`/api/notifications/${id}/resolve`, 'POST'),
    createClosure: (b) => jsonReq('/api/closures', 'POST', b),
    updateClosure: (id, b) => jsonReq(`/api/closures/${id}`, 'PATCH', b),
    deleteClosure: (id) => jsonReq(`/api/closures/${id}`, 'DELETE'),
    updateDeptSettings: (b) => jsonReq(`/api/dept-settings/${selectedDept}`, 'PATCH', b),
    postOpenShift: (b) => jsonReq('/api/open-shifts', 'POST', b),
    claimOpenShift: (id) => jsonReq(`/api/open-shifts/${id}/claim`, 'POST'),
    deleteOpenShift: (id) => jsonReq(`/api/open-shifts/${id}`, 'DELETE'),
  };

  const simulateFullBin = () => {
    const c = bins.filter(b => b.status !== 'full'); if (!c.length) return;
    const b = c[Math.floor(Math.random() * c.length)];
    api.fillBin(b.id, 100);
  };
  const acknowledgeNotif = api.acknowledgeNotif;
  const resolveNotif = api.resolveNotif;

  const handleRound = (id) => { if (!done.has(id)) playCheckSound(); toggle(id); };
  const handleTaskToggle = (t) => { if (!t.done) playCheckSound(); api.updateTask(t.id, { done: !t.done }); };
  const submitFlag = (taskId) => {
    api.updateTask(taskId, { blocked: true, blockedNote: flagNoteDraft.trim() });
    setFlaggingTaskId(null); setFlagNoteDraft('');
  };
  const clearFlag = (taskId) => api.updateTask(taskId, { blocked: false, blockedNote: '' });
  const submitLeave = (e) => {
    e.preventDefault();
    if (!selectedWorkerId || !leaveForm.startDate || !leaveForm.endDate) return;
    api.createLeave({ workerId: selectedWorkerId, ...leaveForm });
    setLeaveForm({ type: 'Annual', startDate: '', endDate: '', reason: '' });
  };
  const submitAvail = (e) => {
    e.preventDefault();
    if (!selectedWorkerId || !availForm.date) return;
    api.createAvailability({ workerId: selectedWorkerId, ...availForm });
    setAvailForm({ date: '', from: '', to: '', note: '' });
  };
  const submitOpenShift = (e) => {
    e.preventDefault();
    if (!openShiftForm.date) return;
    api.postOpenShift(openShiftForm);
    setOpenShiftForm({ date: '', from: '', to: '', note: '' });
  };

  const groups = ROUND_GROUPS.map(g => ({ ...g, done: g.tasks.filter(t => done.has(t.id)).length }));
  const remaining = total - doneCount;
  const activeAlerts = notifications.filter(n => {
    if (n.status !== 'sent' && n.status !== 'acknowledged') return false;
    if (n.kind === 'bin') return deptConfig.hasBins;
    if (n.kind === 'break') return !n.workerId || deptWorkerIds.has(n.workerId) || n.workerId === selectedWorkerId;
    return true;
  });
  const fullBins = bins.filter(b => b.status === 'full');
  const topAlert = activeAlerts[activeAlerts.length - 1];
  const activeClosures = closures.filter(c => c.active && (c.department === selectedDept || c.department === 'all'));
  const deptGuides = DEPT_GUIDES[selectedDept];
  const scheduleWindow = deptSettings[selectedDept];
  const hasScheduleWindow = !!scheduleWindow?.scheduleWindowMessage;
  // Admin-controlled: whether this department's workers see the ward-round
  // checklist (both here and inside the Floor Map). Falls back to the
  // department's default (only Linen) until an admin has set it explicitly.
  const showWardRounds = deptSettings[selectedDept]?.showWardRounds ?? deptConfig.hasRounds;

  // Admin sees every pinned task in the department (to keep an eye on the whole
  // floor); a worker only sees the locations pinned for them specifically.
  const pinnedTasksForMap = deptTasks.filter(t => t.pinId && (session?.role === 'admin' || t.assignedTo === selectedWorkerId));
  const togglePin = (t) => api.updateTask(t.id, { done: !t.done });

  const worker = deptWorkers.find(w => w.id === selectedWorkerId) || null;
  const workerName = worker?.name || deptConfig.workerTitle;
  const workerRole = worker?.role || deptConfig.name;
  const workerShift = worker?.shift || deptConfig.shiftDefault;
  const myTasks = deptTasks.filter(t => t.assignedTo === selectedWorkerId);
  const myTasksDone = myTasks.filter(t => t.done).length;
  const myLeaves = leaves.filter(l => l.workerId === selectedWorkerId);
  const myAvailability = availability.filter(a => a.workerId === selectedWorkerId);
  const myHours = hoursLog.filter(h => h.workerId === selectedWorkerId);

  // "For You Today" — a short, prioritized digest built from data already
  // loaded, same idea as SuccessFactors' "For You Today" action feed.
  const digestItems = [];
  const myPendingLeaveCount = myLeaves.filter(l => l.status === 'pending').length;
  if (myPendingLeaveCount > 0) digestItems.push({ icon: '📋', text: `${myPendingLeaveCount} leave request${myPendingLeaveCount > 1 ? 's' : ''} awaiting a decision` });
  const openShiftsAvailable = deptOpenShifts.filter(o => o.status === 'open' && o.owner !== selectedWorkerId).length;
  if (openShiftsAvailable > 0) digestItems.push({ icon: '🔄', text: `${openShiftsAvailable} open shift${openShiftsAvailable > 1 ? 's' : ''} available to pick up` });
  if (worker && worker.annualLeaveBalance > 0 && worker.annualLeaveBalance < 8) digestItems.push({ icon: '⚠️', text: `Annual leave balance is low — ${worker.annualLeaveBalance.toFixed(1)}h left` });
  const myBlockedTaskCount = myTasks.filter(t => t.blocked).length;
  if (myBlockedTaskCount > 0) digestItems.push({ icon: '🚩', text: `${myBlockedTaskCount} of your tasks flagged as blocked — your supervisor can see it` });
  const nightManager = nightManagers[selectedDept] || null;

  // Shift-time ring
  const computeShift = () => {
    const [sh, sm] = (() => {
      const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(deptConfig.shiftDefault);
      if (!m) return [22, 30];
      let h = parseInt(m[1], 10); const min = parseInt(m[2], 10); const ap = m[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
      return [h, min];
    })();
    const d = new Date(); const nowMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const startMin = sh * 60 + sm, totalMin = 480, endMinRaw = startMin + totalMin;
    let elapsed;
    if (endMinRaw <= 1440) {
      // same-day shift (e.g. 7:00 AM – 3:00 PM)
      elapsed = (nowMin >= startMin && nowMin <= endMinRaw) ? nowMin - startMin : null;
    } else {
      // overnight shift (e.g. 10:30 PM – 7:00 AM)
      if (nowMin >= startMin) elapsed = nowMin - startMin;
      else if (nowMin <= endMinRaw - 1440) elapsed = (1440 - startMin) + nowMin;
      else elapsed = null;
    }
    if (elapsed == null) return { pct: 0, color: 'var(--text-muted)', centerLabel: '8h', centerSub: 'total', label: `Starts ${deptConfig.shiftDefault.split(' - ')[0]}` };
    elapsed = Math.max(0, Math.min(totalMin, elapsed));
    const rem = totalMin - elapsed, rh = Math.floor(rem / 60), rm = Math.round(rem % 60), pctTime = Math.round((elapsed / totalMin) * 100), fin = rem <= 0;
    return { pct: pctTime, color: fin ? 'var(--color-success)' : 'var(--accent-dark)', centerLabel: fin ? 'Done' : `${rh}h ${rm}m`, centerSub: fin ? 'shift' : 'left', label: fin ? 'Shift complete' : `${pctTime}% elapsed` };
  };
  const shift = computeShift();
  const initials = workerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!session) {
    return <Login onLogin={login} />;
  }

  if (!dataLoaded) {
    return (
      <div className="app-loading">
        <span className="app-loading-mark"><MonashMark size={40} /></span>
        <div className="app-loading-spinner" aria-hidden="true" />
        <span className="app-loading-text">Loading MediFlow…</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title-group">
          <h1>
            <MonashMark size={26} />
            Monash Health Operations
          </h1>
          <p className="app-subtitle">{deptConfig.name} · {ASSISTANT.site}</p>
        </div>

        <div className="app-header-right">
        <div className="app-nav-tabs">
          {session.role === 'worker' && (
            <button className={`app-nav-tab ${activeTab === 'worker' ? 'active' : ''}`} onClick={() => setActiveTab('worker')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>
              My Shift
            </button>
          )}
          {session.role === 'admin' && (
            <button className={`app-nav-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
              Admin
            </button>
          )}
          <button className={`app-nav-tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Floor Map
          </button>
        </div>

        <div className="app-header-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <span className="session-chip" style={{ '--dept-accent': deptConfig.accent }}>
            <span className="session-chip-dot" />
            {session.role === 'admin' ? deptConfig.managerTitle : workerName} · {deptConfig.short}
          </span>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
        </div>
      </header>

      {activeClosures.length > 0 && activeTab !== 'map' && (
        <div className="closure-banner">
          <span className="closure-banner-icon">🚧</span>
          <div className="closure-banner-text">
            {activeClosures.map(c => (
              <div key={c.id}><b>{c.title}:</b> {c.message}</div>
            ))}
          </div>
        </div>
      )}

      <main className="main-grid">
        {activeTab === 'map' && (
          <section className="map-full-section">
            <FloorMap department={selectedDept} showRounds={showWardRounds}
              pinnedTasks={pinnedTasksForMap} workers={deptWorkers} onTogglePin={togglePin} />
          </section>
        )}

        {activeTab === 'admin' && (
          <section className="admin-full-section">
            <AdminConsole workers={deptWorkers} tasks={deptTasks} areas={areas} leaves={leaves.filter(l => deptWorkerIds.has(l.workerId))}
              availability={availability.filter(a => deptWorkerIds.has(a.workerId))} nightManager={nightManager} api={api}
              bins={bins} notifications={notifications} hoursLog={hoursLog.filter(h => deptWorkerIds.has(h.workerId))}
              department={selectedDept} deptConfig={deptConfig} closures={closures} showWardRounds={showWardRounds}
              openShifts={deptOpenShifts} scheduleWindow={scheduleWindow} />
          </section>
        )}

        {activeTab === 'worker' && (
          <>
            <section className="supervisor-pane">
              {/* Shift overview */}
              <div className="shift-card glass-panel">
                <div className="shift-top">
                  <div className="shift-id">
                    <div className="shift-avatar" style={{ background: `linear-gradient(135deg, ${deptConfig.accent}, var(--accent-dark))` }}>{initials}</div>
                    <div>
                      <div className="shift-name">{workerName}</div>
                      <div className="shift-role">{workerRole}</div>
                    </div>
                  </div>
                  <div className="shift-when">
                    <span className="shift-clock">{currentTimeStr}</span>
                    <span className="shift-hours">{workerShift}</span>
                  </div>
                </div>

                {!worker && (
                  <div className="adm-empty">Your worker profile was removed by an admin — log out and sign in again.</div>
                )}

                {/* Full progress detail only on the Shift tab itself — other tabs
                    (Hours/Leave/Availability/Open Shifts) just need the identity
                    header above, not the whole ward breakdown repeated again. */}
                {workerSection === 'shift' && (<>
                <div className="shift-progress">
                  {showWardRounds && (
                    <div className="shift-ring-wrap">
                      <div className="shift-ring" style={{ background: `conic-gradient(var(--accent-color) ${pct * 3.6}deg, var(--border-color) 0deg)` }}>
                        <div className="shift-ring-inner"><span className="shift-ring-pct">{pct}%</span><span className="shift-ring-sub">rounds</span></div>
                      </div>
                      <span className="shift-ring-label">Rounds done</span>
                    </div>
                  )}
                  <div className="shift-ring-wrap">
                    <div className="shift-ring" style={{ background: `conic-gradient(${shift.color} ${shift.pct * 3.6}deg, var(--border-color) 0deg)` }}>
                      <div className="shift-ring-inner"><span className="shift-ring-time" style={{ color: shift.color }}>{shift.centerLabel}</span><span className="shift-ring-sub">{shift.centerSub}</span></div>
                    </div>
                    <span className="shift-ring-label">Shift · {shift.label}</span>
                  </div>
                  <div className="shift-stats">
                    {showWardRounds && <div className="shift-stat"><span className="shift-stat-n">{doneCount}</span><span className="shift-stat-l">Rounds done</span></div>}
                    <div className="shift-stat"><span className="shift-stat-n">{myTasksDone}/{myTasks.length}</span><span className="shift-stat-l">My tasks</span></div>
                    <div className="shift-stat"><span className="shift-stat-n">{showWardRounds ? remaining : myTasks.length - myTasksDone}</span><span className="shift-stat-l">Remaining</span></div>
                  </div>
                </div>

                {showWardRounds && (
                  <div className="shift-areas">
                    {groups.map(g => (
                      <div key={g.key} className="shift-area">
                        <span className="shift-area-dot" style={{ background: g.color }} />
                        <span className="shift-area-name">{g.title}</span>
                        <span className={`shift-area-count ${g.done === g.tasks.length ? 'complete' : ''}`}>{g.done}/{g.tasks.length}</span>
                      </div>
                    ))}
                  </div>
                )}

                {showWardRounds && (
                  <button className="reset-btn shift-reset" onClick={reset}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
                    Reset rounds
                  </button>
                )}
                </>)}
              </div>

              {/* Worker sub-navigation: Shift / Hours / Leave / Availability */}
              <div className="worker-subnav">
                {SUB_TABS.map(s => (
                  <button key={s.key} className={`worker-subtab ${workerSection === s.key ? 'active' : ''}`} onClick={() => setWorkerSection(s.key)}>
                    <span className="worker-subtab-ic"><SubTabIcon name={s.key} /></span>{s.label}
                    {s.key === 'leave' && myLeaves.length > 0 && <span className="worker-subtab-badge">{myLeaves.length}</span>}
                    {s.key === 'availability' && myAvailability.length > 0 && <span className="worker-subtab-badge">{myAvailability.length}</span>}
                    {s.key === 'openshifts' && deptOpenShifts.filter(o => o.status === 'open').length > 0 && <span className="worker-subtab-badge">{deptOpenShifts.filter(o => o.status === 'open').length}</span>}
                  </button>
                ))}
              </div>
              <p className="section-purpose">{SECTION_PURPOSE[workerSection]}</p>

              {/* For You Today — prioritized digest */}
              {workerSection === 'shift' && digestItems.length > 0 && (
                <div className="digest-card glass-panel">
                  <div className="digest-title">For You Today</div>
                  <div className="digest-list">
                    {digestItems.map((d, i) => (
                      <div key={i} className="digest-item"><span className="digest-icon">{d.icon}</span>{d.text}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Self-schedule request window — admin-controlled announcement */}
              {workerSection === 'shift' && hasScheduleWindow && (
                <div className="schedule-window-banner">
                  <span className="closure-banner-icon">🗓️</span>
                  <div className="closure-banner-text">
                    {scheduleWindow.scheduleWindowStart && scheduleWindow.scheduleWindowEnd && (
                      <div><b>Roster window open:</b> submit requests for {scheduleWindow.scheduleWindowStart} to {scheduleWindow.scheduleWindowEnd}</div>
                    )}
                    <div>{scheduleWindow.scheduleWindowMessage}</div>
                  </div>
                </div>
              )}

              {/* Hours worked — real clock-in data */}
              {workerSection === 'hours' && (
                <HoursChart entries={myHours} worker={worker} onClock={(action) => worker && api.clockWorker(worker.id, action)} />
              )}

              {/* Manager (point of contact) */}
              {workerSection === 'shift' && nightManager && (
                <div className="contact-card glass-panel">
                  <div className="contact-icon">🩺</div>
                  <div className="contact-main">
                    <div className="contact-label">{deptConfig.managerTitle} — point of contact</div>
                    <div className="contact-name">{nightManager.name}</div>
                    <div className="contact-role">{nightManager.role}{nightManager.location ? ` · ${nightManager.location}` : ''}</div>
                  </div>
                  {nightManager.phone && <a className="contact-call" href={`tel:${nightManager.phone.replace(/\s/g, '')}`}>📞 {nightManager.phone}</a>}
                </div>
              )}

              {/* Leave requests */}
              {workerSection === 'leave' && (
              <div className="rounds-card glass-panel">
                <div className="rounds-head">
                  <span className="rounds-dot" style={{ background: 'var(--cat-purple)' }} />
                  <span className="rounds-title">Leave Requests</span>
                  <span className="rounds-tag">visible to admin</span>
                </div>
                {worker && (
                  <div className="leave-balance-row">
                    <div className="leave-balance-stat">
                      <span className="leave-balance-n">{worker.annualLeaveBalance.toFixed(1)}h</span>
                      <span className="leave-balance-l">Annual leave balance</span>
                    </div>
                    <div className="leave-balance-stat">
                      <span className="leave-balance-n">{worker.annualLeaveTaken.toFixed(1)}h</span>
                      <span className="leave-balance-l">Taken to date</span>
                    </div>
                  </div>
                )}
                <form className="mini-form" onSubmit={submitLeave}>
                  <div className="mini-form-grid">
                    <Dropdown block value={leaveForm.type} onChange={v => setLeaveForm({ ...leaveForm, type: v })} options={LEAVE_TYPES} />
                    <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                    <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                    <input placeholder="Reason (optional)" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                  </div>
                  <button className="adm-btn primary" type="submit">Request leave</button>
                </form>
                <div className="req-list">
                  {myLeaves.length === 0 && <div className="adm-empty">No leave requested yet.</div>}
                  {myLeaves.map(l => (
                    <div key={l.id} className="req-row">
                      <span className={`req-status ${l.status}`}>{l.status}</span>
                      <div className="req-main">
                        <div className="req-title">{l.type} leave</div>
                        <div className="req-sub">{l.startDate} → {l.endDate}{l.reason ? ` · ${l.reason}` : ''}</div>
                      </div>
                      {l.status === 'pending' && <button className="req-x" aria-label="Cancel leave request" onClick={() => api.deleteLeave(l.id)}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* Additional-shift availability */}
              {workerSection === 'availability' && (
              <div className="rounds-card glass-panel">
                <div className="rounds-head">
                  <span className="rounds-dot" style={{ background: 'var(--color-success)' }} />
                  <span className="rounds-title">Extra Shift Availability</span>
                  <span className="rounds-tag">for additional shifts</span>
                </div>
                <form className="mini-form" onSubmit={submitAvail}>
                  <div className="mini-form-grid">
                    <input type="date" value={availForm.date} onChange={e => setAvailForm({ ...availForm, date: e.target.value })} />
                    <input placeholder="From (e.g. 6:00 PM)" value={availForm.from} onChange={e => setAvailForm({ ...availForm, from: e.target.value })} />
                    <input placeholder="To (e.g. 11:00 PM)" value={availForm.to} onChange={e => setAvailForm({ ...availForm, to: e.target.value })} />
                    <input placeholder="Note (optional)" value={availForm.note} onChange={e => setAvailForm({ ...availForm, note: e.target.value })} />
                  </div>
                  <button className="adm-btn primary" type="submit">Add availability</button>
                </form>
                <div className="req-list">
                  {myAvailability.length === 0 && <div className="adm-empty">No extra availability submitted.</div>}
                  {myAvailability.map(a => (
                    <div key={a.id} className="req-row">
                      <span className="req-status available">free</span>
                      <div className="req-main">
                        <div className="req-title">{a.date}</div>
                        <div className="req-sub">{a.from || '—'}{a.to ? ` – ${a.to}` : ''}{a.note ? ` · ${a.note}` : ''}</div>
                      </div>
                      <button className="req-x" aria-label="Remove availability" onClick={() => api.deleteAvailability(a.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* Open Shifts — post a shift you can't work, or claim one that's open */}
              {workerSection === 'openshifts' && (
              <div className="rounds-card glass-panel">
                <div className="rounds-head">
                  <span className="rounds-dot" style={{ background: 'var(--accent-color)' }} />
                  <span className="rounds-title">Post a Shift</span>
                  <span className="rounds-tag">can't make it? offer it up</span>
                </div>
                <form className="mini-form" onSubmit={submitOpenShift}>
                  <div className="mini-form-grid">
                    <input type="date" value={openShiftForm.date} onChange={e => setOpenShiftForm({ ...openShiftForm, date: e.target.value })} />
                    <input placeholder="From (e.g. 10:30 PM)" value={openShiftForm.from} onChange={e => setOpenShiftForm({ ...openShiftForm, from: e.target.value })} />
                    <input placeholder="To (e.g. 7:00 AM)" value={openShiftForm.to} onChange={e => setOpenShiftForm({ ...openShiftForm, to: e.target.value })} />
                    <input placeholder="Note (optional)" value={openShiftForm.note} onChange={e => setOpenShiftForm({ ...openShiftForm, note: e.target.value })} />
                  </div>
                  <button className="adm-btn primary" type="submit">Post shift as open</button>
                </form>
              </div>
              )}

              {workerSection === 'openshifts' && (
              <div className="rounds-card glass-panel">
                <div className="rounds-head">
                  <span className="rounds-dot" style={{ background: 'var(--color-success)' }} />
                  <span className="rounds-title">Open Shifts</span>
                  <span className="rounds-tag">{deptOpenShifts.filter(o => o.status === 'open').length} open</span>
                </div>
                <div className="req-list">
                  {deptOpenShifts.length === 0 && <div className="adm-empty">No open shifts right now.</div>}
                  {deptOpenShifts.map(o => {
                    const isMine = o.owner === selectedWorkerId;
                    const claimedByMe = o.claimedBy === selectedWorkerId;
                    return (
                      <div key={o.id} className="req-row">
                        <span className={`req-status ${o.status === 'open' ? 'pending' : 'approved'}`}>{o.status === 'open' ? 'open' : 'claimed'}</span>
                        <div className="req-main">
                          <div className="req-title">{o.date}</div>
                          <div className="req-sub">
                            {o.from || '—'}{o.to ? ` – ${o.to}` : ''}{o.note ? ` · ${o.note}` : ''}
                            {' · '}{o.owner ? `${isMine ? 'You' : workerNameById(o.owner)}'s shift` : 'Needs coverage'}
                            {o.status === 'claimed' && ` · claimed by ${claimedByMe ? 'you' : workerNameById(o.claimedBy)}`}
                          </div>
                        </div>
                        {isMine && o.status === 'open' && (
                          <button className="req-x" aria-label="Cancel open shift" onClick={() => api.deleteOpenShift(o.id)}>✕</button>
                        )}
                        {!isMine && o.status === 'open' && (
                          <button className="adm-btn primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => api.claimOpenShift(o.id)}>Claim</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* My assigned tasks (from admin) */}
              {workerSection === 'shift' && (<>
              <div className="rounds-card glass-panel">
                <div className="rounds-head">
                  <span className="rounds-dot" style={{ background: 'var(--accent-color)' }} />
                  <span className="rounds-title">My Assigned Tasks</span>
                  <span className="rounds-tag">from supervisor</span>
                  <span className={`rounds-count ${myTasks.length && myTasksDone === myTasks.length ? 'complete' : ''}`}>{myTasksDone}/{myTasks.length}</span>
                </div>
                <div className="rounds-list">
                  {myTasks.length === 0 && <div className="adm-empty">No tasks assigned to you.</div>}
                  {myTasks.map(t => (
                    <div key={t.id} className="task-block">
                      <label className={`task-row ${t.done ? 'is-done' : ''}`}>
                        <input type="checkbox" checked={t.done} onChange={() => handleTaskToggle(t)} />
                        <span className="task-dot" style={{ background: PRIORITY_COLOR[t.priority] || 'var(--text-muted)' }} />
                        <span className="task-main">
                          <span className="task-name">{t.title}</span>
                          {t.area && <span className="task-note">{t.area}</span>}
                        </span>
                        {t.pinId && (
                          <button className="task-floor-badge" title="Pinned on the Floor Map — check it off there too" onClick={(e) => { e.preventDefault(); setActiveTab('map'); }}>📍 map</button>
                        )}
                        <span className="task-floor-badge" style={{ textTransform: 'capitalize' }}>{t.priority}</span>
                        {!t.blocked && (
                          <button className="task-flag-icon" title="Flag an issue with this task" aria-label="Flag an issue"
                            onClick={(e) => { e.preventDefault(); setFlaggingTaskId(flaggingTaskId === t.id ? null : t.id); setFlagNoteDraft(''); }}>🚩</button>
                        )}
                      </label>
                      {t.easyWay && (
                        <div className="easyway">
                          <button className="easyway-toggle" onClick={() => setOpenEasyWay(openEasyWay === t.id ? null : t.id)}>
                            💡 Easy way to finish this {openEasyWay === t.id ? '▲' : '▼'}
                          </button>
                          {openEasyWay === t.id && <div className="easyway-body">{t.easyWay}</div>}
                        </div>
                      )}
                      {t.blocked && (
                        <div className="task-flag-banner">
                          <span>🚩 Flagged: {t.blockedNote || 'No details given'}</span>
                          <button className="task-flag-clear" onClick={() => clearFlag(t.id)}>Clear</button>
                        </div>
                      )}
                      {!t.blocked && flaggingTaskId === t.id && (
                        <div className="task-flag-form">
                          <input autoFocus placeholder="What's blocking this? (e.g. room locked, no supplies)" value={flagNoteDraft} onChange={e => setFlagNoteDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitFlag(t.id)} />
                          <button className="adm-btn primary" onClick={() => submitFlag(t.id)}>Flag</button>
                          <button className="adm-btn ghost" onClick={() => { setFlaggingTaskId(null); setFlagNoteDraft(''); }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wayfinding guide — sourced from the official Monash Health wayfinding PDFs */}
              {deptGuides && (
                <div className="rounds-card glass-panel">
                  <div className="rounds-head">
                    <span className="rounds-dot" style={{ background: deptConfig.accent }} />
                    <span className="rounds-title">Wayfinding Guide</span>
                    <span className="rounds-tag">official directions</span>
                  </div>
                  <div className="guide-list">
                    {deptGuides.map((g, i) => (
                      <div key={i} className="guide-item">
                        <div className="guide-item-title">{g.title}</div>
                        <ol className="guide-steps">
                          {g.steps.map((s, j) => <li key={j}>{s}</li>)}
                        </ol>
                        <div className="guide-source">Source: {g.source}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live bin sensors */}
              {deptConfig.hasBins && (
              <div className="sensors-card glass-panel">
                <div className="sensors-head">
                  <div className="sensors-title">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    Live Bin Sensors
                    <span className={`sensors-alert-pill ${fullBins.length ? 'on' : ''}`}>{fullBins.length} full</span>
                  </div>
                  <button className="sim-btn" onClick={simulateFullBin}>Simulate sensor</button>
                </div>
                {fullBins.length > 0 && (
                  <div className="sensors-banner"><span className="sensors-banner-dot" />{fullBins.length} bin{fullBins.length > 1 ? 's' : ''} full — empty required</div>
                )}
                <div className="sensor-list">
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
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* Nightly cleaning rounds */}
              {showWardRounds && groups.map(g => (
                <div key={g.key} className="rounds-card glass-panel">
                  <button className="rounds-head rounds-head-toggle" onClick={() => toggleGroup(g.key)} aria-expanded={!!expandedGroups[g.key]}>
                    <span className="rounds-dot" style={{ background: g.color }} />
                    <span className="rounds-title">{g.title}</span>
                    <span className="rounds-tag">{g.tag}</span>
                    <span className={`rounds-count ${g.done === g.tasks.length ? 'complete' : ''}`}>{g.done}/{g.tasks.length}</span>
                    <svg className={`rounds-chevron ${expandedGroups[g.key] ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {expandedGroups[g.key] && (
                  <div className="rounds-list">
                    {g.tasks.map(t => (
                      <label key={t.id} className={`task-row ${done.has(t.id) ? 'is-done' : ''}`}>
                        <input type="checkbox" checked={done.has(t.id)} onChange={() => handleRound(t.id)} />
                        <span className="task-dot" style={{ background: LIFT_BADGE[t.lift] || 'var(--text-muted)' }} />
                        <span className="task-main">
                          <span className="task-name">{t.wardName}</span>
                          {t.note && t.note !== '—' && <span className="task-note">{t.note}</span>}
                        </span>
                        <span className="task-floor-badge">{floorLabel(t.floor).replace('Level ', 'L')}</span>
                      </label>
                    ))}
                  </div>
                  )}
                </div>
              ))}
              </>)}
            </section>

            {/* Floating alert toast (coffee break / bin full) */}
            {topAlert && (
              <div className={`toast-overlay ${topAlert.kind === 'break' ? 'break' : 'bin'}`}>
                <div className="toast-icon">{topAlert.kind === 'break' ? '☕' : '🗑️'}</div>
                <div className="toast-text">
                  <span className="toast-title">{topAlert.kind === 'break' ? 'Break Time' : 'Bin Full Alert'}</span>
                  <span className="toast-body">{topAlert.message}</span>
                  <div className="toast-actions">
                    {topAlert.kind === 'break'
                      ? <button className="push-btn resolve" onClick={() => resolveNotif(topAlert.id)}>Got it, thanks</button>
                      : topAlert.status === 'sent'
                        ? <button className="push-btn accept" onClick={() => acknowledgeNotif(topAlert.id)}>Accept</button>
                        : <button className="push-btn resolve" onClick={() => resolveNotif(topAlert.id)}>Mark emptied</button>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
