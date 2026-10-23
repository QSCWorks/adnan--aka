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
};

export const DEFAULT_SETTINGS: RevengeSettings = {
  scenarioDurationSec: 25,
  fakeShutdownDurationSec: 120,
  effectIntensity: 0.85,
  soundVolume: 0.35,
  messages: [...DEFAULT_MESSAGES],
  shutdownAfterScenario: true,
  youtubeUrl: 'https://www.youtube.com/watch?v=oK6JPGFGq2w',
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
  };
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
