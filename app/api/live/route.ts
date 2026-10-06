import { NextResponse } from "next/server";

// Harga detikan: BOT_URL/api/live (Vercel) atau file bot/live.json (dev lokal).
export async function GET() {
  const base = process.env.BOT_URL?.replace(/\/$/, "");
  if (base) {
    try {
      const r = await fetch(`${base}/api/live`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (r.ok) return NextResponse.json({ ...(await r.json()), demo: false });
    } catch { /* fallback lokal */ }
  }
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const live = JSON.parse(readFileSync(join(process.cwd(), "..", "bot", "live.json"), "utf-8"));
    return NextResponse.json({ ...live, demo: false, lokal: true });
  } catch {
    return NextResponse.json({ waktu: "—", tick: {}, demo: true });
  }
}
