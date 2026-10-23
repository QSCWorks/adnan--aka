import { RevengeTheater } from './revenge-theater';
import { DEFAULT_SETTINGS, mergeSettings } from '@/lib/settings-defaults';
import { getSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  let settings = DEFAULT_SETTINGS;
  try {
    settings = await getSettings();
  } catch {
    settings = mergeSettings(null);
  }

  const fakeRaw = sp.fake;
  const fakeOverrideSec =
    typeof fakeRaw === 'string' ? Number.parseInt(fakeRaw, 10) : undefined;
  const finish = typeof sp.finish === 'string' ? sp.finish : undefined;
  const shutdown = sp.shutdown === '1';

  return (
    <RevengeTheater
      settings={settings}
      fakeOverrideSec={Number.isFinite(fakeOverrideSec) ? fakeOverrideSec : undefined}
      finishToken={finish}
      shutdownAfter={shutdown}
    />
  );
}
