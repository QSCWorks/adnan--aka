/** Kulak ~5 sn'de bir heartbeat gönderir; 3 kaçırılmış tur = çevrimdışı say */
export const HEARTBEAT_INTERVAL_SEC = 5;
export const ONLINE_THRESHOLD_MS = HEARTBEAT_INTERVAL_SEC * 3 * 1000 + 5000;

export function isAgentOnline(lastSeenAt: Date | null | undefined, nowMs = Date.now()): boolean {
  if (!lastSeenAt) return false;
  return nowMs - lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
}

export function secondsSinceLastSeen(lastSeenAt: Date | null | undefined, nowMs = Date.now()): number | null {
  if (!lastSeenAt) return null;
  return Math.max(0, Math.floor((nowMs - lastSeenAt.getTime()) / 1000));
}
