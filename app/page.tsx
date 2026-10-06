"use client";
import { useEffect, useState } from "react";

type Simbol = {
  symbol: string; harga: number; sinyal: string; sinyal_final: string;
  confidence: number; stop_loss: number | null; take_profit: number | null; gecko?: any;
};
type Data = {
  waktu: string; exchange: string; mode: string; demo?: boolean; offline?: boolean;
  simbol: Simbol[]; posisi: Record<string, any>; riwayat: any[]; portofolio?: any;
};

function warna(s: string) {
  return s === "BELI" ? "beli" : s === "JUAL" ? "jual" : "tahan";
}

const AGEN = ["market", "analis", "sentimen", "otak", "risiko", "eksekutor", "reporter", "portofolio", "refleksi", "notif"];

type AgenInfo = { id: string; emoji: string; nama: string; peran: string; info: (d: Data) => string };
const KARAKTER: AgenInfo[] = [
  { id: "market", emoji: "📡", nama: "Market", peran: "Pencari harga Bitget", info: (d) => d.simbol[0] ? `$${Number(d.simbol[0].harga).toLocaleString("en-US")}` : "—" },
  { id: "analis", emoji: "📊", nama: "Analis", peran: "EMA + RSI + MACD", info: (d) => d.simbol[0] ? `${d.simbol[0].sinyal} ${((d.simbol[0].confidence ?? 0) * 100).toFixed(0)}%` : "—" },
  { id: "sentimen", emoji: "📰", nama: "Sentimen", peran: "Fear & Greed", info: () => "lihat log" },
  { id: "otak", emoji: "🧠", nama: "Otak", peran: "Pengambil keputusan", info: (d) => (d.simbol[0] as any)?.otak ?? "—" },
  { id: "risiko", emoji: "🛡️", nama: "Risiko", peran: "SL/TP + rem harian", info: (d) => d.simbol[0] ? `final ${d.simbol[0].sinyal_final}` : "—" },
  { id: "eksekutor", emoji: "⚡", nama: "Eksekutor", peran: "Paper trading", info: (d) => `${Object.keys(d.posisi ?? {}).length} posisi` },
  { id: "reporter", emoji: "📝", nama: "Reporter", peran: "Log + snapshot", info: (d) => d.waktu },
  { id: "portofolio", emoji: "💰", nama: "Portofolio", peran: "Ekuitas global", info: (d) => d.portofolio?.ekuitas ? `Rp ${Number(d.portofolio.ekuitas).toLocaleString("id-ID")}` : "—" },
  { id: "refleksi", emoji: "🪞", nama: "Refleksi", peran: "Belajar tiap 5 siklus", info: () => "auto-tune" },
  { id: "notif", emoji: "🔔", nama: "Notif", peran: "Telegram BUKA/TUTUP", info: () => "siaga" },
];

