import { NextResponse } from "next/server";

// Top 50 CoinGecko untuk halaman Bubble (cache 5 menit di memori, hemat limit gratis).
let cache: { ts: number; data: any } | null = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) return NextResponse.json(cache.data);
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=1h,24h,7d",
      { signal: AbortSignal.timeout(20000) }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json();
    const data = {
      waktu: new Date().toISOString(),
      koin: arr.map((c: any) => ({
        id: c.id, symbol: String(c.symbol).toUpperCase(), nama: c.name,
        harga: c.current_price, mcap: c.market_cap,
        chg1h: c.price_change_percentage_1h_in_currency,
        chg24: c.price_change_percentage_24h_in_currency,
        chg7d: c.price_change_percentage_7d_in_currency,
      })),
    };
    cache = { ts: Date.now(), data };
    return NextResponse.json(data);
  } catch (e) {
    if (cache) return NextResponse.json(cache.data); // basi lebih baik daripada kosong
    return NextResponse.json({ error: String(e), koin: [] }, { status: 502 });
  }
}
