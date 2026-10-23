import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { z } from 'zod';

import { prisma } from '@/lib/db';

const bodySchema = z.object({ token: z.string() });

function finishSecret(): Uint8Array {
  const s = process.env.ADMIN_PASSWORD ?? 'dev-finish-secret';
  return new TextEncoder().encode(s);
}

/** Senaryo bitti — imzalı token ile gerçek kapatma kuyruğa alınır. */
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

  let payload: { agentId?: string; shutdown?: boolean };
  try {
    const { payload: p } = await jwtVerify(parsed.data.token, finishSecret());
    payload = p as { agentId?: string; shutdown?: boolean };
  } catch {
    return NextResponse.json({ error: 'Token geçersiz' }, { status: 403 });
  }

  if (!payload.agentId || !payload.shutdown) {
    return NextResponse.json({ ok: true, queued: false });
  }

  await prisma.command.create({
    data: {
      agentId: payload.agentId,
      kind: 'shutdown',
      payload: { force: true },
      status: 'pending',
    },
  });

  return NextResponse.json({ ok: true, queued: true });
}
