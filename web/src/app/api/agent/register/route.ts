import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashSecret } from '@/lib/agent-auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  agentId: z.string().min(8).max(64),
  secret: z.string().min(16).max(128),
  hostname: z.string().max(256).optional(),
  registerKey: z.string(),
});

export async function POST(req: Request) {
  const expected = process.env.AGENT_REGISTER_KEY;
  if (!expected) {
    return NextResponse.json({ error: 'Kayıt kapalı' }, { status: 503 });
  }

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
  const { agentId, secret, hostname, registerKey } = parsed.data;
  if (registerKey !== expected) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const secretHash = await hashSecret(secret);
  await prisma.agent.upsert({
    where: { id: agentId },
    create: { id: agentId, secretHash, hostname: hostname ?? '', lastSeenAt: new Date() },
    update: { secretHash, hostname: hostname ?? undefined, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
