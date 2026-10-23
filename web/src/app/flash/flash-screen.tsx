'use client';

import { useEffect, useState } from 'react';

import styles from './flash.module.css';

export function FlashScreen({
  message,
  durationSec,
  intensity,
}: {
  message: string;
  durationSec: number;
  intensity: number;
}) {
  const [left, setLeft] = useState(durationSec);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const rem = Math.max(0, durationSec - (Date.now() - start) / 1000);
      setLeft(Math.ceil(rem));
      if (rem <= 0) {
        clearInterval(id);
        window.close();
      }
    }, 200);
    return () => clearInterval(id);
  }, [durationSec]);

  return (
    <div className={styles.root} style={{ ['--fx' as string]: intensity }}>
      <div className={styles.noise} aria-hidden />
      <p className={styles.date}>20.10 · 18.10</p>
      <h1 className={styles.title}>{message}</h1>
      <p className={styles.hint}>Esc ile kapat · {left} sn</p>
    </div>
  );
}
