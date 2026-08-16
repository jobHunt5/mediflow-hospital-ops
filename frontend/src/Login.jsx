import React, { useState } from 'react';
import PasswordInput from './PasswordInput.jsx';
import { DEPARTMENTS, DEPT } from './departments.js';
import { useTheme } from './useTheme.js';

// ── Quick-login demo mode ──────────────────────────────────────────────
// Password-based sign-in is temporarily disabled: instead of typing a
// username/password, each of the 12 seeded accounts (6 depts × admin/worker)
// gets a one-click button. The original role → department → username/password
// flow below is left fully intact — flip this back to false to restore it.
const QUICK_LOGIN_ONLY = true;
const DEMO_PASSWORD = 'MediFlow2026!';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null); // 'worker' | 'admin'
  const [dept, setDept] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quickPending, setQuickPending] = useState(null); // e.g. 'admin-linen'
  const [quickError, setQuickError] = useState('');
  const { toggle: toggleTheme, isDark } = useTheme();

  const back = () => {
    setError('');
    if (dept) { setDept(null); setUsername(''); setPassword(''); }
    else setRole(null);
  };

  const pickDept = (d) => {
    setDept(d);
    setUsername(role === 'admin' ? `${d}-admin` : '');
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Sign in failed'); return; }
      if (data.role !== role || data.department !== dept) {
        setError(`That account is a ${data.role} for ${DEPT[data.department]?.name || data.department} — go back and pick the right team.`);
        return;
      }
      onLogin({ role: data.role, department: data.department, workerId: data.workerId, name: data.name, token: data.token });
    } catch {
      setError('Could not reach the server — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (r, d) => {
    const key = `${r}-${d}`;
    setQuickPending(key);
    setQuickError('');
    const uname = r === 'admin' ? `${d}-admin` : slug(DEPT[d].workerTitle);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: DEMO_PASSWORD }),
      });
      const data = await res.json();
      if (!res.ok) { setQuickError(data.error || 'Sign in failed'); return; }
      onLogin({ role: data.role, department: data.department, workerId: data.workerId, name: data.name, token: data.token });
    } catch {
      setQuickError('Could not reach the server — check your connection and try again.');
    } finally {
      setQuickPending(null);
    }
  };

  return (
    <div className="login-page">
      <button className="theme-toggle login-theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
        {isDark ? 'Light' : 'Dark'}
      </button>

      <div className="login-visual" aria-hidden="true">
        <div className="login-visual-blob a" />
        <div className="login-visual-blob b" />
        <div className="login-visual-content">
          <h2 className="login-visual-title">Night operations, simplified.</h2>
          <p className="login-visual-copy">
            One place for the environmental services team to clock in, run their rounds,
            find any room on campus and keep every ward's bins and linens on track —
            built for Monash Medical Centre, Clayton.
          </p>
          <div className="login-visual-features">
            <div className="login-visual-feature">
              <span className="login-visual-feature-ic">📍</span>
              <span>Live campus wayfinding across every level</span>
            </div>
            <div className="login-visual-feature">
              <span className="login-visual-feature-ic">✓</span>
              <span>Task rounds, bin sensors and alerts in real time</span>
            </div>
            <div className="login-visual-feature">
              <span className="login-visual-feature-ic">🕒</span>
              <span>Clock-in hours logged automatically</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-name">MediFlow</span>
        </div>

        {QUICK_LOGIN_ONLY && (
          <>
            <div className="login-quick-grid">
              <div className="login-quick-group">
                <div className="login-quick-heading">Admins</div>
                {DEPARTMENTS.map(d => (
                  <button
                    key={`admin-${d.id}`} className="login-dept-card login-dept-card-plain" style={{ '--dept-accent': d.accent }}
                    onClick={() => quickLogin('admin', d.id)} disabled={!!quickPending}
                  >
                    <span className="login-dept-name">{d.managerTitle}</span>
                  </button>
                ))}
              </div>
              <div className="login-quick-group">
                <div className="login-quick-heading">Workers</div>
                {DEPARTMENTS.map(d => (
                  <button
                    key={`worker-${d.id}`} className="login-dept-card login-dept-card-plain" style={{ '--dept-accent': d.accent }}
                    onClick={() => quickLogin('worker', d.id)} disabled={!!quickPending}
                  >
                    <span className="login-dept-name">{d.workerTitle}</span>
                  </button>
                ))}
              </div>
            </div>
            {quickError && <div className="login-error">{quickError}</div>}
          </>
        )}

        {!QUICK_LOGIN_ONLY && !role && (
          <>
            <h1 className="login-title">Sign in</h1>
            <p className="login-sub">Choose how you're working tonight. The Floor Map is available to everyone once you're in.</p>
            <div className="login-role-grid">
              <button className="login-role-card" onClick={() => setRole('worker')}>
                <span className="login-role-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>
                </span>
                <span className="login-role-name">Worker</span>
                <span className="login-role-desc">Clock in, see your assigned tasks, wayfinding and live alerts.</span>
              </button>
              <button className="login-role-card" onClick={() => setRole('admin')}>
                <span className="login-role-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
                </span>
                <span className="login-role-name">Admin / Manager</span>
                <span className="login-role-desc">Run the roster, assign work, manage alerts and payroll hours.</span>
              </button>
            </div>
          </>
        )}

        {!QUICK_LOGIN_ONLY && role && !dept && (
          <>
            <button className="login-back" onClick={back}>← Back</button>
            <h1 className="login-title">Which team?</h1>
            <p className="login-sub">{role === 'worker' ? 'Pick the department you work in.' : 'Pick the department you manage.'}</p>
            <div className="login-dept-grid">
              {DEPARTMENTS.map(d => (
                <button key={d.id} className="login-dept-card" style={{ '--dept-accent': d.accent }} onClick={() => pickDept(d.id)}>
                  <span className="login-dept-dot" />
                  <span className="login-dept-main">
                    <span className="login-dept-name">{d.name}</span>
                    <span className="login-dept-summary">{d.summary}</span>
                  </span>
                  <span className="login-dept-arrow">→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!QUICK_LOGIN_ONLY && role && dept && (
          <>
            <button className="login-back" onClick={back}>← Back</button>
            <h1 className="login-title">{DEPT[dept].name}</h1>
            <p className="login-sub">
              {role === 'admin' ? `Signing in as ${DEPT[dept].managerTitle}.` : 'Enter the username and password your manager gave you.'}
            </p>
            <form className="login-form" onSubmit={submit}>
              {role === 'worker' && (
                <input
                  className="login-input" placeholder="Username" value={username} autoFocus
                  onChange={e => setUsername(e.target.value)} autoComplete="username"
                />
              )}
              {role === 'admin' && (
                <input
                  className="login-input" placeholder="Username" value={username}
                  onChange={e => setUsername(e.target.value)} autoComplete="username"
                />
              )}
              <PasswordInput
                className="login-input" placeholder="Password" value={password} autoFocus={role === 'admin'}
                onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              />
              {error && <div className="login-error">{error}</div>}
              <button className="login-enter-btn" style={{ background: DEPT[dept].accent }} type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
