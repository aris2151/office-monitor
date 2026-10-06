"use client";
import { useEffect, useRef, useState } from "react";

type Simbol = {
  symbol: string; harga: number; sinyal: string; sinyal_final: string;
  confidence: number; stop_loss: number | null; take_profit: number | null; gecko?: any;
};
type Data = {
  waktu: string; exchange: string; mode: string; demo?: boolean; offline?: boolean;
  simbol: Simbol[]; posisi: Record<string, any>; riwayat: any[]; portofolio?: any; akun?: any;
};

function warna(s: string) {
  return s === "BELI" ? "beli" : s === "JUAL" ? "jual" : "tahan";
}

const AGEN = ["market", "analis", "sentimen", "otak", "risiko", "eksekutor", "reporter", "portofolio", "refleksi", "notif"];

type AgenInfo = { id: string; emoji: string; nama: string; peran: string; info: (d: Data) => string };
const KARAKTER: AgenInfo[] = [
  { id: "market", emoji: "📡", nama: "Market", peran: "Pencari harga Bitget", info: (d) => d.simbol[0] ? `$${Number(d.simbol[0].harga).toLocaleString("en-US")}` : "—" },
  { id: "gecko", emoji: "🦎", nama: "Gecko", peran: "24h + trending CoinGecko", info: (d) => d.simbol[0]?.gecko ? `${(d.simbol[0].gecko.chg24 ?? 0).toFixed(2)}%/24h` : "—" },
  { id: "analis", emoji: "📊", nama: "Analis", peran: "EMA + RSI + MACD", info: (d) => d.simbol[0] ? `${d.simbol[0].sinyal} ${((d.simbol[0].confidence ?? 0) * 100).toFixed(0)}%` : "—" },
  { id: "sentimen", emoji: "📰", nama: "Sentimen", peran: "Fear & Greed", info: () => "lihat log" },
  { id: "otak", emoji: "🧠", nama: "Otak", peran: "Pengambil keputusan", info: (d) => (d.simbol[0] as any)?.otak ?? "—" },
  { id: "risiko", emoji: "🛡️", nama: "Risiko", peran: "SL/TP + rem harian", info: (d) => d.simbol[0] ? `final ${d.simbol[0].sinyal_final}` : "—" },
  { id: "eksekutor", emoji: "⚡", nama: "Eksekutor", peran: "Paper trading", info: (d) => `${Object.keys(d.posisi ?? {}).length} posisi` },
  { id: "reporter", emoji: "📝", nama: "Reporter", peran: "Log + snapshot", info: (d) => d.waktu },
  { id: "portofolio", emoji: "💰", nama: "Portofolio", peran: "Ekuitas global", info: (d) => d.portofolio?.ekuitas ? `Rp ${Number(d.portofolio.ekuitas).toLocaleString("id-ID")}` : "—" },
  { id: "refleksi", emoji: "🪞", nama: "Refleksi", peran: "Belajar tiap 5 siklus", info: () => "auto-tune" },
  { id: "notif", emoji: "🔔", nama: "Notif", peran: "Telegram BUKA/TUTUP", info: () => "siaga" },
  { id: "akun", emoji: "🏦", nama: "Akun", peran: "Saldo exchange asli", info: (d) => (d as any).akun?.terhubung ? `${(d as any).akun.saldo?.length ?? 0} koin` : "off" },
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

function bunyi(ctx: AudioContext, nada: number[], dur = 0.12) {
  nada.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    const t = ctx.currentTime + i * (dur + 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

// Grafik candle SVG (ringan, tanpa lib)
function CandleSVG({ data }: { data: number[][] }) {
  const W = 560, H = 180, P = 8;
  const c = (data ?? []).slice(-40);
  if (c.length < 2) return <div className="kosong2">Menunggu candle live…</div>;
  const hs = c.flatMap((k) => [k[2], k[3]]);
  let hi = Math.max(...hs), lo = Math.min(...hs);
  if (hi === lo) { hi *= 1.001; lo *= 0.999; }
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - P * 2);
  const bw = (W - P * 2) / c.length;
  const last = c[c.length - 1][4];
  const naikLast = last >= c[c.length - 1][1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 180 }}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} className="gridline" />
      ))}
      {c.map((k, i) => {
        const [ts, o, h, l, cl] = k;
        const naik = cl >= o;
        const x = P + i * bw + bw / 2;
        const col = naik ? "#4ade80" : "#f87171";
        return (
          <g key={ts + "-" + i}>
            <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={1.5} />
            <rect x={x - Math.max(2, bw * 0.3)} y={Math.min(y(o), y(cl))}
              width={Math.max(4, bw * 0.6)} height={Math.max(1.5, Math.abs(y(cl) - y(o)))}
              fill={col} />
          </g>
        );
      })}
      <line x1={P} x2={W - P} y1={y(last)} y2={y(last)}
        stroke={naikLast ? "#4ade80" : "#f87171"} strokeWidth={1} strokeDasharray="5 4" />
      <text x={W - P} y={y(last) - 4} className="hargalast" textAnchor="end">{last}</text>
    </svg>
  );
}

