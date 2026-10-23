import { NextResponse } from 'next/server';

import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

const ONLINE_MS = 90_000;

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({ orderBy: { lastSeenAt: 'desc' } });
  const now = Date.now();

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      hostname: a.hostname,
      label: a.label,
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
      online: a.lastSeenAt ? now - a.lastSeenAt.getTime() < ONLINE_MS : false,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
