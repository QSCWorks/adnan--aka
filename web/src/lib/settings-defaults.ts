export const DEFAULT_MESSAGES = [
  '20.10 UNUTULMADI.',
  '18.10 HÂLÂ HATIRLANIYOR.',
  'BAZI HESAPLAR ASLA KAPANMAZ.',
  "KAÇABİLİRSİN AMA GLITCH'TEN SAKLANAMAZSIN.",
  'İNTİKAM SOĞUK YENEN BİR YEMEKTİR.',
  'HESAP KAPANDI... ŞİMDİLİK.',
  'BU DAHA BAŞLANGIÇ. :)',
] as const;

export type RevengeSettings = {
  /** Senaryo toplam süresi (sn) — panelden */
  scenarioDurationSec: number;
  /** Sahte Windows kapanış ekranı süresi (sn) — Esc ile erken çıkılabilir */
  fakeShutdownDurationSec: number;
  /** 0–1 efekt yoğunluğu */
  effectIntensity: number;
  /** 0–1 ses (isteğe bağlı) */
  soundVolume: number;
  messages: string[];
  /** Senaryo bitince gerçek kapatma */
  shutdownAfterScenario: boolean;
  /** Sahte kapanış bitince YouTube */
  youtubeUrl: string;
  /** "Komik sesler" komutu süresi (sn) — arka planda, senaryo yok */
  soundsDurationSec: number;
  /** Rastgele YouTube havuzu (ana URL hariç ek videolar) */
  youtubePool: string[];
  /** Rastgele açılacak linkler (haber, arama, site vb.) */
  linkPool: string[];
  /** Windows uyarı (WScript.Popup) metinleri — satır başına bir */
  winAlertMessages: string[];
  /** Tam ekran flaş / Windows uyarı süresi (sn) */
  flashDurationSec: number;
  /** Hızlı açılıp kapanan CMD penceresi sayısı */
  cmdFlashCount: number;
  /** Her CMD flaş penceresinin ekranda kalma süresi (ms) */
  cmdFlashVisibleMs: number;
  /** CMD döngü satır sayısı (sonra pencere kapanır) */
  cmdLoopIterations: number;
  /** Renksiz CMD flaş görünürlük (ms) — daha hızlı */
  cmdFlashPlainMs: number;
  /** CMD pencerelerinde görünen satırlar */
  cmdLines: string[];
};

export const DEFAULT_YOUTUBE_POOL = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=ZZ5LpwO-An4',
] as const;

export const DEFAULT_CMD_LINES = [
  '20.10 UNUTULMADI.',
  '18.10 LOG BULUNDU...',
  'QSteelCAD INTEGRITY: FAIL',
  'DECRYPTING REVENGE_PROTOCOL...',
  'ACCESS DENIED — TEKRAR DENE',
  'uploading memories.exe',
  'WHO WATCHES THE WATCHMEN?',
  'rm -rf / — just kidding',
  'INTIKAM MODU: AKTIF',
] as const;

export const DEFAULT_LINK_POOL = [
  'https://www.youtube.com/feed/trending',
  'https://www.google.com/search?q=20+ekim',
  'https://www.google.com/search?q=QSteelCAD',
  'https://tr.wikipedia.org/wiki/Special:Random',
] as const;

export const DEFAULT_SETTINGS: RevengeSettings = {
  scenarioDurationSec: 25,
  fakeShutdownDurationSec: 120,
  effectIntensity: 0.85,
  soundVolume: 0.35,
  messages: [...DEFAULT_MESSAGES],
  shutdownAfterScenario: true,
  youtubeUrl: 'https://www.youtube.com/watch?v=oK6JPGFGq2w',
  soundsDurationSec: 90,
  youtubePool: [...DEFAULT_YOUTUBE_POOL],
  linkPool: [...DEFAULT_LINK_POOL],
  winAlertMessages: [
    '20.10 UNUTULMADI.',
    'Sistem bütünlüğü doğrulanamadı.',
    'QSteelCAD: beklenmeyen oturum etkinliği.',
  ],
  flashDurationSec: 12,
  cmdFlashCount: 6,
  cmdFlashVisibleMs: 140,
  cmdLoopIterations: 200,
  cmdFlashPlainMs: 70,
  cmdLines: [...DEFAULT_CMD_LINES],
};

export function mergeSettings(raw: unknown): RevengeSettings {
  const base = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    scenarioDurationSec: num(o.scenarioDurationSec, base.scenarioDurationSec, 10, 600),
    fakeShutdownDurationSec: num(o.fakeShutdownDurationSec, base.fakeShutdownDurationSec, 5, 600),
    effectIntensity: num(o.effectIntensity, base.effectIntensity, 0, 1),
    soundVolume: num(o.soundVolume, base.soundVolume, 0, 1),
    messages: arrStrings(o.messages, base.messages),
    shutdownAfterScenario: typeof o.shutdownAfterScenario === 'boolean' ? o.shutdownAfterScenario : base.shutdownAfterScenario,
    youtubeUrl: typeof o.youtubeUrl === 'string' && o.youtubeUrl.startsWith('http') ? o.youtubeUrl : base.youtubeUrl,
    soundsDurationSec: num(o.soundsDurationSec, base.soundsDurationSec, 5, 600),
    youtubePool: arrUrls(o.youtubePool, base.youtubePool),
    linkPool: arrUrls(o.linkPool, base.linkPool),
    winAlertMessages: arrStrings(o.winAlertMessages, base.winAlertMessages),
    flashDurationSec: num(o.flashDurationSec, base.flashDurationSec, 3, 120),
    cmdFlashCount: num(o.cmdFlashCount, base.cmdFlashCount, 3, 20),
    cmdFlashVisibleMs: num(o.cmdFlashVisibleMs, base.cmdFlashVisibleMs, 50, 800),
    cmdLoopIterations: num(o.cmdLoopIterations, base.cmdLoopIterations, 10, 2000),
    cmdFlashPlainMs: num(o.cmdFlashPlainMs, base.cmdFlashPlainMs, 30, 400),
    cmdLines: arrStrings(o.cmdLines, base.cmdLines),
  };
}

function arrUrls(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().startsWith('http'));
  return out.length ? out : fallback;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function arrStrings(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length ? out : fallback;
}
