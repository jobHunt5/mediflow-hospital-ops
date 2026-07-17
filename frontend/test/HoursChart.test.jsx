import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HoursChart from '../src/HoursChart.jsx';

// The "exceptions" stat mirrors UKG's timecard-exceptions pattern: it should
// flag shifts logged well under a full 8h shift, and a clock-in that's been
// running suspiciously long (a likely missed clock-out).
describe('HoursChart exceptions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows 0 exceptions for a normal full shift', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    render(<HoursChart entries={[{ date: '2026-07-10', hours: 8 }]} worker={{ clockedInAt: null }} onClock={() => {}} />);
    const exceptionsLabel = screen.getByText('exceptions');
    const stat = exceptionsLabel.closest('.hero-stat');
    expect(stat.querySelector('.hero-stat-n')).toHaveTextContent('0');
  });

  it('counts a shift logged under 6h as one exception', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    render(<HoursChart entries={[{ date: '2026-07-10', hours: 3 }]} worker={{ clockedInAt: null }} onClock={() => {}} />);
    const exceptionsLabel = screen.getByText('exceptions');
    const stat = exceptionsLabel.closest('.hero-stat');
    expect(stat.querySelector('.hero-stat-n')).toHaveTextContent('1');
  });

  it('counts a clock-in running over 12h as an exception even with no logged hours', () => {
    vi.useFakeTimers();
    const now = new Date('2026-07-15T12:00:00Z');
    vi.setSystemTime(now);
    const clockedInAt = new Date(now.getTime() - 13 * 3600000).toISOString(); // 13h ago
    render(<HoursChart entries={[]} worker={{ clockedInAt }} onClock={() => {}} />);
    const exceptionsLabel = screen.getByText('exceptions');
    const stat = exceptionsLabel.closest('.hero-stat');
    expect(stat.querySelector('.hero-stat-n')).toHaveTextContent('1');
  });

  it('a clock-in running under 12h is not flagged', () => {
    vi.useFakeTimers();
    const now = new Date('2026-07-15T12:00:00Z');
    vi.setSystemTime(now);
    const clockedInAt = new Date(now.getTime() - 2 * 3600000).toISOString(); // 2h ago
    render(<HoursChart entries={[]} worker={{ clockedInAt }} onClock={() => {}} />);
    const exceptionsLabel = screen.getByText('exceptions');
    const stat = exceptionsLabel.closest('.hero-stat');
    expect(stat.querySelector('.hero-stat-n')).toHaveTextContent('0');
  });
});
