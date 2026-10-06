# CATATAN PROYEK — Office Trading Bot Otonom
Terakhir diperbarui: 6 Okt 2026 ~05:00 (UTC+7). Bahasa: Indonesia.

## 0. STATUS TERAKHIR (audit mendalam 01:45, tunnel ganti)
- Tunnel URL aktif: `https://youth-programs-benz-fellow.trycloudflare.com` (berubah tiap restart!)
- Bot loop, snapshot, web: HIDUP ✅ (10 jam nonstop, 299 siklus, paper).
- Tunnel URL aktif: `https://bird-substitute-mentioned-steel.trycloudflare.com` (berubah tiap restart!)
- Framework-2: gate conf ≥75%, SL=1.5*ATR, TP=2*SL, sizing 2% equity, S/R di konteks, veto SHORT juga.
  Backtest: rugi terpangkas 70-80% tapi MASIH MERAH semua. Lev1x, paper terus, 5 SHORT lama terbuka.
- BUG BESAR DIPERBAIKI: API kirim candles TERTUA-dulu, kode me-reverse -> SEMUA indikator (EMA/RSI/MACD)
  dihitung TERBALIK WAKTU sejak awal! Bukti: RSI 7 (palsu) -> sekarang 54-65 (masuk akal).
- Backtest JUJUR (urutan benar): 8 hari semua merah (-24% s/d -52% @3x); 41 hari BTC merah semua varian;
  lev 1x: -3.26% (sinyal sedikit negatif, leverage yang membunuh). Tuning parameter TIDAK menyelamatkan.
- TINDAKAN: leverage 3x -> 1x (hentikan pendarahan). Paper terus. 5 SHORT lama masih terbuka.
- Strategi 1H EMA tidak ada edge di rezim ini. Riset lanjut: filter tren 4H / strategi mean-reversion.
  JANGAN uang asli sampai backtest hijau.
- Vercel: BELUM deploy. Token PAT: BELUM direvoke.
- Konsensus framework PENUH: N (narrative LLM) + L (orderbook asli, BTC=100) + V (risk veto) + action + size + TP + RR, tampil di kartu. Dashboard = exchange bersih. Tunnel: `https://sit-attraction-guards-lecture.trycloudflare.com`. 5 SHORT terbuka, lev1x, paper-only.

## 0c. TAHAP-1 SCALPING (7 Okt ~02:50): GERBANG MERAH, 2 KANTONG HIJAU KECIL
- Data: 8799 candle 5m x6 pair (6 Sep-6 Okt) + 4H, monoton, candle tak-lengkap dibuang.
- Biaya jujur: taker 0.06%/sisi + spread terukur x2 (13-21 bps/trade). Entry/exit di OPEN berikut.
- Grid 24 kombinasi (SL/TP, 4H on/off, trailing, sisi dua/long/short). File: bot/backtest_scalp.py.
- HASIL: 4/6 pair MERAH semua varian (BTC -5.3, SOL -3.5, WIF -2.5, DOGE ~0).
  HIJAU KECIL: ETH short-only +1.99% (PF 1.51, n=18, DD 2.1), PEPE long-only +0.49% (PF 1.09, n=25).
  n kecil = belum bukti kuat, risiko overfit. TEMUAN: arah regime penentu; filter 4H bantu ETH, rugikan PEPE.
- GERBANG GAGAL -> tidak bangun scalper.py dulu. Opsi: validasi 90 hari + uji mean-reversion. Tunggu putusan user.
1. Tunnel MATI DIAM-DIAM (proses hidup, koneksi putus, publik 000). Perbaikan: restart tunnel +
   protokol: selalu cek PUBLIK HTTP (bukan cuma proses) tiap audit. Quick tunnel memang tidak stabil >12 jam.
2. File PAT GitHub di OneDrive (tersinkron!) DIHAPUS. Revoke online TETAP WAJIB (file hilang != token mati).
3. Config kurang `max_sinyal_umur_detik` (pakai default diam-diam) -> DITAMBAHKAN eksplisit 7200.
4. Teks "3 jendela" di START-SEMUA salah (sudah 5) -> diperbaiki.
5. venv: idna WAJIB ada (dep requests) - jangan diutak-atik lagi. Daftar final: requests, websocket-client, idna, certifi, urllib3, charset-normalizer + pip/setuptools.
6. Log consistent: file UTF-8 bersih (� hanya artefak console cp1252, bukan data rusak).
7. Ledger tanpa key `harian` + memory tanpa pelajaran = NORMAL (belum ada trade tutup).
8. Git bersih, snapshot lengkap, env+key ada, records jurnal jalan, live.json 6 pair x 60 candles.
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
