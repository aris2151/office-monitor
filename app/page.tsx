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
  if (detik === null) return "--:--";
  const m = Math.floor(detik / 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(detik % 60).padStart(2, "0")}`;
}
function fmtJam(detik: number): string {
  return `${String(Math.floor(detik / 3600)).padStart(2, "0")}:${String(Math.floor(detik / 60) % 60).padStart(2, "0")}:${String(detik % 60).padStart(2, "0")}`;
}

// Cincin konsensus SVG
function Ring({ pct, label, sub, warna }: { pct: number; label: string; sub: string; warna: string }) {
  const r = 26, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="ringbg" />
        <circle cx="32" cy="32" r={r} className="ringfg" stroke={warna}
          strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 32 32)" />
        <text x="32" y="36" textAnchor="middle" className="ringtxt">{Math.round(v)}%</text>
      </svg>
      <div><div className="ringlabel">{label}</div><div className="sub">{sub}</div></div>
    </div>
  );
}

// Kurva ekuitas + bar PnL per trade
function EquityBig({ riwayat, ekuitas }: { riwayat: any[]; ekuitas?: number }) {
  const W = 640, H = 200, P = 10;
  const rp = (riwayat ?? []).map((t: any) => t.pnl ?? 0);
  const total = rp.reduce((a, b) => a + b, 0);
  const awal = (ekuitas ?? 1000000) - total;
  const pts = [awal];
  rp.forEach((p) => pts.push(pts[pts.length - 1] + p));
  const hi = Math.max(...pts), lo = Math.min(...pts);
  const rg = hi === lo ? 1 : hi - lo;
  const X = (i: number) => P + (i / Math.max(1, pts.length - 1)) * (W - P * 2);
  const Y = (v: number) => 10 + (1 - (v - lo) / rg) * (H - 60);
  const line = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  const bw = Math.max(3, (W - P * 2) / Math.max(1, rp.length) - 3);
  const maxAbs = Math.max(...rp.map(Math.abs), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 200 }}>
      <polygon points={`${P},${H - 34} ${line} ${X(pts.length - 1).toFixed(1)},${H - 34}`}
        className={up ? "areaup" : "areadown"} />
      <polyline points={line} className={up ? "lineup" : "linedown"} strokeWidth={2.5} />
      {rp.map((p, i) => {
        const h = Math.abs(p) / maxAbs * 26;
        return <rect key={i} x={X(i + 1) - bw / 2} y={p >= 0 ? H - 32 - h : H - 32}
          width={bw} height={Math.max(2, h)} fill={p >= 0 ? "#4ade80" : "#f87171"} opacity={0.75} />;
      })}
      <text x={W - P} y={P + 12} className="hargalast" textAnchor="end">
        {total >= 0 ? "+" : ""}{total.toFixed(0)} ({(((pts[pts.length - 1] / awal - 1) * 100)).toFixed(2)}%)
      </text>
    </svg>
  );
}

// Candle chart SVG
function CandleSVG({ data }: { data: number[][] }) {
  const W = 560, H = 170, P = 8;
  const c = (data ?? []).slice(-40);
  if (c.length < 2) return <div className="kosong2">Menunggu candle live…</div>;
  const hs = c.flatMap((k) => [k[2], k[3]]);
  let hi = Math.max(...hs), lo = Math.min(...hs);
  if (hi === lo) { hi *= 1.001; lo *= 0.999; }
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - P * 2);
  const bw = (W - P * 2) / c.length;
  const last = c[c.length - 1][4];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" style={{ height: 170 }}>
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
      <text x={W - P} y={12} className="hargalast" textAnchor="end">{last}</text>
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
  const t0 = useRef(Date.now());

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

  function bip(nada: number[], dur = 0.12) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioRef.current) { try { audioRef.current = new AC(); } catch { return; } }
    const ctxA = audioRef.current;
    if (ctxA.state === "suspended") ctxA.resume().catch(() => {});
    nada.forEach((f, i) => {
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = "square"; o.frequency.value = f;
      const t = ctxA.currentTime + i * (dur + 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctxA.destination);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  useEffect(() => {
    if (!suara || !d || d.demo) return;
    const nT = (d.riwayat ?? []).length;
    const nP = Object.keys(d.posisi ?? {}).length;
    if (prev.current.trades === 0) { prev.current = { trades: nT, posisi: nP }; return; }
    if (nT > prev.current.trades) {
      const last = d.riwayat[d.riwayat.length - 1];
      bip((last?.pnl ?? 0) >= 0 ? [660, 880, 1100] : [440, 330, 220]);
    } else if (nP > prev.current.posisi) {
      bip([520]);
    }
    prev.current = { trades: nT, posisi: nP };
  }, [d, suara]);

  const sims = d?.simbol ?? [];
  const confAvg = sims.length ? sims.reduce((a: number, s: any) => a + (s.confidence ?? 0), 0) / sims.length * 100 : 0;
  const nPos = Object.keys(d?.posisi ?? {}).length;
  const maxPos = d?.max_posisi ?? 3;
  const harian = d?.portofolio?.harian_pct ?? 0;
  const maxRugi = d?.max_rugi_harian ?? 3;
  const riw = d?.riwayat ?? [];
  const menang = riw.filter((t: any) => (t.pnl ?? 0) > 0);
  const wr = riw.length ? menang.length / riw.length * 100 : 0;
  const avgW = menang.length ? menang.reduce((a: number, t: any) => a + (t.pnl_persen ?? 0), 0) / menang.length : 0;
  const kalah = riw.filter((t: any) => (t.pnl ?? 0) <= 0);
  const avgL = kalah.length ? Math.abs(kalah.reduce((a: number, t: any) => a + (t.pnl_persen ?? 0), 0) / kalah.length) : 0;
  const exp = riw.length ? (wr / 100) * avgW - (1 - wr / 100) * avgL : 0;
  const marginPakai = Object.values(d?.posisi ?? {}).reduce((a: number, p: any) => a + (p.nilai ?? p.margin ?? 0), 0);
  const ekuitas = d?.portofolio?.ekuitas ?? 1000000;
  const posList = Object.entries(d?.posisi ?? {});
  const pos0 = posList[0] as any;
  const pxNow = pos0 ? (sims.find((s: any) => s.symbol === pos0[0])?.harga ?? pos0[1].harga_beli) : 0;

  return (
    <div className="wrap terminal hack">
      <nav className="topnav hackbar">
        <div className="brand"><img src="/logo.png" alt="BigGet" className="logo" /><b className="neon-text">BigGet</b>
          <span className="sub">trencher • {d?.trade_type ?? "spot"} {d?.leverage ? `${d.leverage}x` : ""} • {sims.length} pairs</span></div>
        <div className="navkanan hackstats">
          <span>TIMER <b>{fmtJam(Math.floor((Date.now() - t0.current) / 1000))}</b></span>
          <span>BALANCE <b className="beli">{Number(ekuitas).toLocaleString("id-ID")}</b></span>
          <span>MULTIPLE <b className="kuning">{((d?.portofolio?.ret_pct ?? 0) / 100 + 1).toFixed(2)}x</b></span>
          <span>NOT BUY <b className="jual">{sims.filter((s: any) => s.sinyal_final === "TAHAN").length}</b></span>
          <span className={`badge ${d && !d.demo ? "live" : "demo"}`}>{d && !d.demo ? "● LIVE" : "● DEMO"}</span>
          <button className={`bel ${suara ? "on" : ""}`} title="Notifikasi suara" onClick={() => {
            const v = !suara; setSuara(v);
            try { localStorage.setItem("grok_suara", v ? "1" : "0"); } catch {}
            if (v && d) prev.current = { trades: riw.length, posisi: nPos };
          }}>{suara ? "🔔" : "🔕"}</button>
          <a href="/chat" className="chatlink">⚡</a>
          <a href="/bubbles" className="chatlink bubblelink">🫧</a>
        </div>
      </nav>

      {Object.keys(live).length > 0 ? (
        <div className="ticker">{Object.entries(live).map(([k, v]: any) => (
          <span key={k} className="tikit">{k.replace("USDT", "")} <b>${Number(v.harga).toLocaleString("en-US")}</b></span>
        ))}<span className="tikit live-dot">● live</span></div>
      ) : null}
      {err && <div className="err">{err}</div>}

      <div className="grid3">
        <section className="panel span2">
          <div className="phead">THE BALANCE <span>{d?.waktu ?? "…"} ({fmtUmur(umur)})</span></div>
          <div className="bignum beli">{Number(ekuitas).toLocaleString("id-ID")} <small>IDR-paper</small></div>
          <EquityBig riwayat={riw} ekuitas={ekuitas} />
          <div className="sub">SCANNER • NARRATIVE • RISK • TIMING • EXIT</div>
          <div className="lantai mini"><div className="jalan">
            {["📡", "🦎", "📊", "📰", "🧠", "🛡️", "⚡", "📝", "💰", "🪞", "🔔", "🏦"].map((e, i) => (
              <span key={i} className={`pejalan ${tugas ? "jalan" : ""}`}
                style={{ ["--dur" as any]: `${8 + (i % 5) * 2.2}s`, animationDelay: `${-i * 1.6}s, 0s` }}>{e}</span>
            ))}
          </div></div>
        </section>

        <section className="panel">
          <div className="phead">AGENT CONSENSUS</div>
          <Ring pct={confAvg} label="KEYAKINAN" sub="avg confidence" warna="#4ade80" />
          <Ring pct={nPos / Math.max(1, maxPos) * 100} label="DEPLOYED" sub={`${nPos}/${maxPos} posisi`} warna="#00e5ff" />
          <Ring pct={Math.min(100, Math.abs(harian) / Math.max(0.1, maxRugi) * 100)} label="RISK PAKAI" sub={`harian ${harian}%`} warna="#f87171" />
        </section>

        <section className="panel">
          <div className="phead">OPEN POSITION</div>
          {!pos0 ? <div className="kosong2">Tidak ada posisi.</div> : (() => {
            const [k, v] = pos0 as any;
            const pnl = v.side === "SHORT" ? (v.harga_beli - pxNow) * v.koin : (pxNow - v.harga_beli) * v.koin;
            return (<>
              <div className="bignum">${k.replace("USDT", "")} <small>{v.side} {v.leverage ? `${v.leverage}x` : ""}</small></div>
              <div className={`pilsinyal ${v.side === "LONG" ? "beli" : "jual"}`}>{v.side}</div>
              <div className="row"><span>entry</span><b>{v.harga_beli}</b></div>
              <div className="row"><span>mark</span><b>{pxNow}</b></div>
              <div className="row"><span>uPnL</span><b className={pnl >= 0 ? "beli" : "jual"}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}</b></div>
              <div className="row"><span>SL / TP</span><b>{v.stop_loss} / {v.take_profit}</b></div>
              {nPos > 1 ? <div className="sub">+{nPos - 1} posisi lain</div> : null}
            </>);
          })()}
        </section>
      </div>

      <div className="grid3b">
        <section className="panel">
          <div className="phead">DESK FEED <span>AUTO-SCROLL</span></div>
          <div className="feed">
            {(d?.events ?? []).slice().reverse().map((e: any, i: number) => (
              <div key={i} className="feedev"><span className="fwaktu">{e.waktu?.slice(11)}</span> {e.teks}</div>
            ))}
            {(d?.events ?? []).length === 0 ? <div className="sub">Belum ada event. Bot patroli…</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="phead">SCAN GRID <span>{sims.length} pairs</span></div>
          <div className="scangrid">
            <div className="scanrow scanhead"><span></span><span>TREN</span><span>MOM</span><span>RSI</span><span>24H</span><span>CONF</span></div>
            {sims.map((s: any) => {
              const ind = s.ind ?? {};
              const tren = s.sinyal === "BELI" ? 1 : s.sinyal === "JUAL" ? 0 : 0.5;
              const mom = ind.mom3 === 1 ? 1 : ind.mom3 === -1 ? 0 : 0.5;
              const rsi = ind.rsi == null ? 0.5 : Math.max(0, Math.min(1, ind.rsi / 100));
              const c24 = ind.chg24 == null ? 0.5 : Math.max(0, Math.min(1, 0.5 + ind.chg24 / 10));
              const cf = s.confidence ?? 0;
              const cells = [tren, mom, rsi, c24, cf];
              return (
                <div key={s.symbol} className="scanrow">
                  <span className="scansym">{s.symbol.replace("USDT", "")}</span>
                  {cells.map((v, i) => (
                    <span key={i} className="cell" style={{
                      background: v >= 0.66 ? "rgba(74,222,128,.85)" : v >= 0.4 ? "rgba(251,191,36,.8)" : "rgba(248,113,113,.8)",
                    }} />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="sub">seen {sims.length} • veto {sims.filter((s: any) => s.veto).length}</div>
        </section>

        <section className="panel">
          <div className="phead">EDGE MODEL</div>
          <div className="row"><span>n trades</span><b>{riw.length}</b></div>
          <div className="row"><span>win rate</span><b className={wr >= 50 ? "beli" : "jual"}>{wr.toFixed(0)}%</b></div>
          <div className="row"><span>avg win</span><b className="beli">{avgW.toFixed(2)}%</b></div>
          <div className="row"><span>avg loss</span><b className="jual">{avgL.toFixed(2)}%</b></div>
          <div className={`bignum ${exp >= 0 ? "beli" : "jual"}`}>E {exp >= 0 ? "+" : ""}{exp.toFixed(2)}%</div>
          <div className="sub">expectancy per trade</div>
          <div className="phead" style={{ marginTop: 10 }}>SIZING</div>
          <div className="row"><span>margin pakai</span><b>{Number(marginPakai).toLocaleString("id-ID")}</b></div>
          <div className="row"><span>eksposur</span><b>{(marginPakai / Math.max(1, ekuitas) * 100).toFixed(1)}%</b></div>
        </section>
      </div>

      <div className="grid3b">
        <section className="panel span2">
          <div className="phead">LIVE CANDLE 1m
            <span className="tabrow" style={{ margin: 0 }}>{sims.map((s: any) => (
              <button key={s.symbol} className={simChart === s.symbol ? "tab on" : "tab"}
                onClick={() => setSimChart(s.symbol)}>{s.symbol.replace("USDT", "")}</button>
            ))}</span>
          </div>
          <CandleSVG data={lilin[simChart] ?? []} />
        </section>
        <section className="panel">
          <div className="phead">NARRATIVE</div>
          <div className="sub">🔥 {(sims[0]?.gecko?.trending ?? []).slice(0, 7).join(" ") || "—"}</div>
          <div className="row"><span>Dom BTC</span><b>{sims[0]?.gecko?.btc_dom ?? "—"}%</b></div>
          <div className="phead" style={{ marginTop: 10 }}>OTAK</div>
          <div className="sub">🧠 {(sims[0] as any)?.alasan_otak ?? "—"}</div>
        </section>
      </div>

      {d?.demo && (
        <div className="panduan">
          <b>🔌 Demo — pasang BOT_URL di Vercel agar LIVE.</b>
        </div>
      )}
      <div className="sub foot">BigGet • paper trading • bukan saran finansial • {d?.waktu ?? ""}</div>
    </div>
  );
}
