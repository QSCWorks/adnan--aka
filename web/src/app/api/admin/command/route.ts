import { NextResponse } from 'next/server';
import { z } from 'zod';

import { COMMAND_KINDS } from '@/lib/admin-commands';
import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

const schema = z.object({
  agentId: z.string(),
  kind: z.enum(COMMAND_KINDS),
  payload: z
    .object({
      url: z.string().url().optional(),
      message: z.string().max(500).optional(),
    })
    .optional(),
});

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

  const { agentId, kind, payload } = parsed.data;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: 'Agent bulunamadı' }, { status: 404 });
  }

  const inFlight = await prisma.command.count({
    where: { agentId, status: { in: ['pending', 'delivered'] } },
  });
  if (inFlight > 0) {
    return NextResponse.json(
      { error: 'Bu makinede sıradaki komut bitmeden yeni komut eklenemez. Birkaç saniye bekleyin.' },
      { status: 409 },
    );
  }

  await prisma.command.create({
    data: {
      agentId,
      kind,
      payload: payload ?? {},
      status: 'pending',
    },
  });

  return NextResponse.json({ ok: true });
}
