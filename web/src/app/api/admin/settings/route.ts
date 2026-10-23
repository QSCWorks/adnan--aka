import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readAdminSession } from '@/lib/admin-session';
import { mergeSettings, type RevengeSettings } from '@/lib/settings-defaults';
import { getSettings, saveSettings } from '@/lib/settings-store';

const schema = z.object({
  scenarioDurationSec: z.number().min(10).max(600).optional(),
  fakeShutdownDurationSec: z.number().min(5).max(600).optional(),
  effectIntensity: z.number().min(0).max(1).optional(),
  soundVolume: z.number().min(0).max(1).optional(),
  messages: z.array(z.string().min(1)).optional(),
  shutdownAfterScenario: z.boolean().optional(),
  youtubeUrl: z.string().url().optional(),
});

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  return NextResponse.json(await getSettings());
}

export async function POST(req: Request) {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 400 });
  }

  const current = await getSettings();
  const next: RevengeSettings = mergeSettings({ ...current, ...parsed.data });
  await saveSettings(next);
  return NextResponse.json(next);
}
