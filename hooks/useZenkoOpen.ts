'use client';

/**
 * Whether Zenko is open, as the waitlist's own status route reports it. Starts
 * closed and stays closed unless the route answers an explicit `open: true`, so
 * a slow or failed read never shows the open copy.
 */

import { useEffect, useState } from 'react';

export function openFromStatus(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { open?: unknown }).open === true
  );
}

export function useZenkoOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/zenko/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setOpen(openFromStatus(payload));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return open;
}
