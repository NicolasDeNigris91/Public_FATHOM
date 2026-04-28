'use client';

import { useEffect, useState } from 'react';

/**
 * Thin horizontal bar at top of viewport that fills as the user scrolls
 * through the page. Used on module pages to give a sense of "how much is left".
 * Pure client-side, no persistence — purely visual.
 */
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, (window.scrollY / total) * 100));
      setProgress(pct);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso de leitura"
      className="fixed top-0 left-0 right-0 h-px bg-mist/30 z-50 pointer-events-none"
    >
      <div
        className="h-full bg-gold-leaf transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
