import React, { useState, useMemo } from 'react';
import { HOURS_RAMP, hoursCellColor as cellColor, hoursCellText as cellText } from './theme.js';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmt = (h) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
const pad = (n) => String(n).padStart(2, '0');

export default function HoursChart({ entries = [], worker = null, onClock }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const byDate = useMemo(() => new Map(entries.map(e => [e.date, e.hours])), [entries]);

  const cal = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
      cells.push({ d, key, hours: byDate.get(key) || 0, isToday: key === todayKey });
    }
    return cells;
  }, [view, byDate]);

  const monthDays = cal.filter(Boolean);
  const total = monthDays.reduce((s, c) => s + c.hours, 0);
  const shifts = monthDays.filter(c => c.hours > 0).length;
  const avg = shifts ? total / shifts : 0;
  const best = monthDays.reduce((m, c) => Math.max(m, c.hours), 0);

  const go = (delta) => setView(v => {
    const nm = v.m + delta;
    return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
  });
  const isThisMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  const clockedIn = !!worker?.clockedInAt;
  let elapsedLabel = '';
  if (clockedIn) {
    const ms = Date.now() - new Date(worker.clockedInAt).getTime();
    elapsedLabel = `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  return (
    <div className="hours-card glass-panel">
      <div className="hours-head">
        <div className="hours-title-group">
          <span className="hours-title">Hours Worked</span>
          <span className="hours-sub">Clock in when you start, clock out when you finish — your hours fill the calendar.</span>
        </div>
      </div>

      {/* Clock in / out */}
      <div className={`clock-bar ${clockedIn ? 'on' : ''}`}>
        <div className="clock-bar-info">
          <span className={`clock-dot ${clockedIn ? 'live' : ''}`} />
          <div className="clock-bar-text">
            <span className="clock-bar-status">{clockedIn ? 'On shift now' : 'Not clocked in'}</span>
            <span className="clock-bar-sub">
              {clockedIn ? `Running for ${elapsedLabel} — tap to finish & log hours` : 'Clock in to start tracking tonight’s hours'}
            </span>
          </div>
        </div>
        <button className={`clock-btn ${clockedIn ? 'out' : 'in'}`} disabled={!worker} onClick={() => onClock && onClock(clockedIn ? 'out' : 'in')}>
          {clockedIn ? 'Clock out' : 'Clock in'}
        </button>
      </div>

      {/* Hero + key stats */}
      <div className="hours-hero">
        <div className="hours-hero-main">
          <span className="hours-hero-num">{fmt(total)}<span className="hours-hero-unit">h</span></span>
          <span className="hours-hero-label">logged · {MONTHS[view.m]} {view.y}</span>
        </div>
        <div className="hours-hero-stats">
          <div className="hero-stat"><span className="hero-stat-n">{shifts}</span><span className="hero-stat-l">shifts</span></div>
          <div className="hero-stat"><span className="hero-stat-n">{fmt(avg)}h</span><span className="hero-stat-l">avg</span></div>
          <div className="hero-stat"><span className="hero-stat-n">{fmt(best)}h</span><span className="hero-stat-l">best day</span></div>
        </div>
      </div>

      {/* Calendar */}
      <div className="cal">
        <div className="cal-head">
          <button className="cal-nav" onClick={() => go(-1)} aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="cal-title">{MONTHS[view.m]} {view.y}</span>
          <button className="cal-nav" onClick={() => go(1)} disabled={isThisMonth} aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="cal-weekdays">
          {DAY_LETTERS.map((d, i) => <span key={i} className="cal-wd">{d}</span>)}
        </div>
        <div className="cal-grid">
          {cal.map((c, i) => c === null
            ? <span key={`b${i}`} className="cal-cell blank" />
            : (
              <span
                key={c.key}
                className={`cal-cell ${c.isToday ? 'today' : ''} ${c.hours > 0 ? 'worked' : ''}`}
                style={{ background: cellColor(c.hours), color: cellText(c.hours) }}
                title={`${c.key} — ${c.hours > 0 ? fmt(c.hours) + 'h worked' : 'no shift'}`}
              >
                <span className="cal-day">{c.d}</span>
                {c.hours > 0 && <span className="cal-hrs">{fmt(c.hours)}h</span>}
              </span>
            ))}
        </div>
        <div className="cal-legend">
          <span className="cal-legend-txt">Less</span>
          {HOURS_RAMP.map(c => <span key={c} className="cal-legend-cell" style={{ background: c }} />)}
          <span className="cal-legend-txt">More</span>
        </div>
      </div>

      {total === 0 && !clockedIn && (
        <div className="hours-empty">No hours logged this month yet — clock in above and your worked days will light up the calendar.</div>
      )}
    </div>
  );
}
