import { NextResponse } from "next/server";

// Chatbot ala-Grok: gratis via Groq / Gemini free-tier.
// Key dari browser (localStorage) atau env server. Tidak disimpan di mana pun.
// Output: SSE ternormalisasi -> data: {"t":"potongan teks"} ... data: [DONE]

const GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Ambil konteks live kantor trading agar chat jadi ASISTEN (tahu posisi/sinyal/ekuitas).
// Urutan: BOT_URL (Vercel) -> file lokal (dev di laptop) -> tanpa konteks.
async function konteksKantor(): Promise<string> {
  let snap: any = null;
  const base = process.env.BOT_URL?.replace(/\/$/, "");
  if (base) {
    try {
      const r = await fetch(`${base}/api/status`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (r.ok) snap = await r.json();
    } catch { /* lanjut fallback */ }
  }
  if (!snap) {
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      snap = JSON.parse(readFileSync(join(process.cwd(), "..", "bot", "status.json"), "utf-8"));
    } catch { /* tanpa konteks */ }
  }
  if (!snap?.simbol) return "";
  const sim = snap.simbol.map((s: any) =>
    `${s.symbol}: harga ${s.harga}, analis ${s.sinyal}, final ${s.sinyal_final}, conf ${s.confidence}, otak ${s.otak ?? "-"}`
  ).join(" | ");
  const pf = snap.portofolio ?? {};
  const pos = Object.entries(snap.posisi ?? {}).map(([k, v]: any) => `${k} beli@${v.harga_beli}`).join(", ") || "tidak ada";
  const riw = (snap.riwayat ?? []).slice(-3).map((t: any) => `${t.symbol} ${t.pnl_persen}% (${t.alasan})`).join("; ") || "belum ada";
  return `\n\n[KONTEKS LIVE KANTOR TRADING per ${snap.waktu}, mode ${snap.mode}] ` +
    `Sinyal: ${sim}. Ekuitas: ${pf.ekuitas ?? "?"} (ret ${pf.ret_pct ?? "?"}%). ` +
    `Posisi terbuka: ${pos}. 3 trade terakhir: ${riw}. ` +
    `Kamu adalah asisten kantor ini: jawab pertanyaan user BERDASARKAN data ini bila relevan.`;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }
  const { provider = "groq", model, messages = [], key = "" } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages kosong" }, { status: 400 });
  }
  // Suntik konteks live: chat jadi asisten kantor, bukan chatbot umum
  const ctx = await konteksKantor();
  const withCtx = ctx
    ? messages.map((m: any, i: number) =>
        m.role === "system" && i === 0 ? { ...m, content: String(m.content ?? "") + ctx } : m)
    : messages;

  if (provider === "groq") {
    const apiKey = key || process.env.GROQ_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "Butuh Groq API key (gratis: console.groq.com). Masukkan di sidebar." }, { status: 401 });
    const m = GROQ_MODELS.includes(model) ? model : GROQ_MODELS[0];
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: m, messages: withCtx, stream: true, temperature: 0.7,
      }),
    });
    if (!r.ok || !r.body) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ error: `Groq error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    // Teruskan SSE Groq (delta.content) sebagai format ternormalisasi
    const stream = new ReadableStream({
      async start(ctrl) {
        const enc = new TextEncoder();
        const reader = r.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";
        const send = (t: string) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ t })}\n\n`));
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() ?? "";
            for (const p of parts) {
              for (const line of p.split("\n")) {
                const s = line.trim();
                if (!s.startsWith("data:")) continue;
                const payload = s.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const d = JSON.parse(payload).choices?.[0]?.delta?.content;
                  if (d) send(d);
                } catch { /* abaikan */ }
              }
            }
          }
        } finally {
          ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
          ctrl.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  if (provider === "gemini") {
    const apiKey = key || process.env.GEMINI_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "Butuh Gemini API key (gratis: aistudio.google.com). Masukkan di sidebar." }, { status: 401 });
    const m = GEMINI_MODELS.includes(model) ? model : GEMINI_MODELS[0];
    // Gemini: non-stream (cepat) lalu kirim sebagai 1 chunk SSE agar klien seragam
    const contents = withCtx
      .filter((x: any) => x.role !== "system")
      .map((x: any) => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: String(x.content ?? "") }] }));
    const sys = withCtx.find((x: any) => x.role === "system")?.content;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(sys ? { systemInstruction: { parts: [{ text: String(sys) }] } } : {}),
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ error: `Gemini error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const j = await r.json();
    const teks = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") || "(kosong)";
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ t: teks })}\n\n`));
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  return NextResponse.json({ error: "provider harus 'groq' atau 'gemini'" }, { status: 400 });
}