// Kurva ekuitas dari riwayat (kumulatif PnL)
function EquitySVG({ riwayat, ekuitas }: { riwayat: any[]; ekuitas?: number }) {
  const W = 560, H = 110, P = 8;
  const rp = (riwayat ?? []).map((t: any) => t.pnl ?? 0);
  if (rp.length === 0) return <div className="kosong2">Belum ada trade — kurva muncul setelah trade pertama.</div>;
  const total = rp.reduce((a, b) => a + b, 0);
  const awal = (ekuitas ?? 1000000) - total;
  const pts = [awal];
  rp.forEach((p) => pts.push(pts[pts.length - 1] + p));
  const hi = Math.max(...pts), lo = Math.min(...pts);
  const rg = hi === lo ? 1 : hi - lo;
  const X = (i: number) => P + (i / (pts.length - 1 || 1)) * (W - P * 2);
  const Y = (v: number) => P + (1 - (v - lo) / rg) * (H - P * 2);
  const line = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 110 }}>
      <polygon points={`${P},${H - P} ${line} ${X(pts.length - 1).toFixed(1)},${H - P}`}
        className={up ? "areaup" : "areadown"} />
      <polyline points={line} className={up ? "lineup" : "linedown"} />
      <text x={W - P} y={P + 10} className="hargalast" textAnchor="end">
        {total >= 0 ? "+" : ""}{total.toFixed(0)} ({(((pts[pts.length - 1] / awal - 1) * 100)).toFixed(2)}%)
      </text>
    </svg>
  );
}

