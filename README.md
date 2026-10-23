# adnan — aka (Revenge Protocol)

QSteelCAD **2.0.8.1 Halloween** için ayrı repo: Vercel paneli + Windows aracı + sinematik `/play` sayfası.

## QSteelCAD ile entegrasyon

**QSteelCAD.exe içine gömülü değil.** Bağlantı şöyle:

```
QSteelCAD 2.0.8.1 (InnoSetup\2.0.8.1_Halloween)
    → EULA/KVKK kabulü ile arka plan agent (PowerShell + oturum görevi)
    → HTTPS kalp atışı + komut alma → bu repodaki Vercel API
    → /admin panelinden senaryo / kapat / yeniden başlat
    → /play tam ekran senaryo (Edge kiosk)
```

Resmi **2.0.8** kurulumu (`InnoSetup\QSteelCAD_Setup.iss`) bu modülü **içermez** (`Yedek_2.0.8` yedeği).

## Web paneli

| Yol | Ne işe yarar |
|-----|----------------|
| `/` | Giriş — panel ve senaryo linkleri |
| `/admin` | Parola korumalı panel: makineler Aktif/Kapalı, ayarlar, komutlar |
| `/play` | 20.10 / 18.10 sinematik senaryo + sahte kapanış + YouTube |

**Canlı site:** [https://adnan-aka.vercel.app](https://adnan-aka.vercel.app) · GitHub: [QSCWorks/adnan--aka](https://github.com/QSCWorks/adnan--aka)

Ortam değişkenleri (Vercel): `DATABASE_URL`, `ADMIN_PASSWORD`, `AGENT_REGISTER_KEY`, `NEXT_PUBLIC_APP_URL`. Yerel özet: `DEPLOY_SECRETS.local.txt` (repoya gitmez).

## Yerel geliştirme

```cmd
cd web
copy .env.example .env.local
npm install
npx prisma migrate dev
npm run dev
```

## Agent

`agent/RevengeProtocolAgent.ps1` — `%ProgramData%\QSteelCAD\RevengeProtocol\config.json` okur.

## Inno Setup

`InnoSetup\2.0.8.1_Halloween\build_setup.cmd` (BadeCAD ağacında, bu repodan bağımsız yol).
