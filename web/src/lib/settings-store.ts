import { prisma } from './db';
import { DEFAULT_SETTINGS, mergeSettings, type RevengeSettings } from './settings-defaults';

export async function getSettings(): Promise<RevengeSettings> {
  const row = await prisma.settings.findUnique({ where: { id: 'global' } });
  if (!row) return DEFAULT_SETTINGS;
  return mergeSettings(row.data);
}

export async function saveSettings(data: RevengeSettings): Promise<void> {
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: { id: 'global', data: data as object },
    update: { data: data as object },
  });
}
