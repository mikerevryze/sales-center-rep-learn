'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

/**
 * Fires a short confetti burst on mount. Mount it from any page that wants
 * to celebrate a milestone — e.g. passing the final quiz or winning a roleplay.
 */
export function ConfettiBurst({ durationMs = 3500 }: { durationMs?: number }) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    const stop = setTimeout(() => setRunning(false), durationMs);
    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(stop);
    };
  }, [durationMs]);

  if (!running || dims.w === 0) return null;
  return (
    <Confetti width={dims.w} height={dims.h} numberOfPieces={280} recycle={false} gravity={0.25} />
  );
}
