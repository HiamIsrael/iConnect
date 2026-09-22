import { useEffect, useRef, useState } from 'react';
import { getApiStatus, subscribeApiStatus } from '../api';

const SLOW_MESSAGE =
  'Connecting to the server… this can take up to a minute after a period of inactivity.';
const ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";
const ERROR_AUTOHIDE_MS = 8000;

export default function ServerStatus() {
  const [status, setStatus] = useState(getApiStatus);
  const hideTimer = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeApiStatus((next) => {
      setStatus(next);
      clearTimeout(hideTimer.current);
      if (next.state === 'error') {
        hideTimer.current = setTimeout(() => setStatus((s) => (s.state === 'error' ? { ...s, state: 'idle' } : s)), ERROR_AUTOHIDE_MS);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (status.state === 'idle') return null;

  const message =
    status.state === 'error'
      ? ERROR_MESSAGE
      : SLOW_MESSAGE + (status.state === 'retrying' ? ` Retrying (${status.attempt}/${status.attempts}).` : '');

  return (
    <div className={`server-status${status.state === 'error' ? ' error' : ''}`} role="status">
      {status.state !== 'error' && <span className="spinner" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}
