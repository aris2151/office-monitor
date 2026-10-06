"use client";
import { useEffect, useState } from "react";

type Simbol = {
  symbol: string; harga: number; sinyal: string; sinyal_final: string;
  confidence: number; stop_loss: number | null; take_profit: number | null;
};
type Data = {
  waktu: string; exchange: string; mode: string; demo?: boolean; offline?: boolean;
  simbol: Simbol[]; posisi: Record<string, any>; riwayat: any[]; portofolio?: any;
};

function warna(s: string) {
  return s === "BELI" ? "beli" : s === "JUAL" ? "jual" : "tahan";
}

export default function Page() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");

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
    return () => clearInterval(t);
  }, []);

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>🏢 Office Trading Monitor</h1>
          <div className="sub">10 agen • {d?.exchange ?? "…"} • mode {d?.mode ?? "…"} • update {d?.waktu ?? "…"} • <a href="/chat">⚡ Chat AI</a></div>
          {d?.portofolio?.ekuitas ? (
            <div className="sub">💰 Ekuitas Rp {Number(d.portofolio.ekuitas).toLocaleString("id-ID")} (
              <b className={d.portofolio.ret_pct >= 0 ? "beli" : "jual"}>{d.portofolio.ret_pct}%</b>
              ) • harian {d.portofolio.harian_pct}% • posisi {d.portofolio.posisi_terbuka}</div>
          ) : null}
        </div>
        <span className={`badge ${d && !d.demo ? "live" : "demo"}`}>
          {d && !d.demo ? "● LIVE" : "● DEMO"}
        </span>
      </header>

      {d?.offline && <div className="err">⚠️ Laptop offline (tunnel mati?). Menampilkan data terakhir/demo. Nyalakan office + tunnel.</div>}
      {err && <div className="err">{err}</div>}

      <div className="grid">
        {(d?.simbol ?? []).map((s) => (
          <div className="card" key={s.symbol}>
            <h2>{s.symbol}</h2>
            <div className="harga">${s.harga?.toLocaleString("en-US")}</div>
            <div className="row"><span>Sinyal analis</span><b className={warna(s.sinyal)}>{s.sinyal}</b></div>
            <div className="row"><span>Final (risiko)</span><b className={warna(s.sinyal_final)}>{s.sinyal_final}</b></div>
            <div className="row"><span>Confidence</span><b>{((s.confidence ?? 0) * 100).toFixed(0)}%</b></div>
            <div className="row"><span>Stop-loss</span><b>{s.stop_loss ? "$" + Number(s.stop_loss).toLocaleString("en-US") : "—"}</b></div>
            <div className="row"><span>Take-profit</span><b>{s.take_profit ? "$" + Number(s.take_profit).toLocaleString("en-US") : "—"}</b></div>
          </div>
        ))}
      </div>

      <h3>📂 Posisi terbuka ({Object.keys(d?.posisi ?? {}).length})</h3>
      {Object.keys(d?.posisi ?? {}).length === 0 ? <small>Tidak ada posisi.</small> : (
        <table>
          <thead><tr><th>Simbol</th><th>Beli @</th><th>Koin</th><th>SL</th><th>TP</th></tr></thead>
          <tbody>
            {Object.entries(d!.posisi).map(([k, v]: any) => (
              <tr key={k}><td>{k}</td><td>{v.harga_beli}</td><td>{v.koin}</td><td>{v.stop_loss}</td><td>{v.take_profit}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>📜 Riwayat (20 terakhir)</h3>
      {(d?.riwayat ?? []).length === 0 ? <small>Belum ada trade tertutup.</small> : (
        <table>
          <thead><tr><th>Waktu</th><th>Simbol</th><th>PnL</th><th>Alasan</th></tr></thead>
          <tbody>
            {d!.riwayat.slice().reverse().map((r: any, i: number) => (
              <tr key={i}><td>{r.waktu}</td><td>{r.symbol}</td>
                <td className={r.pnl >= 0 ? "beli" : "jual"}>{r.pnl} ({r.pnl_persen}%)</td>
                <td>{r.alasan}</td></tr>
            ))}
          </tbody>
        </table>
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
