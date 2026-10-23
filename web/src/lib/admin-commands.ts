/** Panel + API için tek komut kaynağı — yeni komut eklerken burayı genişletin. */

export const COMMAND_KINDS = [
  'scenario',
  'youtube',
  'youtube_random',
  'open_url',
  'open_random_link',
  'flash',
  'fake_shutdown',
  'sounds',
  'cmd_flash',
  'cmd_flash_plain',
  'cmd_loop',
  'cmd_chaos',
  'surprise',
  'shutdown',
  'restart',
] as const;

export type CommandKind = (typeof COMMAND_KINDS)[number];

export type CommandVariant = 'primary' | 'ghost' | 'fun' | 'warn' | 'danger';

export type CommandDef = {
  kind: CommandKind;
  label: string;
  title?: string;
  variant: CommandVariant;
  /** Panelde onay iste (kapat/yeniden başlat) */
  confirm?: string;
  /** Tek seferlik URL/mesaj gerektirir */
  needsPayload?: 'url' | 'message';
};

/** Renkli / renksiz CMD, paneldeki sayıya bu kadar pencere ekler. */
export const CMD_FLASH_EXTRA = 5;

export type CommandGroup = {
  id: string;
  title: string;
  hint?: string;
  commands: CommandDef[];
};

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    id: 'main',
    title: 'Ana',
    hint: 'Senaryo Chrome gizli pencerede, tam ekran açılır.',
    commands: [
      { kind: 'scenario', label: 'Tam intikam', variant: 'primary' },
      { kind: 'fake_shutdown', label: 'Sahte kapanış', variant: 'ghost' },
      { kind: 'surprise', label: 'Sürpriz', variant: 'fun' },
    ],
  },
  {
    id: 'media',
    title: 'Video & link',
    hint: 'Her link yeni bir Chrome gizli penceresidir. Internet Explorer açılmaz.',
    commands: [
      { kind: 'youtube', label: 'Sabit YouTube', variant: 'ghost' },
      { kind: 'youtube_random', label: 'Rastgele YouTube', variant: 'fun' },
      { kind: 'open_random_link', label: 'Rastgele link', variant: 'fun' },
      { kind: 'open_url', label: 'Özel link', variant: 'fun', needsPayload: 'url' },
    ],
  },
  {
    id: 'audio',
    title: 'Ses & uyarı',
    hint: 'Windows uyarı, yukarıya yazdığın metni masaüstünde gösterir.',
    commands: [
      { kind: 'sounds', label: 'Komik sesler', variant: 'ghost' },
      { kind: 'flash', label: 'Windows uyarı', variant: 'ghost', title: 'Mesaj kutusu — panel veya ayarlardan metin' },
    ],
  },
  {
    id: 'cmd',
    title: 'CMD',
    hint: 'Renkli ve renksiz pencereler, ayardaki sayı + 5 adettir.',
    commands: [
      { kind: 'cmd_flash', label: 'CMD renkli', variant: 'fun', title: 'Ayar + 5 renkli pencere' },
      { kind: 'cmd_flash_plain', label: 'CMD renksiz', variant: 'ghost', title: 'Ayar + 5 gri pencere' },
      { kind: 'cmd_loop', label: 'CMD döngü', variant: 'fun' },
      { kind: 'cmd_chaos', label: 'CMD kaos', variant: 'primary', title: 'Renkli + renksiz + döngü' },
    ],
  },
  {
    id: 'danger',
    title: 'Tehlike',
    commands: [
      {
        kind: 'shutdown',
        label: 'Kapat',
        variant: 'danger',
        confirm: 'Gerçekten kapatmak istiyor musunuz?',
      },
      {
        kind: 'restart',
        label: 'Yeniden başlat',
        variant: 'warn',
        confirm: 'Gerçekten yeniden başlatmak istiyor musunuz?',
      },
    ],
  },
];

export const KIND_LABEL: Record<CommandKind, string> = Object.fromEntries(
  COMMAND_GROUPS.flatMap((g) => g.commands.map((c) => [c.kind, c.label])),
) as Record<CommandKind, string>;

export function commandButtonLabel(
  def: CommandDef,
  settings: { cmdFlashCount?: number; cmdLoopIterations?: number } | null,
): string {
  const base = settings?.cmdFlashCount ?? 6;
  const windows = base + CMD_FLASH_EXTRA;
  if (def.kind === 'cmd_flash') return `CMD renkli · ${windows}`;
  if (def.kind === 'cmd_flash_plain') return `CMD renksiz · ${windows}`;
  if (def.kind === 'cmd_chaos') return `CMD kaos · ${windows}+${windows}`;
  if (def.kind === 'cmd_loop') return `CMD döngü · ${settings?.cmdLoopIterations ?? 200}`;
  return def.label;
}