function umurDetik(waktu?: string): number | null {
  if (!waktu) return null;
  const t = Date.parse(waktu.replace(" ", "T"));
  if (isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}

function fmtUmur(detik: number | null): string {
  if (detik === null) return "tidak diketahui";
  if (detik < 60) return `${detik} dtk lalu`;
  const m = Math.floor(detik / 60);
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

export default function Page() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());

  async function muat() {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      setD(await r.json());
      setErr("");
    } catch (e) {
      setErr("Gagal memuat status: " + String(e));
    }
  }
  useEffect(() => {
    muat();
    const t = setInterval(muat, 15000);
    const jam = setInterval(() => setNow(Date.now()), 5000);
    return () => { clearInterval(t); clearInterval(jam); };
  }, []);

  const umur = umurDetik(d?.waktu);
  // Maskot status: BERTUGAS bila data live & fresh (<5 mnt), NGANGGUR bila demo/basi/offline
  const tugas = d && !d.demo && !d.offline && umur !== null && umur < 300;
  void now;

  return (
    <div className="wrap">
      <nav className="topnav">
        <div className="brand">🏢 <b>Office Trading</b> <span>bitget • paper</span></div>
        <div className="navkanan">
          {d?.portofolio?.ekuitas ? (
            <span className="chip">💰 Rp {Number(d.portofolio.ekuitas).toLocaleString("id-ID")} (
              <b className={d.portofolio.ret_pct >= 0 ? "beli" : "jual"}>{d.portofolio.ret_pct}%</b>)</span>
          ) : null}
          <span className={`badge ${d && !d.demo ? "live" : "demo"}`}>
            {d && !d.demo ? "● LIVE" : "● DEMO"}
          </span>
          <a href="/chat" className="chatlink">⚡ Chat AI</a>
        </div>
      </nav>

      {d?.offline && <div className="err">⚠️ Laptop offline (tunnel mati?). Menampilkan data terakhir/demo. Nyalakan office + tunnel.</div>}
      {err && <div className="err">{err}</div>}

      <section className={`status ${tugas ? "tugas" : "nganggur"}`}>
        <div className="char">{tugas ? "🤖" : "😴"}</div>
        <div className="sinfo">
          <div className="stitle">{tugas ? "BERTUGAS" : "Nganggur"}</div>
          <div className="sub">
            {!d ? "menghubungi bot…" :
             d.demo ? "data contoh (pasang BOT_URL agar LIVE)" :
             d.offline ? "bot/tunnel mati" :
             umur === null ? "waktu data tak terbaca" :
             `update ${d.waktu} (${fmtUmur(umur)})${umur >= 300 ? " — basi! cek bot/tunnel" : ""}`}
          </div>
        </div>
      </section>

      <h3>🤖 Pasukan Agen (10)</h3>
      <div className="agens">{KARAKTER.map((a) => (
        <div key={a.id} className={`agen ${tugas ? "on" : ""}`} title={a.peran}>
          <span className="aemoji">{a.emoji}</span>
          <span className="anama">{a.nama}</span>
          <span className="ainfo">{d ? a.info(d) : "…"}</span>
        </div>
      ))}</div>

      <h3>📈 Pasar</h3>
      {d?.simbol?.[0]?.gecko ? (
        <div className="sub" style={{ marginBottom: 10 }}>
          🌍 Dominasi BTC {d.simbol[0].gecko.btc_dom}% • Kapitalisasi global 24h {d.simbol[0].gecko.mcap_chg24}% (CoinGecko)
        </div>
      ) : null}
      <div className="grid">
        {(d?.simbol ?? []).map((s) => (
          <div className={`card pasar ${warna(s.sinyal_final)}`} key={s.symbol}>
            <div className="pasaratas">
              <h2>{s.symbol}</h2>
              <span className={`pilsinyal ${warna(s.sinyal_final)}`}>{s.sinyal_final}</span>
            </div>
            <div className="harga">${s.harga?.toLocaleString("en-US")} {s.gecko ? (
              <span className={`chg ${(s.gecko.chg24 ?? 0) >= 0 ? "beli" : "jual"}`}>
                {(s.gecko.chg24 ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(s.gecko.chg24 ?? 0).toFixed(2)}%
              </span>) : null}</div>
            <div className="row"><span>Analis</span><b className={warna(s.sinyal)}>{s.sinyal} • {((s.confidence ?? 0) * 100).toFixed(0)}%</b></div>
            <div className="row"><span>Stop-loss</span><b>{s.stop_loss ? "$" + Number(s.stop_loss).toLocaleString("en-US") : "—"}</b></div>
            <div className="row"><span>Take-profit</span><b>{s.take_profit ? "$" + Number(s.take_profit).toLocaleString("en-US") : "—"}</b></div>
          </div>
        ))}
      </div>

      <h3>📂 Posisi terbuka ({Object.keys(d?.posisi ?? {}).length})</h3>
      {Object.keys(d?.posisi ?? {}).length === 0 ? <div className="kosong2">Tidak ada posisi.</div> : (
        <div className="tabelkartu"><table>
          <thead><tr><th>Simbol</th><th>Beli @</th><th>Koin</th><th>SL</th><th>TP</th></tr></thead>
          <tbody>
            {Object.entries(d!.posisi).map(([k, v]: any) => (
              <tr key={k}><td>{k}</td><td>{v.harga_beli}</td><td>{v.koin}</td><td>{v.stop_loss}</td><td>{v.take_profit}</td></tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h3>📜 Riwayat (20 terakhir)</h3>
      {(d?.riwayat ?? []).length === 0 ? <div className="kosong2">Belum ada trade tertutup.</div> : (
        <div className="tabelkartu"><table>
          <thead><tr><th>Waktu</th><th>Simbol</th><th>PnL</th><th>Alasan</th></tr></thead>
          <tbody>
            {d!.riwayat.slice().reverse().map((r: any, i: number) => (
              <tr key={i}><td>{r.waktu}</td><td>{r.symbol}</td>
                <td className={r.pnl >= 0 ? "beli" : "jual"}>{r.pnl} ({r.pnl_persen}%)</td>
                <td>{r.alasan}</td></tr>
            ))}
          </tbody>
        </table></div>
      )}

      {d?.demo && (
        <div className="panduan">
          <b>🔌 Cara sambungkan ke bot asli (gratis, 5 menit):</b><br />
          1. Di laptop: <code>python bot\snapshot_server.py</code> (lalu di terminal lain <code>python bot\office.py --loop</code>)<br />
          2. Install cloudflared, jalankan: <code>cloudflared tunnel --url http://127.0.0.1:8000</code> → dapat URL <code>https://xxx.trycloudflare.com</code><br />
          3. Di Vercel → Project → Settings → Environment Variables → tambah <code>BOT_URL=https://xxx.trycloudflare.com</code> → Redeploy.<br />
          Dashboard ini refresh otomatis tiap 15 detik. Tanpa BOT_URL tampil data demo seperti ini.
        </div>
      )}
      <div className="sub" style={{ marginTop: 24 }}>Paper trading • bukan saran finansial • refresh 15 dtk</div>
    </div>
  );
}
