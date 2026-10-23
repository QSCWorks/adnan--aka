import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifySecret } from '@/lib/agent-auth';
import { prisma } from '@/lib/db';

/** Senaryo sayfası bittiğinde agent'a gerçek kapatma kuyruğa alınır. */
const bodySchema = z.object({
  agentId: z.string(),
  secret: z.string(),
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

  const { agentId, secret } = parsed.data;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || !(await verifySecret(secret, agent.secretHash))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  await prisma.command.create({
    data: { agentId, kind: 'shutdown', payload: { force: true }, status: 'pending' },
  });

  return NextResponse.json({ ok: true });
}
