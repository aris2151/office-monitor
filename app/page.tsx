"use client";
import { useEffect, useRef, useState } from "react";

type Data = {
  waktu: string; exchange: string; mode: string; trade_type?: string; leverage?: number;
  max_posisi?: number; max_rugi_harian?: number;
  demo?: boolean; offline?: boolean; simbol: any[]; posisi: Record<string, any>;
  riwayat: any[]; portofolio?: any; akun?: any; events?: any[];
};

function umurDetik(waktu?: string): number | null {
  if (!waktu) return null;
  const t = Date.parse(waktu.replace(" ", "T"));
  if (isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}
function fmtUmur(detik: number | null): string {
  if (detik === null) return "--";
  if (detik < 60) return `${detik} dtk`;
  const m = Math.floor(detik / 60);
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} jam`;
}
function fmtIDR(n: any): string {
  const v = Number(n ?? 0);
  return "Rp " + v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}
function fmtUSD(n: any, d = 2): string {
  const v = Number(n ?? 0);
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: Math.min(2, d) });
}

// Candle chart SVG
function CandleSVG({ data }: { data: number[][] }) {
  const W = 720, H = 300, P = 8;
  const c = (data ?? []).slice(-60);
  if (c.length < 2) return <div className="kosong2">Menunggu candle live…</div>;
  const hs = c.flatMap((k) => [k[2], k[3]]);
  let hi = Math.max(...hs), lo = Math.min(...hs);
  if (hi === lo) { hi *= 1.001; lo *= 0.999; }
  const y = (v: number) => P + 18 + (1 - (v - lo) / (hi - lo)) * (H - P * 2 - 18);
  const bw = (W - P * 2) / c.length;
  const last = c[c.length - 1][4];
  const naikLast = last >= c[c.length - 1][1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 300 }}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} className="gridline" />
      ))}
      {c.map((k, i) => {
        const [ts, o, h, l, cl] = k;
        const naik = cl >= o;
        const x = P + i * bw + bw / 2;
        const col = naik ? "#0ecb81" : "#f6465d";
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
        stroke={naikLast ? "#0ecb81" : "#f6465d"} strokeWidth={1} strokeDasharray="5 4" />
      <text x={W - P} y={Math.max(12, y(last) - 4)} className="hargalast" textAnchor="end">{last}</text>
    </svg>
  );
}

// Kurva ekuitas
function EquitySVG({ riwayat, ekuitas }: { riwayat: any[]; ekuitas?: number }) {
  const W = 560, H = 96, P = 8;
  const rp = (riwayat ?? []).map((t: any) => t.pnl ?? 0);
  if (rp.length === 0) return <div className="kosong2">Kurva muncul setelah trade pertama tutup.</div>;
  const total = rp.reduce((a, b) => a + b, 0);
  const awal = (ekuitas ?? 1000000) - total;
  const pts = [awal];
  rp.forEach((p) => pts.push(pts[pts.length - 1] + p));
  const hi = Math.max(...pts), lo = Math.min(...pts);
  const rg = hi === lo ? 1 : hi - lo;
  const X = (i: number) => P + (i / Math.max(1, pts.length - 1)) * (W - P * 2);
  const Y = (v: number) => P + (1 - (v - lo) / rg) * (H - P * 2);
  const line = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 96 }}>
      <polygon points={`${P},${H - P} ${line} ${X(pts.length - 1).toFixed(1)},${H - P}`}
        className={up ? "areaup" : "areadown"} />
      <polyline points={line} className={up ? "lineup" : "linedown"} />
      <text x={W - P} y={P + 10} className="hargalast" textAnchor="end">
        {total >= 0 ? "+" : ""}{total.toFixed(0)}
      </text>
    </svg>
  );
}

const AGENS = [
  ["📡", "Market"], ["🦎", "Gecko"], ["📊", "Analis"], ["📰", "Sentimen"], ["🧠", "Otak"],
  ["🛡️", "Risiko"], ["⚡", "Eksekutor"], ["📝", "Reporter"], ["💰", "Porto"], ["🪞", "Refleksi"],
  ["🔔", "Notif"], ["🏦", "Akun"],
];

export default function Page() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [live, setLive] = useState<Record<string, any>>({});
  const [lilin, setLilin] = useState<Record<string, number[][]>>({});
  const [pair, setPair] = useState("BTCUSDT");
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
    const jam = setInterval(() => setNow(Date.now()), 1000);
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
  const tugas = d && !d.demo && !d.offline && umur !== null && umur < 300;
  void now;

  function bip(nada: number[], dur = 0.1) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioRef.current) { try { audioRef.current = new AC(); } catch { return; } }
    const ctxA = audioRef.current;
    if (ctxA.state === "suspended") ctxA.resume().catch(() => {});
    nada.forEach((f, i) => {
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctxA.currentTime + i * (dur + 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctxA.destination);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  useEffect(() => {
    if (!suara || !d || d.demo) return;
    const nT = (d.riwayat ?? []).length;
    const nP = Object.keys(d.posisi ?? {}).length;
    if (prev.current.trades === 0 && prev.current.posisi === 0) { prev.current = { trades: nT, posisi: nP }; return; }
    if (nT > prev.current.trades) {
      const last = d.riwayat[d.riwayat.length - 1];
      bip((last?.pnl ?? 0) >= 0 ? [660, 880] : [440, 330]);
    } else if (nP > prev.current.posisi) {
      bip([520]);
    }
    prev.current = { trades: nT, posisi: nP };
  }, [d, suara]);

  const sims = d?.simbol ?? [];
  const aktif = sims.find((s: any) => s.symbol === pair) ?? sims[0];
  const ekuitas = d?.portofolio?.ekuitas ?? 1000000;
  const ret = d?.portofolio?.ret_pct ?? 0;
  const nPos = Object.keys(d?.posisi ?? {}).length;
  const riw = d?.riwayat ?? [];
  const menang = riw.filter((t: any) => (t.pnl ?? 0) > 0);
  const wr = riw.length ? menang.length / riw.length * 100 : 0;
  const ck = (lilin[pair] ?? []);
  const chg = aktif?.gecko?.chg24;
  const ind = aktif?.ind ?? {};

  const uPnL = (v: any) => {
    const px = sims.find((s: any) => s.symbol === v.sym)?.harga ?? v.harga_beli;
    const y = v.side === "SHORT" ? (v.harga_beli - px) * v.koin : (px - v.harga_beli) * v.koin;
    return y;
  };

  return (
    <div className="wrap terminal ex">
      <header className="exhead">
        <div className="exbrand"><img src="/logo.png" alt="BigGet" className="logo" />
          <div><b className="neon-text">BigGet</b><div className="sub">futures paper • {d?.leverage ?? 3}x</div></div>
        </div>
        <nav className="pairs">
          {sims.map((s: any) => {
            const nm = s.symbol.replace("USDT", "");
            const up = (s.gecko?.chg24 ?? 0) >= 0;
            return (
              <button key={s.symbol} onClick={() => setPair(s.symbol)}
                className={`pairtab ${pair === s.symbol ? "on" : ""} ${s.sinyal_final === "BELI" ? "sbeli" : s.sinyal_final === "JUAL" ? "sjual" : ""}`}>
                <b>{nm}</b>
                <span className={up ? "beli" : "jual"}>{up ? "▲" : "▼"} {Math.abs(s.gecko?.chg24 ?? 0).toFixed(2)}%</span>
              </button>
            );
          })}
        </nav>
        <div className="exkanan">
          <span className={`badge ${d && !d.demo ? "live" : "demo"}`}>{tugas ? "● LIVE" : "● " + (d?.demo ? "DEMO" : "OFF")}</span>
          <button className={`bel ${suara ? "on" : ""}`} title="Suara" onClick={() => {
            const v = !suara; setSuara(v);
            try { localStorage.setItem("grok_suara", v ? "1" : "0"); } catch {}
            if (v && d) prev.current = { trades: riw.length, posisi: nPos };
          }}>{suara ? "🔔" : "🔕"}</button>
          <a href="/chat" className="chatlink">⚡</a>
          <a href="/bubbles" className="chatlink bubblelink">🫧</a>
        </div>
      </header>

      {err && <div className="err">{err}</div>}

      <main className="exmain">
        <section className="exchart panel">
          {aktif ? (<>
            <div className="pairhead">
              <div>
                <h2>{aktif.symbol.replace("USDT", "")} <span className="sub">/ USDT • PERP • 1m</span></h2>
                <div className="bigprice">${Number(aktif.harga).toLocaleString("en-US")}
                  <span className={`chg ${(chg ?? 0) >= 0 ? "beli" : "jual"}`}> {(chg ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(chg ?? 0).toFixed(2)}% 24h</span>
                </div>
              </div>
              <div className="sigbox">
                <span className={`pilsinyal ${aktif.sinyal_final === "BELI" ? "beli" : aktif.sinyal_final === "JUAL" ? "jual" : "tahan"}`}>{aktif.sinyal_final}</span>
                <div className="sub">conf {((aktif.confidence ?? 0) * 100).toFixed(0)}% • {aktif.otak ?? ""}</div>
              </div>
            </div>
            <CandleSVG data={ck} />
            <div className="indrow">
              <span>RSI <b>{ind.rsi?.toFixed(1) ?? "—"}</b></span>
              <span>ATR <b>{ind.atr_pct?.toFixed(2) ?? "—"}%</b></span>
              <span>Range <b>{ind.range_pos?.toFixed(2) ?? "—"}</b></span>
              <span>MOM <b>{ind.mom3 === 1 ? "▲" : ind.mom3 === -1 ? "▼" : "—"}</b></span>
              <span>SL <b>{aktif.stop_loss ?? "—"}</b></span>
              <span>TP <b>{aktif.take_profit ?? "—"}</b></span>
            </div>
            {(aktif as any).alasan_otak ? <div className="airow">🧠 {(aktif as any).alasan_otak}</div> : null}
          </>) : <div className="kosong2">Menunggu data bot…</div>}
        </section>

        <aside className="exside">
          <div className="panel">
            <div className="phead">ACCOUNT</div>
            <div className="bignum">{fmtIDR(ekuitas)}</div>
            <div className={`sub ${ret >= 0 ? "beli" : "jual"}`}>{ret >= 0 ? "+" : ""}{ret}% • harian {d?.portofolio?.harian_pct ?? 0}%</div>
            <div className="row"><span>Win rate</span><b>{wr.toFixed(0)}% ({riw.length})</b></div>
            <div className="row"><span>Update</span><b>{d?.waktu ?? "—"}{umur !== null ? ` (${fmtUmur(umur)})` : ""}</b></div>
          </div>
          <div className="panel">
            <div className="phead">POSITIONS ({nPos})</div>
            {nPos === 0 ? <div className="kosong2">Tidak ada posisi.</div> :
              Object.entries(d?.posisi ?? {}).map(([k, v]: any) => {
                const y = uPnL({ ...v, sym: k });
                return (
                  <div key={k} className="posrow">
                    <div><b>{k.replace("USDT", "")}</b> <span className={v.side === "LONG" ? "beli" : "jual"}>{v.side} {v.leverage}x</span></div>
                    <div className={y >= 0 ? "beli" : "jual"}><b>{y >= 0 ? "+" : ""}{y.toFixed(0)}</b></div>
                  </div>
                );
              })}
          </div>
          <div className="panel">
            <div className="phead">EQUITY</div>
            <EquitySVG riwayat={riw} ekuitas={ekuitas} />
          </div>
        </aside>
      </main>

      <section className="exbottom">
        <div className="panel">
          <div className="phead">HISTORY</div>
          {riw.length === 0 ? <div className="kosong2">Belum ada trade tutup.</div> : (
            <div className="tabelkartu scroll"><table><tbody>
              {riw.slice().reverse().slice(0, 8).map((r: any, i: number) => (
                <tr key={i}><td>{r.symbol?.replace("USDT", "")}</td><td>{r.side}</td>
                  <td className={r.pnl >= 0 ? "beli" : "jual"}>{r.pnl_persen}%</td>
                  <td><small>{r.alasan}</small></td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="panel">
          <div className="phead">DESK FEED</div>
          <div className="feed">
            {(d?.events ?? []).slice().reverse().slice(0, 8).map((e: any, i: number) => (
              <div key={i} className="feedev"><span className="fwaktu">{e.waktu?.slice(11)}</span> {e.teks}</div>
            ))}
            {(d?.events ?? []).length === 0 ? <div className="sub">Bot patroli…</div> : null}
          </div>
        </div>
        <div className="panel">
          <div className="phead">SYSTEM • {tugas ? "BERTUGAS" : "Nganggur"}</div>
          <div className="sysagents">
            {["📡", "🦎", "📊", "📰", "🧠", "🛡️", "⚡", "📝", "💰", "🪞", "🔔", "🏦"].map((e, i) => (
              <span key={i} className={tugas ? "on" : "off"}>{e}</span>
            ))}
          </div>
          <div className="sub">12 agen • {d?.trade_type} • {fmtUmur(umur)}</div>
        </div>
      </section>

      {d?.demo && <div className="panduan"><b>🔌 Demo — pasang BOT_URL agar LIVE.</b></div>}
      <div className="sub foot">BigGet • paper • bukan saran finansial</div>
    </div>
  );
}
