'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html><body>
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fff', background: '#0A0E1A' }}>
        <h2>Algo salio mal</h2>
        <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Intentar de nuevo
        </button>
      </div>
    </body></html>
  );
}
