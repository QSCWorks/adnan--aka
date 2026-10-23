'use client';

import { useCallback, useEffect, useState } from 'react';

type AgentRow = {
  id: string;
  hostname: string;
  label: string;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
};

type Settings = {
  scenarioDurationSec: number;
  fakeShutdownDurationSec: number;
  effectIntensity: number;
  soundVolume: number;
  messages: string[];
  shutdownAfterScenario: boolean;
  youtubeUrl: string;
};

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([
      fetch('/api/admin/agents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (a?.agents) {
      setAuthed(true);
      setAgents(a.agents);
    } else setAuthed(false);
    if (s && !s.error) setSettings(s);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) {
      setPassword('');
      await load();
    } else setMsg('Parola yanlış');
  }

  async function sendCommand(agentId: string, kind: 'scenario' | 'shutdown' | 'restart') {
    setBusy(true);
    const r = await fetch('/api/admin/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, kind }),
    });
    setBusy(false);
    setMsg(r.ok ? `Komut kuyruğa alındı: ${kind}` : 'Komut gönderilemedi');
    await load();
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    const r = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setBusy(false);
    if (r.ok) {
      setSettings(await r.json());
      setMsg('Ayarlar kaydedildi');
    } else setMsg('Kaydedilemedi');
  }

  if (authed === null) {
    return <p className="p-8 text-muted">Yükleniyor…</p>;
  }

  if (!authed) {
    return (
      <form onSubmit={login} className="mx-auto mt-24 max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">20.10 İntikam Modu — Panel</h1>
        <input
          type="password"
          className="w-full rounded border border-border bg-surface px-3 py-2"
          placeholder="Parola"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-accent px-3 py-2 text-accent-fg"
        >
          Giriş
        </button>
        {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">20.10 İntikam Modu</h1>
          <p className="text-sm text-muted">REVENGE PROTOCOL — cihazlar ve gerçek kapat/yeniden başlat</p>
        </div>
        <a
          href="/play"
          target="_blank"
          rel="noopener"
          className="rounded border border-border px-3 py-2 text-sm hover:bg-surface-2"
        >
          Senaryoyu önizle
        </a>
      </header>

      {msg ? <p className="text-sm text-ok">{msg}</p> : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">Bağlı makineler</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted">Henüz agent yok — kurulum görevini onaylayıp bilgisayarı yeniden başlatın.</p>
        ) : (
          <ul className="space-y-3">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2"
              >
                <div>
                  <span
                    className={`mr-2 inline-block h-2 w-2 rounded-full ${a.online ? 'bg-ok' : 'bg-muted'}`}
                    aria-hidden
                  />
                  <span className="font-mono text-sm">{a.hostname || a.id.slice(0, 12)}</span>
                  <span className="ml-2 text-xs text-muted">{a.online ? 'Aktif' : 'Kapalı'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !a.online}
                    className="rounded bg-accent px-2 py-1 text-xs text-accent-fg disabled:opacity-40"
                    onClick={() => void sendCommand(a.id, 'scenario')}
                  >
                    İntikam senaryosu
                  </button>
                  <button
                    type="button"
                    disabled={busy || !a.online}
                    className="rounded border border-danger/40 px-2 py-1 text-xs text-danger disabled:opacity-40"
                    onClick={() => void sendCommand(a.id, 'shutdown')}
                  >
                    Gerçek kapat
                  </button>
                  <button
                    type="button"
                    disabled={busy || !a.online}
                    className="rounded border border-warn/40 px-2 py-1 text-xs text-warn disabled:opacity-40"
                    onClick={() => void sendCommand(a.id, 'restart')}
                  >
                    Yeniden başlat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {settings ? (
        <form onSubmit={saveSettings} className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="font-semibold">Senaryo ayarları</h2>
          <label className="block text-sm">
            Sinematik süre (sn)
            <input
              type="number"
              min={10}
              max={600}
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={settings.scenarioDurationSec}
              onChange={(e) =>
                setSettings({ ...settings, scenarioDurationSec: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Sahte Windows kapanış süresi (sn) — Esc ile atlanır
            <input
              type="number"
              min={5}
              max={600}
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={settings.fakeShutdownDurationSec}
              onChange={(e) =>
                setSettings({ ...settings, fakeShutdownDurationSec: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Efekt yoğunluğu
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-1 w-full"
              value={settings.effectIntensity}
              onChange={(e) => setSettings({ ...settings, effectIntensity: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            Ses seviyesi
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-1 w-full"
              value={settings.soundVolume}
              onChange={(e) => setSettings({ ...settings, soundVolume: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.shutdownAfterScenario}
              onChange={(e) => setSettings({ ...settings, shutdownAfterScenario: e.target.checked })}
            />
            Senaryo bitince gerçek kapatma (agent)
          </label>
          <label className="block text-sm">
            Mesajlar (satır başına bir)
            <textarea
              className="mt-1 min-h-[120px] w-full rounded border border-border px-2 py-1 font-mono text-xs"
              value={settings.messages.join('\n')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  messages: e.target.value.split('\n').filter((l) => l.trim()),
                })
              }
            />
          </label>
          <button type="submit" disabled={busy} className="rounded bg-accent px-4 py-2 text-accent-fg">
            Kaydet
          </button>
        </form>
      ) : null}
    </div>
  );
}
