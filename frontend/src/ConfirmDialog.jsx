import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null); // { title, body, confirmLabel, cancelLabel, danger, resolve }
  const cancelBtnRef = useRef(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setReq({
        title: opts.title || 'Are you sure?',
        body: opts.body || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    req?.resolve(result);
    setReq(null);
  };

  useEffect(() => {
    if (!req) return;
    cancelBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {req && (
        <div className="confirm-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
            <h2 id="confirm-title" className="confirm-title">{req.title}</h2>
            {req.body && <p id="confirm-body" className="confirm-body">{req.body}</p>}
            <div className="confirm-actions">
              <button type="button" ref={cancelBtnRef} className="adm-btn ghost" onClick={() => close(false)}>{req.cancelLabel}</button>
              <button type="button" className={`adm-btn ${req.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>{req.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside a ConfirmProvider');
  return ctx;
}