export default function Page() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [live, setLive] = useState<Record<string, any>>({});
  const [lilin, setLilin] = useState<Record<string, number[][]>>({});
  const [simChart, setSimChart] = useState("BTCUSDT");
  const [suara, setSuara] = useState(false);
  const prev = useRef({ trades: 0, posisi: 0 });
  const audioRef = useRef<AudioContext | null>(null);

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
    try { if (localStorage.getItem("grok_suara") === "1") setSuara(true); } catch {}
    muat();
    const t = setInterval(muat, 15000);
    const jam = setInterval(() => setNow(Date.now()), 5000);
    const tik = setInterval(async () => {
      try {
        const r = await fetch("/api/live", { cache: "no-store" });
        const j = await r.json();
        if (j.tick) setLive(j.tick);
        if (j.candles) setLilin(j.candles);
      } catch { /* abaikan */ }
    }, 3000);
    return () => { clearInterval(t); clearInterval(jam); clearInterval(tik); };
  }, []);

  const umur = umurDetik(d?.waktu);
  // Maskot status: BERTUGAS bila data live & fresh (<5 mnt), NGANGGUR bila demo/basi/offline
  const tugas = d && !d.demo && !d.offline && umur !== null && umur < 300;
  void now;

  // Notifikasi suara: bunyi saat ada trade tutup / posisi baru (perlu toggle dulu - syarat browser)
  useEffect(() => {
    if (!suara || !d || d.demo) return;
    const nT = (d.riwayat ?? []).length;
    const nP = Object.keys(d.posisi ?? {}).length;
    if (prev.current.trades === 0) { prev.current = { trades: nT, posisi: nP }; return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioRef.current) { try { audioRef.current = new AC(); } catch { return; } }
    const ctxA = audioRef.current;
    if (ctxA.state === "suspended") ctxA.resume().catch(() => {});
    if (nT > prev.current.trades) {
      const last = d.riwayat[d.riwayat.length - 1];
      bunyi(ctxA, (last?.pnl ?? 0) >= 0 ? [660, 880] : [440, 330]); // cuan naik, rugi turun
    } else if (nP > prev.current.posisi) {
      bunyi(ctxA, [520]); // posisi baru: blip
    }
    prev.current = { trades: nT, posisi: nP };
  }, [d, suara]);

  return (
    <div className="wrap terminal">
      <nav className="topnav">
        <div className="brand"><img src="/logo.png" alt="BigGet" className="logo" /><b className="neon-text">BigGet</b> <span>bitget • {d?.mode ?? "paper"}</span></div>
        <div className="navkanan">
          {d?.portofolio?.ekuitas ? (
            <span className="chip">💰 Rp {Number(d.portofolio.ekuitas).toLocaleString("id-ID")} (
              <b className={d.portofolio.ret_pct >= 0 ? "beli" : "jual"}>{d.portofolio.ret_pct}%</b>)</span>
          ) : null}
          <span className={`badge ${d && !d.demo ? "live" : "demo"}`}>
            {d && !d.demo ? "● LIVE" : "● DEMO"}
          </span>
          <a href="/chat" className="chatlink">⚡</a>
          <a href="/bubbles" className="chatlink bubblelink">🫧</a>
          <button className={`bel ${suara ? "on" : ""}`} title="Notifikasi suara"
            onClick={() => {
              const v = !suara;
              setSuara(v);
              try { localStorage.setItem("grok_suara", v ? "1" : "0"); } catch {}
              if (v && d) prev.current = { trades: (d.riwayat ?? []).length, posisi: Object.keys(d.posisi ?? {}).length };
            }}>{suara ? "🔔" : "🔕"}</button>
        </div>
      </nav>

      {Object.keys(live).length > 0 ? (
        <div className="ticker">{Object.entries(live).map(([k, v]: any) => (
          <span key={k} className="tikit">{k.replace("USDT", "")} <b>${Number(v.harga).toLocaleString("en-US")}</b></span>
        ))}<span className="tikit live-dot">● live</span></div>
      ) : null}

      {d?.offline && <div className="err">⚠️ Laptop offline (tunnel mati?). Menampilkan data terakhir/demo. Nyalakan office + tunnel.</div>}
      {err && <div className="err">{err}</div>}

      <div className="layar">
        <div className="utama">
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
            <div className="agens">{KARAKTER.map((a) => (
              <div key={a.id} className={`agen ${tugas ? "on" : ""}`} title={`${a.nama} — ${a.peran}`}>
                <span className="aemoji">{a.emoji}</span>
                <span className="anama">{a.nama}</span>
              </div>
            ))}</div>
          </section>

          <div className="lantai" title="Lantai kantor — agen sedang patroli">
            <div className="lantai-label">🏢 LANTAI KANTOR</div>
            <div className="jalan">
              {KARAKTER.map((a, i) => (
                <span key={a.id} className={`pejalan ${tugas ? "jalan" : ""}`}
                  style={{ ["--dur" as any]: `${9 + (i % 5) * 2.4}s`, animationDelay: `${-i * 1.7}s, 0s` }}
                  title={`${a.nama} — ${a.peran}`}>{a.emoji}</span>
              ))}
            </div>
          </div>

          <h3>📈 Pasar {d?.simbol?.[0]?.gecko ? (
            <span className="sub">🌍 Dom BTC {d.simbol[0].gecko.btc_dom}% • MC 24h {d.simbol[0].gecko.mcap_chg24}% • 🔥 {(d.simbol[0].gecko.trending ?? []).slice(0, 5).join(" ")}</span>
          ) : null}</h3>
          <div className="grid pasar6">
            {(d?.simbol ?? []).map((s) => (
              <div className={`card pasar ${warna(s.sinyal_final)}`} key={s.symbol}>
                <div className="pasaratas">
                  <h2>{s.symbol.replace("USDT", "")}</h2>
                  <span className={`pilsinyal ${warna(s.sinyal_final)}`}>{s.sinyal_final}</span>
                </div>
                <div className="harga">${s.harga?.toLocaleString("en-US")} {s.gecko ? (
                  <span className={`chg ${(s.gecko.chg24 ?? 0) >= 0 ? "beli" : "jual"}`}>
                    {(s.gecko.chg24 ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(s.gecko.chg24 ?? 0).toFixed(2)}%
                  </span>) : null}</div>
                {(s as any).alasan_otak ? (
                  <div className="airow">🧠 {(s as any).alasan_otak}</div>
                ) : null}
                <div className="row"><span>Analis {((s.confidence ?? 0) * 100).toFixed(0)}%</span><b className={warna(s.sinyal)}>{s.sinyal}</b></div>
                <div className="row"><span>SL / TP</span><b>{s.stop_loss ? "$" + Number(s.stop_loss).toLocaleString("en-US") : "—"} / {s.take_profit ? "$" + Number(s.take_profit).toLocaleString("en-US") : "—"}</b></div>
              </div>
            ))}
          </div>

          <h3>🕯️ Candle Live (1m) + 📉 Ekuitas</h3>
          <div className="grid chart2">
            <div className="card">
              <div className="tabrow">{(d?.simbol ?? []).map((s) => (
                <button key={s.symbol} className={simChart === s.symbol ? "tab on" : "tab"}
                  onClick={() => setSimChart(s.symbol)}>{s.symbol.replace("USDT", "")}</button>
              ))}</div>
              <CandleSVG data={lilin[simChart] ?? []} />
            </div>
            <div className="card">
              <div className="tabrow"><span className="sub">Kurva PnL kumulatif paper</span></div>
              <EquitySVG riwayat={d?.riwayat ?? []} ekuitas={d?.portofolio?.ekuitas} />
            </div>
          </div>
        </div>

        <aside className="samping">
          <h3>📂 Posisi ({Object.keys(d?.posisi ?? {}).length})</h3>
          {Object.keys(d?.posisi ?? {}).length === 0 ? <div className="kosong2">Tidak ada posisi.</div> : (
            <div className="tabelkartu scroll"><table>
              <thead><tr><th>Simbol</th><th>Side</th><th>@</th><th>SL/TP</th></tr></thead>
              <tbody>
                {Object.entries(d!.posisi).map(([k, v]: any) => (
                  <tr key={k}><td><b>{k.replace("USDT", "")}</b> {v.leverage ? `${v.leverage}x` : ""}</td><td className={v.side === "LONG" ? "beli" : "jual"}>{v.side ?? "SPOT"}</td><td>{v.harga_beli}</td><td>{v.stop_loss}/{v.take_profit}</td></tr>
                ))}
              </tbody>
            </table></div>
          )}

          <h3>📜 Riwayat</h3>
          {(d?.riwayat ?? []).length === 0 ? <div className="kosong2">Belum ada trade.</div> : (
            <div className="tabelkartu scroll"><table>
              <tbody>
                {d!.riwayat.slice().reverse().slice(0, 8).map((r: any, i: number) => (
                  <tr key={i}><td>{r.symbol?.replace("USDT", "")}</td>
                    <td className={r.pnl >= 0 ? "beli" : "jual"}>{r.pnl_persen}%</td>
                    <td><small>{r.alasan}</small></td></tr>
                ))}
              </tbody>
            </table></div>
          )}

          <h3>🏦 Akun {d?.akun?.terhubung ? <span className="badge live mini">● {d.akun.exchange}</span> : <span className="badge demo mini">○ off</span>}</h3>
          {!d?.akun?.terhubung ? <div className="kosong2">Paper mode.</div> : (
            <div className="tabelkartu scroll"><table><tbody>
              {(d!.akun.saldo ?? []).slice(0, 6).map((s: any, i: number) => (
                <tr key={i}><td>{s.koin}</td><td>{s.total}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </aside>
      </div>

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
