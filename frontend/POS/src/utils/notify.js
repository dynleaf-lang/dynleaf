// Minimal in-app toast system (no external deps). Shows visible toasts + plays sounds.
import React, { useEffect, useState } from 'react';
import playPosSound from './sound';

let idCounter = 0;
const listeners = new Set();

const notify = (evt) => {
  listeners.forEach((fn) => {
    try { fn(evt); } catch {}
  });
};

const makeId = () => `t-${Date.now()}-${++idCounter}`;

const durations = {
  success: 2500,
  info: 2500,
  warning: 4000,
  error: 4000,
  loading: null, // stays until dismissed
};

const api = {
  success: (message) => {
    const id = makeId();
    playPosSound('success');
    notify({ type: 'add', toast: { id, type: 'success', message, createdAt: Date.now() } });
    return id;
  },
  error: (message) => {
    const id = makeId();
    playPosSound('error');
    notify({ type: 'add', toast: { id, type: 'error', message, createdAt: Date.now() } });
    return id;
  },
  info: (message) => {
    const id = makeId();
    playPosSound('info');
    notify({ type: 'add', toast: { id, type: 'info', message, createdAt: Date.now() } });
    return id;
  },
  warning: (message) => {
    const id = makeId();
    playPosSound('warning');
    notify({ type: 'add', toast: { id, type: 'warning', message, createdAt: Date.now() } });
    return id;
  },
  loading: (message = 'Loading...') => {
    const id = makeId();
    playPosSound('info');
    notify({ type: 'add', toast: { id, type: 'loading', message, createdAt: Date.now() } });
    return id;
  },
  dismiss: (id) => {
    notify({ type: 'remove', id });
  },
  getToasts: () => [],
  custom: (renderer, opts) => {
    // Minimal: treat as info
    return api.info(typeof renderer === 'string' ? renderer : '');
  },
};

export const Toaster = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onEvent = (evt) => {
      if (!evt) return;
      if (evt.type === 'add' && evt.toast) {
        setToasts((prev) => [...prev, evt.toast]);
      } else if (evt.type === 'remove') {
        if (evt.id) setToasts((prev) => prev.filter((t) => t.id !== evt.id));
        else setToasts([]);
      }
    };
    listeners.add(onEvent);
    return () => listeners.delete(onEvent);
  }, []);

  useEffect(() => {
    // Auto-dismiss timers
    const timers = toasts.map((t) => {
      const dur = durations[t.type];
      if (!dur) return null;
      const handle = setTimeout(() => api.dismiss(t.id), dur);
      return handle;
    }).filter(Boolean);
    return () => timers.forEach((h) => clearTimeout(h));
  }, [toasts]);

  const variant = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'loading': return 'secondary';
      default: return 'info';
    }
  };

  return React.createElement(
    'div',
    { className: 'position-fixed top-0 end-0 p-3', style: { zIndex: 1080, pointerEvents: 'none' } },
    React.createElement(
      'div',
      { style: { minWidth: 280 } },
      ...toasts.map((t) => {
        const children = [];
        if (t.type === 'loading') {
          children.push(
            React.createElement('span', {
              key: `${t.id}-sp`,
              className: 'spinner-border spinner-border-sm me-2',
              role: 'status',
              'aria-hidden': 'true'
            })
          );
        }
        children.push(
          React.createElement('div', { key: `${t.id}-msg`, className: 'flex-grow-1' }, t.message)
        );
        children.push(
          React.createElement('button', {
            key: `${t.id}-x`,
            type: 'button',
            className: 'btn-close ms-2',
            'aria-label': 'Close',
            onClick: () => api.dismiss(t.id)
          })
        );

        return React.createElement(
          'div',
          {
            key: t.id,
            className: `alert alert-${variant(t.type)} shadow-sm d-flex align-items-center mb-2`,
            role: 'alert',
            style: { pointerEvents: 'auto' }
          },
          ...children
        );
      })
    )
  );
};

export default api;
