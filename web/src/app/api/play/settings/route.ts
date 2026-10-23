import { NextResponse } from 'next/server';

import { getSettings } from '@/lib/settings-store';

/** Senaryo sayfası — herkese açık ayar özeti (gizli anahtar yok). */
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    scenarioDurationSec: s.scenarioDurationSec,
    fakeShutdownDurationSec: s.fakeShutdownDurationSec,
    effectIntensity: s.effectIntensity,
    soundVolume: s.soundVolume,
    messages: s.messages,
    youtubeUrl: s.youtubeUrl,
    shutdownAfterScenario: s.shutdownAfterScenario,
  });
}
