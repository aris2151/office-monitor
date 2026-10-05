import { NextResponse } from "next/server";

const DEMO = {
  waktu: "— (demo)",
  exchange: "bitget",
  mode: "paper",
  demo: true,
  simbol: [
    { symbol: "BTCUSDT", harga: 84601.8, sinyal: "JUAL", sinyal_final: "JUAL", confidence: 0.75, stop_loss: null, take_profit: null },
    { symbol: "ETHUSDT", harga: 2680.77, sinyal: "JUAL", sinyal_final: "JUAL", confidence: 0.75, stop_loss: null, take_profit: null },
  ],
  posisi: {},
  riwayat: [],
};

export async function GET() {
  const base = process.env.BOT_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json(DEMO); // belum pasang tunnel -> demo
  try {
    const r = await fetch(`${base}/api/status`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return NextResponse.json({ ...data, demo: false });
  } catch (e) {
    return NextResponse.json(
      { ...DEMO, waktu: "— (laptop offline)", offline: true, pesan: String(e) },
      { status: 200 }
    );
  }
}
