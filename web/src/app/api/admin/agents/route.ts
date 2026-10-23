import { NextResponse } from 'next/server';

import { HEARTBEAT_INTERVAL_SEC, isAgentOnline, secondsSinceLastSeen } from '@/lib/agent-online';
import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({ orderBy: { lastSeenAt: 'desc' } });
  const now = Date.now();

  const ids = agents.map((a) => a.id);
  const pendingRows =
    ids.length === 0
      ? []
      : await prisma.command.groupBy({
          by: ['agentId'],
          where: { agentId: { in: ids }, status: 'pending' },
          _count: { _all: true },
        });
  const pendingByAgent = new Map(pendingRows.map((r) => [r.agentId, r._count._all]));

  return NextResponse.json(
    {
    serverTime: new Date(now).toISOString(),
    heartbeatIntervalSec: HEARTBEAT_INTERVAL_SEC,
    agents: agents.map((a) => {
      const online = isAgentOnline(a.lastSeenAt, now);
      const sec = secondsSinceLastSeen(a.lastSeenAt, now);
      return {
        id: a.id,
        hostname: a.hostname,
        label: a.label,
        lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
        secondsSinceLastSeen: sec,
        online,
        stale: sec !== null && !online && sec < 600,
        createdAt: a.createdAt.toISOString(),
        queuePending: pendingByAgent.get(a.id) ?? 0,
      };
    }),
  },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
