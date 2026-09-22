import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { startMotionLayer } from '../motion';

/**
 * Mounts the global motion layer (scroll reveal + hero parallax). Re-scans on
 * every route change; any element with `data-reveal` or `data-parallax`
 * anywhere in the app is picked up automatically.
 */
export default function MotionLayer() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    return startMotionLayer(document, window);
  }, [pathname]);

  return null;
}
