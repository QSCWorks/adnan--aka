'use client';

import { CMD_FLASH_EXTRA } from '@/lib/admin-commands';
import type { RevengeSettings } from '@/lib/settings-defaults';

import styles from './admin-panel.module.css';

export type SettingsTab = 'scenario' | 'youtube' | 'messages' | 'winAlert' | 'audio' | 'cmd';

function linesToUrls(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http'));
}

function urlsToLines(urls: string[]): string {
  return urls.join('\n');
}

export function AdminSettingsForm({
  settings,
  tab,
  setTab,
  busy,
  onPatch,
  onSave,
}: {
  settings: RevengeSettings;
  tab: SettingsTab;
  setTab: (t: SettingsTab) => void;
  busy: boolean;
  onPatch: (p: Partial<RevengeSettings>) => void;
  onSave: (e?: React.FormEvent) => void;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.tabs}>
        {(
          [
            ['scenario', 'Senaryo'],
            ['youtube', 'YouTube & link'],
            ['messages', 'Senaryo mesajları'],
            ['winAlert', 'Windows uyarı'],
            ['audio', 'Ses'],
            ['cmd', 'CMD'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <form className={styles.cardBody} onSubmit={(e) => void onSave(e)}>
        {tab === 'scenario' ? (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Senaryo süresi (sn)</span>
              <input
                type="number"
                min={10}
                max={600}
                className={styles.input}
                value={settings.scenarioDurationSec}
                onChange={(e) => onPatch({ scenarioDurationSec: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Sahte Windows kapanış (sn)</span>
              <input
                type="number"
                min={5}
                max={600}
                className={styles.input}
                value={settings.fakeShutdownDurationSec}
                onChange={(e) => onPatch({ fakeShutdownDurationSec: Number(e.target.value) })}
              />
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={settings.shutdownAfterScenario}
                onChange={(e) => onPatch({ shutdownAfterScenario: e.target.checked })}
              />
              Senaryo bitince gerçek kapatma
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Efekt yoğunluğu</span>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.effectIntensity}
                  onChange={(e) => onPatch({ effectIntensity: Number(e.target.value) })}
                />
                <span className={styles.rangeVal}>{settings.effectIntensity.toFixed(2)}</span>
              </div>
            </label>
          </>
        ) : null}

        {tab === 'youtube' ? (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ana YouTube</span>
              <input
                type="url"
                className={styles.input}
                value={settings.youtubeUrl}
                onChange={(e) => onPatch({ youtubeUrl: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Rastgele YouTube havuzu</span>
              <textarea
                className={styles.textarea}
                value={urlsToLines(settings.youtubePool)}
                onChange={(e) => onPatch({ youtubePool: linesToUrls(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Rastgele link havuzu</span>
              <textarea
                className={styles.textarea}
                value={urlsToLines(settings.linkPool)}
                onChange={(e) => onPatch({ linkPool: linesToUrls(e.target.value) })}
              />
            </label>
          </>
        ) : null}

        {tab === 'messages' ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Senaryo tam ekran mesajları</span>
            <textarea
              className={styles.textarea}
              value={settings.messages.join('\n')}
              onChange={(e) =>
                onPatch({
                  messages: e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
            />
            <span className={styles.fieldHint}>Play/senaryo ekranında dönen metinler.</span>
          </label>
        ) : null}

        {tab === 'winAlert' ? (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Windows uyarı metinleri</span>
              <textarea
                className={styles.textarea}
                value={settings.winAlertMessages.join('\n')}
                onChange={(e) =>
                  onPatch({
                    winAlertMessages: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
              />
              <span className={styles.fieldHint}>
                Satır başına bir metin. Kontrol sekmesinde özel yazmazsanız listeden rastgele seçilir; tek satır varsa
                hep o gösterilir.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Pencere süresi (sn)</span>
              <input
                type="number"
                min={3}
                max={120}
                className={styles.input}
                value={settings.flashDurationSec}
                onChange={(e) => onPatch({ flashDurationSec: Number(e.target.value) })}
              />
              <span className={styles.fieldHint}>WScript.Popup — kullanıcı Tamam ile de kapatabilir.</span>
            </label>
          </>
        ) : null}

        {tab === 'cmd' ? (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Flaş taban sayısı</span>
              <input
                type="number"
                min={3}
                max={20}
                className={styles.input}
                value={settings.cmdFlashCount}
                onChange={(e) => onPatch({ cmdFlashCount: Number(e.target.value) })}
              />
              <span className={styles.fieldHint}>
                Renkli ve renksiz CMD bu sayıya {CMD_FLASH_EXTRA} ekler. Şu an ekranda{' '}
                {settings.cmdFlashCount + CMD_FLASH_EXTRA} pencere açılır. Kaydetmeden panele yansımaz.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Renkli flaş (ms)</span>
              <input
                type="number"
                min={50}
                max={800}
                className={styles.input}
                value={settings.cmdFlashVisibleMs}
                onChange={(e) => onPatch({ cmdFlashVisibleMs: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>CMD döngü satır sayısı</span>
              <input
                type="number"
                min={10}
                max={2000}
                className={styles.input}
                value={settings.cmdLoopIterations}
                onChange={(e) => onPatch({ cmdLoopIterations: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Renksiz flaş (ms)</span>
              <input
                type="number"
                min={30}
                max={400}
                className={styles.input}
                value={settings.cmdFlashPlainMs}
                onChange={(e) => onPatch({ cmdFlashPlainMs: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>CMD satırları</span>
              <textarea
                className={styles.textarea}
                value={settings.cmdLines.join('\n')}
                onChange={(e) =>
                  onPatch({
                    cmdLines: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {tab === 'audio' ? (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Komik sesler süresi (sn)</span>
              <input
                type="number"
                min={5}
                max={600}
                className={styles.input}
                value={settings.soundsDurationSec}
                onChange={(e) => onPatch({ soundsDurationSec: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Senaryo ses yoğunluğu</span>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.soundVolume}
                  onChange={(e) => onPatch({ soundVolume: Number(e.target.value) })}
                />
                <span className={styles.rangeVal}>{settings.soundVolume.toFixed(2)}</span>
              </div>
            </label>
          </>
        ) : null}

        <div className={styles.saveBar}>
          <button type="submit" disabled={busy} className={`${styles.btn} ${styles.btnPrimary}`}>
            Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}
