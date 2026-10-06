import { NextResponse } from "next/server";
import { streamText, tool, stepCountIs } from "ai";
import { createGroq, groq } from "@ai-sdk/groq";
import { z } from "zod";

// Chatbot ala-Grok: gratis via Groq / Gemini free-tier.
// Key dari browser (localStorage) atau env server. Tidak disimpan di mana pun.
// Output: SSE ternormalisasi -> data: {"t":"potongan teks"} ... data: [DONE]

const GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Ambil snapshot mentah (alat untuk agen): BOT_URL -> file lokal -> null.
async function snapshotMentah(): Promise<any | null> {
  const base = process.env.BOT_URL?.replace(/\/$/, "");
  if (base) {
    try {
      const r = await fetch(`${base}/api/status`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (r.ok) return await r.json();
    } catch { /* fallback lokal */ }
  }
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    return JSON.parse(readFileSync(join(process.cwd(), "..", "bot", "status.json"), "utf-8"));
  } catch {
    return null;
  }
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
  // Jalur Groq via Vercel AI SDK: agen tool-calling (baca data live sendiri)
  const alat = {
    status_trading: tool({
      description: "Ambil status live kantor trading: sinyal tiap koin, ekuitas, posisi, riwayat.",
      inputSchema: z.object({ symbol: z.string().optional().describe("Filter 1 simbol, mis BTCUSDT") }),
      execute: async ({ symbol }: { symbol?: string }) => {
        const snap = await snapshotMentah();
        if (!snap?.simbol) return { error: "bot offline (tidak ada data)" };
        const daftar = symbol
          ? snap.simbol.filter((s: any) => s.symbol === symbol)
          : snap.simbol;
        return {
          waktu: snap.waktu, mode: snap.mode,
          sinyal: daftar.map((s: any) => ({
            symbol: s.symbol, harga: s.harga, analis: s.sinyal, final: s.sinyal_final,
            confidence: s.confidence, otak: s.otak, alasan: s.alasan_otak,
          })),
          portofolio: snap.portofolio ?? {},
          posisi_terbuka: Object.keys(snap.posisi ?? {}).length,
          riwayat_terakhir: (snap.riwayat ?? []).slice(-3),
        };
      },
    }),
    saldo_akun: tool({
      description: "Ambil saldo akun exchange asli yang terkonek (bila ada).",
      inputSchema: z.object({}),
      execute: async () => {
        const snap = await snapshotMentah();
        const a = snap?.akun;
        if (!a?.terhubung) return { terhubung: false, info: "akun belum dikonekkan" };
        return { terhubung: true, exchange: a.exchange, saldo: a.saldo ?? [], posisi_fut: a.posisi_fut ?? [] };
      },
    }),
  };

  if (provider === "groq") {
    const apiKey = key || process.env.GROQ_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "Butuh Groq API key (gratis: console.groq.com). Masukkan di sidebar." }, { status: 401 });
    const m = GROQ_MODELS.includes(model) ? model : GROQ_MODELS[0];
    const prov = key ? createGroq({ apiKey }) : groq;
    const sysUser = messages.find((x: any) => x.role === "system")?.content ?? "";
    const riwayat = messages.filter((x: any) => x.role !== "system");
    let hasil: any;
    try {
      hasil = await streamText({
        model: prov(m),
        system: `${sysUser}\nKamu asisten kantor trading ini. Untuk pertanyaan tentang sinyal/harga/ekuitas/posisi/saldo, WAJIB pakai tools (status_trading, saldo_akun) agar jawaban dari data live, bukan karangan. Jawab Bahasa Indonesia, singkat.`,
        messages: riwayat,
        tools: alat,
        stopWhen: stepCountIs(4),
        temperature: 0.5,
      } as any);
    } catch (e) {
      return NextResponse.json({ error: `Groq error: ${String(e).slice(0, 200)}` }, { status: 502 });
    }
    // Bungkus textStream ke format SSE klien lama (data: {"t"}) agar UI tak berubah
    const stream = new ReadableStream({
      async start(ctrl) {
        const enc = new TextEncoder();
        const send = (t: string) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ t })}\n\n`));
        try {
          for await (const bagian of hasil.textStream) {
            if (bagian) send(bagian);
          }
        } catch (e) {
          send(`\n⚠️ ${String(e).slice(0, 150)}`);
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
    // Gemini: tanpa tools -> suntik ringkasan live ke system prompt
    const snap = await snapshotMentah();
    const ringkas = snap?.simbol
      ? `\n[KONTEKS LIVE ${snap.waktu}] ` + snap.simbol.map((s: any) =>
          `${s.symbol} ${s.harga} final-${s.sinyal_final}`).join(" | ") +
        `. Ekuitas ${snap.portofolio?.ekuitas ?? "?"}. Jawab berdasar data ini bila relevan.`
      : "";
    // Gemini: non-stream (cepat) lalu kirim sebagai 1 chunk SSE agar klien seragam
    const contents = messages
      .filter((x: any) => x.role !== "system")
      .map((x: any) => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: String(x.content ?? "") }] }));
    const sysBase = messages.find((x: any) => x.role === "system")?.content;
    const sys = sysBase ? String(sysBase) + ringkas : ringkas || undefined;
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
