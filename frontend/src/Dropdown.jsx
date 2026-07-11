import React, { useRef, useState, useEffect } from 'react';

/**
 * Clean custom dropdown (replaces native <select>).
 * options: array of strings OR { value, label, dot? }
 */
export default function Dropdown({ value, onChange, options = [], placeholder = 'Select…', className = '', block = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const norm = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = norm.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  return (
    <div className={`dd ${block ? 'block' : ''} ${open ? 'open' : ''} ${className}`} ref={ref}>
      <button type="button" className="dd-btn" onClick={() => setOpen(o => !o)}>
        {selected?.dot && <span className="dd-dot" style={{ background: selected.dot }} />}
        <span className={`dd-label ${selected ? '' : 'is-placeholder'}`}>{selected ? selected.label : placeholder}</span>
        <svg className="dd-chev" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          {norm.map(o => (
            <button
              type="button"
              key={o.value}
              className={`dd-item ${o.value === value ? 'sel' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.dot && <span className="dd-dot" style={{ background: o.dot }} />}
              <span className="dd-item-label">{o.label}</span>
              {o.value === value && (
                <svg className="dd-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
