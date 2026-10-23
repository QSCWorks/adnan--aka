import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

const schema = z.object({
  agentId: z.string(),
  kind: z.enum(['scenario', 'shutdown', 'restart']),
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

  const { agentId, kind } = parsed.data;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: 'Agent bulunamadı' }, { status: 404 });
  }

  await prisma.command.create({
    data: {
      agentId,
      kind,
      payload: kind === 'shutdown' || kind === 'restart' ? { force: true } : {},
      status: 'pending',
    },
  });

  return NextResponse.json({ ok: true });
}
