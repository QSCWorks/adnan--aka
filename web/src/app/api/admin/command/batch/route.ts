import { NextResponse } from 'next/server';
import { z } from 'zod';

import { COMMAND_KINDS } from '@/lib/admin-commands';
import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';
import { isAgentOnline } from '@/lib/agent-online';

const schema = z.object({
  kind: z.enum(COMMAND_KINDS),
  payload: z
    .object({
      url: z.string().url().optional(),
      message: z.string().max(500).optional(),
    })
    .optional(),
  target: z.enum(['selected', 'all_online']),
  agentIds: z.array(z.string()).optional(),
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

  const { kind, payload, target, agentIds } = parsed.data;
  const now = Date.now();
  let ids: string[] = [];

  if (target === 'all_online') {
    const agents = await prisma.agent.findMany();
    ids = agents.filter((a) => isAgentOnline(a.lastSeenAt, now)).map((a) => a.id);
  } else {
    ids = agentIds ?? [];
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Hedef kulak yok' }, { status: 400 });
  }

  const queued: string[] = [];
  const skipped: string[] = [];

  for (const agentId of ids) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      skipped.push(agentId);
      continue;
    }
    const inFlight = await prisma.command.count({
      where: { agentId, status: { in: ['pending', 'delivered'] } },
    });
    if (inFlight > 0) {
      skipped.push(agentId);
      continue;
    }
    await prisma.command.create({
      data: { agentId, kind, payload: payload ?? {}, status: 'pending' },
    });
    queued.push(agentId);
  }

  return NextResponse.json({ ok: true, queued: queued.length, skipped: skipped.length });
}
