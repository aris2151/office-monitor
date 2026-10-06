"use client";

export default function AIPage() {
  return (
    <div className="wrap terminal ex" style={{ maxWidth: 860 }}>
      <nav className="topnav hackbar">
        <div className="brand"><img src="/logo.png" alt="BigGet" className="logo" /><b className="neon-text">BigGet</b></div>
        <div className="navkanan">
          <a href="/" className="chatlink">📊 Monitor</a>
          <a href="/chat" className="chatlink">⚡ Chat</a>
          <a href="/bubbles" className="chatlink bubblelink">🫧 Bubbles</a>
        </div>
      </nav>

      <h2 style={{ marginBottom: 4 }}>🧠 Fungsi AI Groq di BigGet</h2>
      <div className="sub" style={{ marginBottom: 16 }}>Model: <b>openai/gpt-oss-20b</b> via Groq (gratis ±14.400 req/hari) • Temperature 0,2 (konsisten) • Bahasa Indonesia</div>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="phead">1 — OTAK KEPUTUSAN (bot/agents/brain.py)</div>
        <div className="sub" style={{ lineHeight: 1.9 }}>
          Setiap siklus &amp; tiap koin, AI memeriksa sinyal rule dengan <b>seluruh data</b>: tren EMA,
          RSI, MACD, momentum 3 candle, ATR (volatilitas), posisi dalam range-24h, pergerakan 24h CoinGecko,
          dominasi BTC, trending, sentimen Fear &amp; Greed, posisi terbuka, dan memori pelajaran.<br />
          Aturan mainnya: BELI/JUAL hanya bila <b>≥2 bukti independen</b>, waspada RSI ekstrem &amp; reversal.
          Output JSON: <code>{"aksi, confidence, alasan, poin, fase1"}</code> →
          tampil di kartu pasar (baris ungu 🧠) dan snapshot <code>alasan_otak</code>.<br />
          AI gagal/lemot/tanpa key → <b>otomatis fallback ke rule</b>, bot tidak pernah berhenti.
          Tanpa key pun sistem tetap otonom penuh.
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="phead">2 — CHAT ASISTEN (web/app/api/chat)</div>
        <div className="sub" style={{ lineHeight: 1.9 }}>
          Dibangun di atas <b>Vercel AI SDK</b> dengan <b>tool-calling</b>: AI memanggil sendiri
          <code>status_trading</code> (sinyal, harga, ekuitas, posisi, riwayat) dan
          <code>saldo_akun</code> (saldo exchange asli) saat menjawab — jadi jawabannya dari
          <b>data live</b>, bukan karangan. Streaming token-per-token, riwayat di browser,
          input suara 🎙️ gratis, key tersimpan di browser/env saja.<br />
          Contoh tanya: “sinyal BTC apa?”, “berapa ekuitas?”, “kenapa JUAL ETH?”.
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="phead">3 — ALUR DATA (ringkas)</div>
        <div className="sub" style={{ lineHeight: 1.9 }}>
          Bitget WS/REST → market → analis (EMA/RSI/MACD/ATR) → sentimen + gecko →
          <b>otak Groq</b> → risiko (veto) → eksekutor (paper) → snapshot
          → web + chat baca snapshot yang sama.<br />
          Satu-satunya yang berbayar-potensial: key Groq (gratis) &amp; Neurobro (MATI, $49/bln — tidak dipakai).
        </div>
      </section>

      <section className="panel">
        <div className="phead">4 — AKTIVASI</div>
        <div className="sub" style={{ lineHeight: 1.9 }}>
          1. Daftar key gratis di <code>console.groq.com/keys</code><br />
          2. Bot: <code>setx GROQ_API_KEY "gsk_..."</code> + config <code>"brain": "groq"</code> → restart<br />
          3. Chat: tempel key di sidebar (atau env server <code>GROQ_API_KEY</code>)<br />
          Cek status: kartu pasar tulis <code>otak: groq</code> + alasan berbahasa Indonesia.
        </div>
      </section>

      <div className="sub foot">BigGet • paper trading • bukan saran finansial</div>
    </div>
  );
}
