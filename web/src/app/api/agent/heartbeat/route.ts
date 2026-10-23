import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifySecret } from '@/lib/agent-auth';
import { prisma } from '@/lib/db';
import { createFinishToken } from '@/lib/finish-token';
import { getSettings } from '@/lib/settings-store';

const bodySchema = z.object({
  agentId: z.string(),
  secret: z.string(),
  hostname: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 400 });
  }

  const { agentId, secret, hostname } = parsed.data;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || !(await verifySecret(secret, agent.secretHash))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { lastSeenAt: new Date(), hostname: hostname ?? agent.hostname },
  });

  const pending = await prisma.command.findFirst({
    where: { agentId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });

  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  if (!pending) {
    return NextResponse.json({ command: null, settingsSnapshot: { fakeShutdownDurationSec: settings.fakeShutdownDurationSec } });
  }

  await prisma.command.update({
    where: { id: pending.id },
    data: { status: 'delivered', doneAt: new Date() },
  });

  const payload = (pending.payload ?? {}) as Record<string, unknown>;
  if (pending.kind === 'scenario') {
    const finishToken = await createFinishToken(agentId, settings.shutdownAfterScenario);
    const q = new URLSearchParams({
      agent: agentId,
      fake: String(settings.fakeShutdownDurationSec),
      shutdown: settings.shutdownAfterScenario ? '1' : '0',
      finish: finishToken,
    });
    return NextResponse.json({
      command: {
        kind: 'scenario',
        url: `${baseUrl}/play?${q.toString()}`,
        fakeShutdownSec: settings.fakeShutdownDurationSec,
        shutdownAfter: settings.shutdownAfterScenario,
      },
      settingsSnapshot: { fakeShutdownDurationSec: settings.fakeShutdownDurationSec },
    });
  }

  return NextResponse.json({
    command: { kind: pending.kind, ...payload },
    settingsSnapshot: { fakeShutdownDurationSec: settings.fakeShutdownDurationSec },
  });
}
