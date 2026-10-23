'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './theater.module.css';

type PlaySettings = {
  scenarioDurationSec: number;
  fakeShutdownDurationSec: number;
  effectIntensity: number;
  soundVolume: number;
  messages: string[];
  youtubeUrl: string;
  shutdownAfterScenario: boolean;
};

type Phase = 'intro' | 'cinematic' | 'fake-shutdown' | 'youtube' | 'done' | 'aborted';

export function RevengeTheater({
  settings,
  fakeOverrideSec,
  finishToken,
  shutdownAfter,
  startMode = 'full',
  skipYoutubeAfterFake = false,
}: {
  settings: PlaySettings;
  fakeOverrideSec?: number;
  finishToken?: string;
  shutdownAfter?: boolean;
  startMode?: 'full' | 'fake-only';
  skipYoutubeAfterFake?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(startMode === 'fake-only' ? 'fake-shutdown' : 'intro');
  const [line, setLine] = useState('');
  const [sub, setSub] = useState('');
  const [typed, setTyped] = useState('');
  const [flashDate, setFlashDate] = useState<string | null>(null);
  const [fakeProgress, setFakeProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const started = useRef(false);
  const fakeSec = fakeOverrideSec ?? settings.fakeShutdownDurationSec;

  const intensity = settings.effectIntensity;

  const beep = useCallback(
    (freq: number, dur: number) => {
      if (settings.soundVolume <= 0) return;
      try {
        if (!audioCtx.current) audioCtx.current = new AudioContext();
        const ctx = audioCtx.current;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.value = settings.soundVolume * 0.08;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      } catch {
        /* sessiz */
      }
    },
    [settings.soundVolume],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '01アイウエオカキクケコｱｲｳｴｵ0123456789';
    const drops: number[] = [];
    const cols = Math.floor(canvas.width / 14);
    for (let i = 0; i < cols; i++) drops[i] = Math.random() * -40;

    let raf = 0;
    const drawMatrix = () => {
      if (phase === 'aborted' || phase === 'done') return;
      ctx.fillStyle = `rgba(0,0,0,${0.08 + intensity * 0.04})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgba(0,255,120,${0.35 + intensity * 0.3})`;
      ctx.font = '14px monospace';
      for (let i = 0; i < drops.length; i++) {
        const t = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(t, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.6 + intensity * 0.4;
      }
      raf = requestAnimationFrame(drawMatrix);
    };
    drawMatrix();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, phase]);

  useEffect(() => {
    if (startMode === 'fake-only') return;
    if (started.current) return;
    started.current = true;

    const t0 = performance.now();
    const totalMs = settings.scenarioDurationSec * 1000;

    const script: Array<{ at: number; fn: () => void }> = [
      { at: 0, fn: () => { setPhase('cinematic'); setLine('QSTEELCAD v2.0.8.1'); setSub(''); beep(880, 0.05); } },
      { at: 2000, fn: () => setLine('BİR ŞEYLER TERS GİDİYOR...') },
      { at: 4000, fn: () => { setFlashDate('20.10'); setLine(''); beep(120, 0.08); } },
      { at: 5200, fn: () => setFlashDate('18.10') },
      { at: 6400, fn: () => { setFlashDate(null); setLine('20.10  //  18.10'); setSub('HİÇBİR ŞEY UNUTULMADI.'); } },
      { at: 8000, fn: () => { setLine(''); setSub(''); setTyped(''); typeLine('İNTİKAM...', setTyped); } },
      { at: 10500, fn: () => typeLine('SOĞUK YENEN BİR YEMEKTİR.', setTyped) },
      { at: 12000, fn: () => typeLine('AMA BAZILARI SICAK SERVİSİ HAK EDER. :)', setTyped) },
      { at: 15000, fn: () => { setTyped(''); setLine('BU BİR HATA DEĞİL.'); setSub(''); } },
      { at: 16500, fn: () => setLine('BU BİR HESAPLAŞMA.') },
      { at: 18000, fn: () => setLine('20.10 — 18.10') },
      { at: 19500, fn: () => setLine('İNTİKAM PROTOKOLÜ TAMAMLANDI.') },
      {
        at: totalMs,
        fn: () => {
          setPhase('fake-shutdown');
          setLine('');
          setSub('');
          setFlashDate(null);
        },
      },
    ];

    let i = 0;
    const tick = () => {
      const elapsed = performance.now() - t0;
      while (i < script.length && elapsed >= script[i].at) {
        script[i].fn();
        i++;
      }
      if (phase !== 'fake-shutdown' && phase !== 'aborted' && i < script.length) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [beep, phase, settings.scenarioDurationSec, startMode]);

  useEffect(() => {
    if (phase !== 'fake-shutdown') return;
    const start = Date.now();
    const dur = fakeSec * 1000;
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setFakeProgress(p);
      if (p >= 1) {
        clearInterval(id);
        if (skipYoutubeAfterFake) {
          setPhase('done');
        } else {
          setPhase('youtube');
          window.location.assign(settings.youtubeUrl);
          void finishScenario();
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [fakeSec, phase, settings.youtubeUrl, skipYoutubeAfterFake]);

  async function finishScenario() {
    const doShutdown = shutdownAfter ?? settings.shutdownAfterScenario;
    if (finishToken && doShutdown) {
      await fetch('/api/scenario/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: finishToken }),
      });
    }
    setPhase('done');
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (phase === 'fake-shutdown') {
        if (skipYoutubeAfterFake) {
          setPhase('done');
        } else {
          setPhase('youtube');
          window.location.assign(settings.youtubeUrl);
          void finishScenario();
        }
      } else if (phase === 'cinematic' || phase === 'intro') {
        setPhase('aborted');
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, settings.youtubeUrl]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const rotMsg = settings.messages[Math.floor((Date.now() / 4000) % settings.messages.length)];

  return (
    <div
      className={styles.root}
      style={{ ['--fx' as string]: intensity }}
      data-phase={phase}
    >
      <canvas ref={canvasRef} className={styles.matrix} aria-hidden />
      <div className={styles.scanlines} aria-hidden />
      <div className={styles.vhs} aria-hidden />

      {phase === 'cinematic' || phase === 'intro' ? (
        <div className={styles.center}>
          {flashDate ? <p className={styles.dateFlash}>{flashDate}</p> : null}
          {line ? <h1 className={styles.glitchTitle}>{line}</h1> : null}
          {sub ? <p className={styles.sub}>{sub}</p> : null}
          {typed ? <p className={styles.typewriter}>{typed}</p> : null}
          <p className={styles.terminal}>{rotMsg}</p>
        </div>
      ) : null}

      {phase === 'fake-shutdown' ? (
        <div className={styles.winShutdown}>
          <div className={styles.winLogo} aria-hidden />
          <p className={styles.winText}>Windows kapatılıyor</p>
          <div className={styles.winSpinner} aria-hidden />
          <p className={styles.winHint}>
            {Math.ceil(fakeSec * (1 - fakeProgress))} sn · Esc ile atla
          </p>
        </div>
      ) : null}

      {phase === 'aborted' ? (
        <p className={styles.escHint}>Protokol iptal edildi (Esc)</p>
      ) : null}

      {phase === 'done' ? (
        <p className={styles.escHint}>
          Senaryo bitti.{shutdownAfter ?? settings.shutdownAfterScenario ? ' Kapatma komutu gönderildi.' : ''}
        </p>
      ) : null}
    </div>
  );
}

function typeLine(text: string, set: (s: string) => void) {
  let i = 0;
  set('');
  const id = window.setInterval(() => {
    i++;
    set(text.slice(0, i));
    if (i >= text.length) clearInterval(id);
  }, 45);
}
