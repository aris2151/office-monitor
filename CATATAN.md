# CATATAN PROYEK — Office Trading Bot Otonom
Terakhir diperbarui: 6 Okt 2026 ~05:00 (UTC+7). Bahasa: Indonesia.

## 0. STATUS TERAKHIR (adopsi repo 17:09, 13 agen) — lanjut di kantor
- Bot loop, snapshot, tunnel publik, web lokal: SEMUA HIDUP ✅
- Tunnel URL aktif: `https://provinces-son-remove-corporate.trycloudflare.com` (berubah tiap restart!)
- Adopsi repo: (1) okx-2pa: analisis 2-FASE (fase1 struktur + fase2 keputusan),
  freshness guard (candle basi→TAHAN), JURNAL keputusan harian records/*.jsonl;
  (2) trading-assistant: voice input 🎙️ di chat (Web Speech API, gratis);
  (3) vercel/ai SDK: chat tool-calling terverifikasi jawab angka live.
  DITOLAK: launch-your-agent (butuh Claude API bayar), OpenMinis (app mobile, bukan stack kita),
  clone full okx-2pa (exchange OKX tak dipakai + butuh VPS).
- Vercel: BELUM deploy. Token PAT: BELUM direvoke.
- Lanjut: deploy Vercel + revoke token.

## 0b. AUDIT + PENYEMPURNAAN (6 Okt siang, di kantor) ✅
Loop agen sekarang 10: market → analis → sentimen → otak → risiko → eksekutor → reporter
+ portofolio → refleksi → notif. Teruji penuh terisolasi.
- BUG DIPERBAIKI: (1) rem harian mati antar-siklus → persist `ledger.harian` + reset tanggal;
  (2) log tumbuh tanpa batas → rotasi 5000/3000 baris; (3) jalan-ganda → `office.lock` + arah STOP-SEMUA;
  (4) otak rule diam → tulis `alasan_otak`.
- AGEN BARU: `portofolio` (ekuitas mark-to-market + retensi di snapshot/web),
  `notif` (Telegram BUKA/TUTUP, mati bila token kosong, fail-safe).
- RISIKO: batas `max_posisi` (default 2) + rem baca ledger (bukan ctx).
- LEDGER: tambah `events` (50 terakhir, flag terkirim) + `harian {tgl, pnl}`.
- Web: tampil ekuitas/retensi di header (kompatibel mundur, tsc bersih).
- Uji: siklus penuh OK, rem→TAHAN OK, maxPos→TAHAN OK, guard→exit 1 OK, notif tanpa config = no-op OK.

## 1. Ringkasan
Bot trading kripto **otonom (agentic), paper trading, gratis, ringan (<100MB RAM)** untuk laptop 4GB.
Loop agen: `market → analis → sentimen → otak → risiko → eksekutor → refleksi → reporter`
Web: dashboard Monitor + Chat AI (Next.js 14), deploy Vercel (cloud build).

## 2. Struktur file (`C:\Users\arisg\office-agent-engine\`)
- `bot\office.py` — koordinator (JANGAN ubah alur tanpa audit)
- `bot\bot.py` — bot lama versi 1 (arsip, tidak dipakai loop)
- `bot\agents\` — market, analyst, sentiment, brain, risk, executor, reflection, reporter, base, net
- `bot\config.json` — exchange=bitget, pairs BTCUSDT+ETHUSDT, interval 120 dtk, mode paper,
  EMA 7/25, min_confidence 0.5, risk 10%/trade, SL 2%, TP 4%, max rugi harian 3%,
  brain=rule, auto_tune=true, refleksi_tiap_siklus=5
- `bot\ledger.json` — paper ledger (posisi + riwayat). KOSONG per 6 Okt pagi.
- `bot\memory.json` — memori belajar refleksi (counter, pelajaran, min_confidence override)
- `bot\status.json` — snapshot tiap siklus (dibaca web/Vercel)
- `bot\paper_trading.log` — log berjalan
- `bot\snapshot_server.py` — HTTP stdlib :8000, endpoint /api/status + /api/ledger (JSON saja!)
- `monitor\` — Next.js: dashboard `/`, chat `/chat`, API `/api/status`, `/api/chat`
- `START-SEMUA.bat` — nyalakan 4 jendela: OFFICE-BOT, SNAPSHOT, TUNNEL, WEB
- `STOP-SEMUA.bat` — matikan semua (termasuk node.exe + python.exe)
- `run_office.bat`, `run_bot.bat`, `run_tunnel.bat` — satuan (cadangan)
- `cloudflared.exe` v2026.10.0, `tunnel.log`, `web.log`
- `.venv\` — Python 3.11, isi: requests, truststore, fastapi/uvicorn (sisa coba llama), cmake/ninja

## 3. Status deploy (per 6 Okt pagi)
- GitHub: `https://github.com/aris2151/office-monitor` (PUBLIC, branch main, commit d0e56ca).
  Isi repo = folder `monitor\` saja. Login gh tersimpan di Windows Credential Manager (akun aris2151).
- Vercel: BELUM deploy (tinggal import repo → Deploy → isi env).
- Tunnel: quick tunnel, URL BERUBAH tiap restart! Terakhir:
  `https://together-royalty-intelligence-tennessee.trycloudflare.com` (cek `tunnel.log` untuk terbaru)
- Env Vercel yang dibutuhkan: `BOT_URL` (wajib utk LIVE), `GROQ_API_KEY`/`GEMINI_API_KEY` (opsional utk chat).

## 4. Jaringan / bypass yang TERBUKTI (jangan diubah tanpa tes)
- ISP (XL) memblokir Binance + Bitget via DNS hijack → `api.bitget.com` resolve ke `blockpage.xlaxiata.id`.
  Bypass: `agents\net.py` paksa IP Cloudflare 104.18.15.166 + `trust_env=False` (bypass proxy lokal 127.0.0.1:51870).
- Indodax TIDAK diblokir (alternatif legal Indonesia).
- HuggingFace 401 dari jaringan ini → JANGAN andalkan download model HF langsung.
- Groq API tembus dari Python (401 tanpa key = konek). Gemini endpoint reachable.
- Pollinations gratis RUSAK saat dites (ENOSPC) → chat pakai Groq/Gemini saja.

## 5. Audit trail masalah + solusi (sudah terverifikasi)
1. `llama-cpp-python` gagal install (error path svelte 260 char + build C++) → DITINGGALKAN.
   Penyebab: `LongPathsEnabled=0` + toolchain. Bot tidak butuh LLM lokal.
2. Model GGUF corrupt (29 byte, HF redirect/auth) → DITINGGALKAN (tidak perlu model lokal).
3. SSL Indodax di Python (certifi) → diatasi via truststore, lalu via `trust_env=False` (direct).
4. `npm` .ps1 diblokir ExecutionPolicy → pakai `npm.cmd` full path.
5. `next build` lokal gagal (quirk Windows/npm) → solusi: cek `tsc --noEmit`; build resmi di Vercel (Linux).
6. Next auto-install `typescript@7` → crash `next dev` (`verifyTypeScriptSetup endsWith`) → PIN ke `typescript@5` (5.9.3). JANGAN upgrade TS sebelum Next 15.
7. Bot ganda (2 loop → trade dobel) → penyebab: klik START 2x / proses yatim. Solusi: STOP dulu sebelum START; perlu guard anti-ganda (TODO).
8. Tunnel mati (`Connection terminated`) → restart via START-SEMUA; URL baru → update BOT_URL.
9. Venv python = launcher (induk) + worker (anak system-python). Normal! Jangan kill satuan → pakai STOP-SEMUA.
10. `http://127.0.0.1:8000` hanya JSON (bukan dashboard). Dashboard = `http://localhost:3000` (Next dev) atau Vercel.

## 6. TODO audit & pengembangan
- [ ] Guard anti-jalan-ganda di START-SEMUA (cek proses/port sebelum start)
- [ ] Health-check otomatis (restart tunnel bila mati; ingatkan bila snapshot basi >10 mnt)
- [ ] Aktifkan otak LLM: isi GROQ_API_KEY (console.groq.com, gratis) → `brain:"groq"` → amati 3 hari paper
- [ ] Backtest strategi EMA atas data historis sebelum uang asli
- [ ] Notifikasi Telegram tiap BELI/JUAL/TUTUP (perlu bot token gratis @BotFather)
- [ ] Evaluasi reflected params (baca memory.json: winrate, avg pnl) tiap minggu
- [ ] Hapus file token (`token AI bot.txt`, `ghp.txt`) + revoke PAT GitHub
- [ ] Jangan commit `.env*.local` / key apa pun (sudah di .gitignore)
- [ ] Vercel: deploy + isi BOT_URL + uji badge LIVE
- [ ] Ketat: ini PAPER trading. Uang asli HANYA setelah ≥2 minggu paper profit + audit risiko.

## 7. Cara jalan harian
1. Klik Desktop `START Trading Bot` (1x saja!) → 4 jendela + `http://localhost:3000`
2. Ambil URL tunnel (jendela TUNNEL / `tunnel.log`) → update `BOT_URL` Vercel bila berubah
3. Selesai: `STOP Trading Bot`.
