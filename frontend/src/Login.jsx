import React, { useState } from 'react';
import MonashLogo from './MonashLogo.jsx';
import { DEPARTMENTS, DEPT } from './departments.js';
import { useTheme } from './useTheme.js';

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null); // 'worker' | 'admin'
  const [dept, setDept] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
      <div className="login-card">
        <div className="login-brand">
          <MonashLogo size={38} subtitle="Monash Health Operations" />
        </div>

        {!role && (
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

        {role && !dept && (
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

        {role && dept && (
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
              <input
                className="login-input" type="password" placeholder="Password" value={password} autoFocus={role === 'admin'}
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
