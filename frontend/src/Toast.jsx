import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext(null);

const ICONS = { success: '✓', error: '!', info: 'i' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind, title, body) => {
    const id = ++idRef.current;
    setToasts(list => [...list, { id, kind, title, body }]);
    window.setTimeout(() => dismiss(id), 3800);
    return id;
  }, [dismiss]);

  const api = useRef({
    success: (title, body) => push('success', title, body),
    error: (title, body) => push('error', title, body),
    info: (title, body) => push('info', title, body),
  }).current;

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item kind-${t.kind}`} role="status">
            <span className="toast-icon-badge" aria-hidden="true">{ICONS[t.kind]}</span>
            <div className="toast-text">
              <span className="toast-title">{t.title}</span>
              {t.body && <span className="toast-body">{t.body}</span>}
            </div>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider');
  return ctx;
}
