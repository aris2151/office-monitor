"use client";
import { useEffect, useState } from "react";

type Koin = { id: string; symbol: string; nama: string; harga: number; mcap: number; chg24: number };

export default function Bubbles() {
  const [koin, setKoin] = useState<Koin[]>([]);
  const [waktu, setWaktu] = useState("");
  const [err, setErr] = useState("");

  async function muat() {
    try {
      const r = await fetch("/api/bubbles", { cache: "no-store" });
      const j = await r.json();
      if (j.error && !j.koin?.length) throw new Error(j.error);
      setKoin(j.koin ?? []);
      setWaktu(j.waktu ?? "");
      setErr("");
    } catch (e) {
      setErr("Gagal memuat: " + String(e));
    }
  }
  useEffect(() => {
    muat();
    const t = setInterval(muat, 60000);
    return () => clearInterval(t);
  }, []);

  const maks = Math.max(...koin.map((k) => k.mcap ?? 0), 1);
  const ukuran = (m: number) => 44 + Math.sqrt((m ?? 0) / maks) * 120;

  return (
    <div className="wrap">
      <nav className="topnav">
        <div className="brand">🫧 <b>Crypto Bubble</b> <span>top 50 market cap</span></div>
        <div className="navkanan">
          <a href="/" className="chatlink">📊 Monitor</a>
        </div>
      </nav>
      <div className="sub">Ukuran = market cap • 🟢 naik 24h / 🔴 turun 24h • update tiap 1 mnt (CoinGecko)</div>
      {err && <div className="err">{err}</div>}
      <div className="bubbles">
        {koin.map((k) => {
          const naik = (k.chg24 ?? 0) >= 0;
          const s = ukuran(k.mcap);
          return (
            <div key={k.id} className={`bubble ${naik ? "naik" : "turun"}`}
              style={{ width: s, height: s }} title={`${k.nama}: $${k.harga} (${k.chg24?.toFixed(2)}%/24h)`}>
              <b>{k.symbol}</b>
              <span>{naik ? "▲" : "▼"} {Math.abs(k.chg24 ?? 0).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
      <div className="sub" style={{ marginTop: 16 }}>Sumber: CoinGecko (gratis) • bukan saran finansial</div>
    </div>
  );
}
