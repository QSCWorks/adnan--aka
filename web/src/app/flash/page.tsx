import { FlashScreen } from './flash-screen';

export const dynamic = 'force-dynamic';

export default async function FlashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const msg = typeof sp.msg === 'string' ? sp.msg : '20.10';
  const secRaw = typeof sp.sec === 'string' ? Number.parseInt(sp.sec, 10) : 12;
  const sec = Number.isFinite(secRaw) ? Math.min(120, Math.max(3, secRaw)) : 12;
  const fxRaw = typeof sp.fx === 'string' ? Number.parseFloat(sp.fx) : 0.85;
  const fx = Number.isFinite(fxRaw) ? Math.min(1, Math.max(0, fxRaw)) : 0.85;

  return <FlashScreen message={msg} durationSec={sec} intensity={fx} />;
}
