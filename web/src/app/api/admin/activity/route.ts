import { NextResponse } from 'next/server';

import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const rows = await prisma.command.findMany({
    take: 60,
    orderBy: { createdAt: 'desc' },
    include: { agent: { select: { hostname: true, id: true } } },
  });

  return NextResponse.json(
    {
      items: rows.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        hostname: r.agent.hostname,
        kind: r.kind,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        doneAt: r.doneAt?.toISOString() ?? null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
