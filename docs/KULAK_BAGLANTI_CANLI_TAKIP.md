# Kulak ↔ Panel canlı bağlantı — teşhis ve geliştirme rehberi

Bu belge, **QSteelCAD 2.0.8.1 Halloween** kurulumundaki **Lisans Senkron** (Revenge Protocol kulak) ile **Vercel admin paneli** arasındaki bağlantının neden “açık ama kapalı” göründüğünü açıklar ve bir AI/agent’ın kodu düzeltmesi için net görev tanımı verir.

---

## 1. Mimari (tek paragraf)

Kurulum `ProgramData\QSteelCAD\RevengeProtocol\config.json` yazar → oturum açılışında (ve kurulum sonunda) `run-agent-hidden.vbs` gizli PowerShell ile `RevengeProtocolAgent.ps1` çalıştırır → script ~5 sn’de bir `POST /api/agent/heartbeat` yapar → panel `GET /api/admin/agents` ile `lastSeenAt` okur → **~20 sn içinde sinyal yoksa çevrimdışı**.

**QSteelCAD.exe hiç açılmasa bile kulak çalışabilir.** Kulak, `QSteelCAD.exe`’den bağımsız gizli PowerShell sürecidir; yalnızca Windows oturumu açık olmalıdır (Görev Zamanlayıcı: oturum açılışı, kilit açma, 2 dk watchdog).

---

## 2. Sık kök nedenler

| Belirti | Olası neden | Kontrol |
|--------|-------------|---------|
| Panelde hiç makine yok | Register hiç olmadı / yanlış `AGENT_REGISTER_KEY` | Vercel env vs `config.json` `registerKey` |
| Makine var, sürekli kapalı | Kulak süreci yok | Görev Zamanlayıcı, `agent.log` |
| Ara sıra kapalı | Eski 90 sn eşik + 8 sn heartbeat | Güncel web + agent (5 sn, 20 sn eşik) |
| Kurulumdan sonra yok | Sadece ONLOGON, kulak başlatılmadı | Kurulum sonu `RevengeStartAgentNow` + watchdog |
| `schtasks` takılması | PowerShell `Register-ScheduledTask` / boşluklu yol | `ProgramData\...\launch.cmd` + `schtasks /TR` |

---

## 3. Dosya haritası

| Bileşen | Yol |
|--------|-----|
| Agent | `RevengeProtocol-2010/agent/RevengeProtocolAgent.ps1` |
| VBS başlatıcı | `RevengeProtocol-2010/agent/run-agent-hidden.vbs` |
| Config (hedef PC) | `%ProgramData%\QSteelCAD\RevengeProtocol\config.json` |
| Log (hedef PC) | `%ProgramData%\QSteelCAD\RevengeProtocol\agent.log` |
| Görev adları | `QSteelCAD Lisans Senkron` (ONLOGON), `QSteelCAD Lisans Senkron Oturum` (ONUNLOCK), `QSteelCAD Lisans Senkron Kontrol` (2 dk, /IT) |
| Inno include | `InnoSetup/2.0.8.1_Halloween/RevengeProtocol.iss` |
| Online eşik | `web/src/lib/agent-online.ts` |
| Agent listesi API | `web/src/app/api/admin/agents/route.ts` |
| Panel UI | `web/src/app/admin/admin-panel.tsx` |
| Prod | `https://adnan-aka.vercel.app` |

---

## 4. Hedef PC’de hızlı teşhis (PowerShell)

```powershell
Get-Content "$env:ProgramData\QSteelCAD\RevengeProtocol\config.json"
Get-Content "$env:ProgramData\QSteelCAD\RevengeProtocol\agent.log" -Tail 20
Get-ScheduledTask -TaskName "*Lisans Senkron*"
# Manuel başlatma:
Start-Process wscript.exe -ArgumentList '//B','C:\Program Files\QSteelCAD\RevengeProtocol\run-agent-hidden.vbs' -WindowStyle Hidden
```

API testi (config’teki id/secret ile):

```powershell
$cfg = Get-Content "$env:ProgramData\QSteelCAD\RevengeProtocol\config.json" | ConvertFrom-Json
Invoke-RestMethod -Method POST -Uri "$($cfg.apiUrl)/api/agent/heartbeat" -ContentType application/json -Body (@{ agentId=$cfg.agentId; secret=$cfg.secret; hostname=$env:COMPUTERNAME } | ConvertTo-Json)
```

---

## 5. AI agent’a verilecek görev prompt’u

Aşağıdaki metni olduğu gibi kopyalayın:

---

**Görev:** Revenge Protocol kulak ↔ Vercel admin panel canlı bağlantısını güvenilir yap. Kullanıcı panelde makineyi “kapalı” görüyor; kulak aslında çalışmıyor veya heartbeat güncellenmiyor.

**Kabul kriterleri:**

1. Kulak çalışırken panel **en geç ~20 sn** içinde “Çevrimiçi” göstersin; “Son sinyal: N sn önce · canlı” metni **saniyede bir** güncellensin (panel poll 3 sn).
2. Heartbeat aralığı **5 sn**; sunucu online eşiği `agent-online.ts` ile tek kaynak.
3. Agent tek örnek (global mutex); `agent.log` her başarılı/başarısız heartbeat yazar.
4. 401/403’te otomatik yeniden `register` (config’te `registerKey` varsa).
5. Kurulum: ONLOGON + ONUNLOCK görevleri + **2 dk watchdog** (`ensure-agent-running.ps1` — agent yoksa veya log eskiyse VBS başlat).
6. Kurulum bitince kulak **hemen** başlasın (`RevengeStartAgentNow`).
7. Deploy: `cd RevengeProtocol-2010/web && npx next build && vercel --prod`.
8. Halloween setup yeniden derle: `InnoSetup/2.0.8.1_Halloween/build_setup.cmd`.

**Yapma:** Resmi `InnoSetup/QSteelCAD_Setup.iss` 2.0.8’e dokunma; shutdown komutunu kullanıcının PC’sinde test etme.

**Repo kökü:** `c:\BadeCAD`

---

## 6. Vercel ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | Neon Postgres (Agent, Command, Settings) |
| `ADMIN_PASSWORD` | Panel girişi |
| `AGENT_REGISTER_KEY` | `RevengeProtocol.iss` / `config.json` `registerKey` ile **birebir aynı** |
| `NEXT_PUBLIC_APP_URL` | `https://adnan-aka.vercel.app` |

---

## 7. Sürüm notu (2026-03-23)

- Online eşik 90 sn → ~20 sn
- Panel yenileme 8 sn → 3 sn + saniye sayacı
- Agent heartbeat 8 sn → 5 sn, log + mutex + watchdog görevi
- Inno: PowerShell `[Run]` kaldırıldı; `schtasks` + anında VBS başlatma
