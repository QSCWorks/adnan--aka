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
  'cmd_matrix',
  'cmd_bsod',
  'cmd_hack',
  'cmd_access',
  'cmd_ping',
  'cmd_disk',
  'cmd_netstat',
  'cmd_tree',
  'cmd_ipconfig',
  'cmd_ransom',
  'cmd_color_cycle',
  'cmd_quiz',
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
  confirm?: string;
  needsPayload?: 'url' | 'message';
  /** Komut arama etiketleri */
  tags?: string[];
};

export const CMD_FLASH_EXTRA = 5;

/** Panel kind → agent cmd_prank mode */
export const CMD_KIND_TO_MODE: Partial<Record<CommandKind, string>> = {
  cmd_flash: 'flash_color',
  cmd_flash_plain: 'flash_plain',
  cmd_loop: 'loop',
  cmd_chaos: 'chaos',
  cmd_matrix: 'matrix_solo',
  cmd_bsod: 'fake_bsod',
  cmd_hack: 'hack_lines',
  cmd_access: 'access_denied',
  cmd_ping: 'ping_spam',
  cmd_disk: 'disk_scan',
  cmd_netstat: 'netstat_fake',
  cmd_tree: 'tree_dump',
  cmd_ipconfig: 'ipconfig_wall',
  cmd_ransom: 'ransom_note',
  cmd_color_cycle: 'color_cycle',
  cmd_quiz: 'quiz_spam',
};

export function isCmdKind(kind: CommandKind): boolean {
  return kind in CMD_KIND_TO_MODE;
}

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
      { kind: 'scenario', label: 'Tam intikam', variant: 'primary', tags: ['senaryo', 'play'] },
      { kind: 'fake_shutdown', label: 'Sahte kapanış', variant: 'ghost', tags: ['shutdown', 'fake'] },
      { kind: 'surprise', label: 'Sürpriz', variant: 'fun', tags: ['random'] },
    ],
  },
  {
    id: 'media',
    title: 'Video & link',
    hint: 'Her link yeni bir Chrome gizli penceresidir.',
    commands: [
      { kind: 'youtube', label: 'Sabit YouTube', variant: 'ghost', tags: ['video'] },
      { kind: 'youtube_random', label: 'Rastgele YouTube', variant: 'fun', tags: ['video'] },
      { kind: 'open_random_link', label: 'Rastgele link', variant: 'fun', tags: ['url'] },
      { kind: 'open_url', label: 'Özel link', variant: 'fun', needsPayload: 'url', tags: ['url'] },
    ],
  },
  {
    id: 'audio',
    title: 'Ses & uyarı',
    hint: 'Windows uyarı metni panelden veya ayarlardan gelir.',
    commands: [
      { kind: 'sounds', label: 'Komik sesler', variant: 'ghost', tags: ['audio'] },
      { kind: 'flash', label: 'Windows uyarı', variant: 'ghost', title: 'Mesaj kutusu — en üstte', tags: ['alert'] },
    ],
  },
  {
    id: 'cmd',
    title: 'CMD — yoğun',
    hint: 'Renkli/renksiz pencereler: ayar + 5 adet, ~10 sn sayı yağmuru.',
    commands: [
      { kind: 'cmd_flash', label: 'CMD renkli', variant: 'fun', title: 'Ayar + 5 pencere' },
      { kind: 'cmd_flash_plain', label: 'CMD renksiz', variant: 'ghost' },
      { kind: 'cmd_loop', label: 'CMD döngü', variant: 'fun' },
      { kind: 'cmd_chaos', label: 'CMD kaos', variant: 'primary', title: 'Renkli + renksiz + döngü' },
      { kind: 'cmd_matrix', label: 'Tek matrix', variant: 'fun', title: 'Tek pencere 10 sn' },
      { kind: 'cmd_color_cycle', label: 'Renk döngüsü', variant: 'fun', title: 'Hızlı renk değişimi' },
    ],
  },
  {
    id: 'cmd_extra',
    title: 'CMD — sahte sistem',
    hint: 'Sahte BSOD, hack satırları, disk taraması vb. — hepsi görünür CMD (hedefe).',
    commands: [
      { kind: 'cmd_bsod', label: 'Sahte BSOD', variant: 'warn', tags: ['blue'] },
      { kind: 'cmd_hack', label: 'Hack akışı', variant: 'fun', tags: ['matrix'] },
      { kind: 'cmd_access', label: 'Erişim reddedildi', variant: 'ghost' },
      { kind: 'cmd_ping', label: 'Ping spam', variant: 'ghost' },
      { kind: 'cmd_disk', label: 'Disk tarama', variant: 'fun' },
      { kind: 'cmd_netstat', label: 'Sahte netstat', variant: 'ghost' },
      { kind: 'cmd_tree', label: 'Tree dump', variant: 'ghost' },
      { kind: 'cmd_ipconfig', label: 'IP duvarı', variant: 'ghost' },
      { kind: 'cmd_ransom', label: 'Fidye notu', variant: 'danger' },
      { kind: 'cmd_quiz', label: 'Sahte quiz', variant: 'fun' },
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

export const ALL_COMMAND_DEFS: CommandDef[] = COMMAND_GROUPS.flatMap((g) => g.commands);

export const KIND_LABEL: Record<CommandKind, string> = Object.fromEntries(
  ALL_COMMAND_DEFS.map((c) => [c.kind, c.label]),
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

export function filterCommands(query: string): CommandGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMAND_GROUPS;
  return COMMAND_GROUPS.map((g) => ({
    ...g,
    commands: g.commands.filter((c) => {
      const hay = [c.label, c.title ?? '', c.kind, ...(c.tags ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    }),
  })).filter((g) => g.commands.length > 0);
}
