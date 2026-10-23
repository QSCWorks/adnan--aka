import type { RevengeSettings } from '@/lib/settings-defaults';

export function pickRandom<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function pickYoutubeUrl(settings: RevengeSettings, override?: string): string {
  if (override && override.startsWith('http')) return override;
  const pool = [settings.youtubeUrl, ...settings.youtubePool];
  const unique = [...new Set(pool.filter((u) => typeof u === 'string' && u.startsWith('http')))];
  return pickRandom(unique) ?? settings.youtubeUrl;
}

export function pickLinkUrl(settings: RevengeSettings, override?: string): string {
  if (override && override.startsWith('http')) return override;
  const pool = settings.linkPool.filter((u) => u.startsWith('http'));
  return pickRandom(pool) ?? settings.youtubeUrl;
}

export function pickFlashMessage(settings: RevengeSettings, override?: string): string {
  if (override?.trim()) return override.trim();
  const pool = settings.winAlertMessages?.length
    ? settings.winAlertMessages
    : settings.messages;
  return pickRandom(pool) ?? '20.10 UNUTULMADI.';
}

export type SurpriseKind =
  | 'youtube_random'
  | 'sounds'
  | 'flash'
  | 'open_random_link'
  | 'cmd_chaos'
  | 'cmd_bsod'
  | 'cmd_hack'
  | 'cmd_matrix';

export function pickSurpriseKind(): SurpriseKind {
  const kinds: SurpriseKind[] = [
    'youtube_random',
    'sounds',
    'flash',
    'open_random_link',
    'cmd_chaos',
    'cmd_bsod',
    'cmd_hack',
    'cmd_matrix',
  ];
  return pickRandom(kinds) ?? 'youtube_random';
}
