# Deploy ke Vercel (gratis)

Web ini ada 2 halaman: `📊 Monitor` (trading) + `⚡ Chat AI` (GrokLite).

## 1. Push folder `monitor` ke GitHub
```powershell
cd C:\Users\arisg\office-agent-engine\monitor
git init; git add .; git commit -m "office trading monitor + chat"
git branch -M main
# buat repo baru di github.com/new (mis. office-monitor), lalu:
git remote add origin https://github.com/USERNAME/office-monitor.git
git push -u origin main
```
> Kalau `git push` minta login: pakai username + Personal Access Token
> (github.com → Settings → Developer settings → Tokens). Bukan password.

## 2. Import ke Vercel
1. Buka vercel.com → Add New → Project → pilih repo `office-monitor`
2. Framework otomatis terdeteksi (Next.js). Root Directory = `./`
3. Deploy → dapat URL `https://office-monitor.vercel.app`

## 3. Env vars (Vercel → Settings → Environment Variables → Redeploy)
| Key | Isi | Efek |
|---|---|---|
| `BOT_URL` | `https://xxx.trycloudflare.com` | Dashboard LIVE (tanpa ini = DEMO) |
| `GROQ_API_KEY` | `gsk_...` (opsional) | Chat jalan tanpa input key |
| `GEMINI_API_KEY` | `AIza...` (opsional) | Alternatif chat |

Tanpa key server pun chat tetap bisa: tiap user input key sendiri di sidebar
(tersimpan di localStorage browser, tidak dikirim ke mana-mana selain API provider).

## 4. Sambungkan ke bot laptop (agar Monitor LIVE, bukan DEMO)
Di laptop (2 terminal):
```powershell
# terminal 1 - bot jalan 24 jam
C:\Users\arisg\office-agent-engine\run_office.bat
# terminal 2 - sajikan snapshot
C:\Users\arisg\office-agent-engine\.venv\Scripts\python.exe C:\Users\arisg\office-agent-engine\bot\snapshot_server.py
```
Install cloudflared (gratis): https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```powershell
cloudflared tunnel --url http://127.0.0.1:8000
# -> catat URL mis. https://acak-xyz.trycloudflare.com -> isi ke BOT_URL
```

## Catatan
- URL trycloudflare berubah tiap restart cloudflared → update BOT_URL + Redeploy.
- Tanpa BOT_URL dashboard tetap jalan dengan data DEMO.
- Jangan taruh API key di repo (sudah di-ignore via `.gitignore`). Paper trading tidak butuh key.
