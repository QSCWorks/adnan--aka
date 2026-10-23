import { NextResponse } from 'next/server';

import { isAgentOnline } from '@/lib/agent-online';
import { readAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const now = Date.now();
  const agents = await prisma.agent.findMany();
  const online = agents.filter((a) => isAgentOnline(a.lastSeenAt, now)).length;
  const pending = await prisma.command.count({ where: { status: 'pending' } });
  const inFlight = await prisma.command.count({ where: { status: { in: ['pending', 'delivered'] } } });
  const since = new Date(now - 24 * 60 * 60 * 1000);
  const last24h = await prisma.command.count({ where: { createdAt: { gte: since } } });

  return NextResponse.json(
    {
      agentsTotal: agents.length,
      agentsOnline: online,
      commandsPending: pending,
      commandsInFlight: inFlight,
      commandsLast24h: last24h,
      serverTime: new Date(now).toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
