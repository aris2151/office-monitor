"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Chat = { id: string; judul: string; pesan: Msg[] };

const PROVIDERS: Record<string, string[]> = {
  groq: ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite"],
};
const SYS = "Kamu asisten AI berbahasa Indonesia yang cerdas, santai, dan to-the-point seperti Grok. Jawab singkat kecuali diminta detail.";

function loadChats(): Chat[] {
  try { return JSON.parse(localStorage.getItem("grok_chats") ?? "[]"); } catch { return []; }
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [aktif, setAktif] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [jalan, setJalan] = useState(false);
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState(PROVIDERS.groq[0]);
  const [kunci, setKunci] = useState("");
  const [tampilKunci, setTampilKunci] = useState(false);
  const bawah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChats(loadChats());
    setKunci(localStorage.getItem("grok_key") ?? "");
    const p = localStorage.getItem("grok_provider");
    if (p && PROVIDERS[p]) { setProvider(p); setModel(PROVIDERS[p][0]); }
  }, []);
  useEffect(() => { bawah.current?.scrollIntoView({ behavior: "smooth" }); });
  useEffect(() => { localStorage.setItem("grok_chats", JSON.stringify(chats)); }, [chats]);

  const chat = chats.find((c) => c.id === aktif) ?? null;

  function chatBaru() {
    const id = Date.now().toString();
    setChats((cs) => [{ id, judul: "Chat baru", pesan: [] }, ...cs]);
    setAktif(id);
  }
  function ubahProvider(p: string) {
    setProvider(p); setModel(PROVIDERS[p][0]);
    localStorage.setItem("grok_provider", p);
  }
  function simpanKunci(v: string) {
    setKunci(v);
    if (v) localStorage.setItem("grok_key", v);
    else localStorage.removeItem("grok_key");
  }

  async function kirim() {
    const teks = input.trim();
    if (!teks || jalan) return;
    let id = aktif;
    let daftar = chats;
    if (!id) {
      id = Date.now().toString();
      daftar = [{ id, judul: teks.slice(0, 32), pesan: [] }, ...chats];
      setChats(daftar);
      setAktif(id);
    }
    const pesanBaru: Msg[] = [...(daftar.find((c) => c.id === id)?.pesan ?? []), { role: "user", content: teks }];
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, judul: c.pesan.length === 0 ? teks.slice(0, 32) : c.judul, pesan: pesanBaru } : c)));
    setInput("");
    setJalan(true);

    // placeholder asisten untuk streaming
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, pesan: [...pesanBaru, { role: "assistant", content: "" }] } : c)));
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, model, key: kunci,
          messages: [{ role: "system", content: SYS }, ...pesanBaru],
        }),
      });
      if (r.headers.get("content-type")?.includes("application/json")) {
        const j = await r.json();
        throw new Error(j.error ?? "Gagal");
      }
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "", terkumpul = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const bagian = buf.split("\n\n");
        buf = bagian.pop() ?? "";
        for (const b of bagian) {
          const baris = b.split("\n").find((l) => l.trim().startsWith("data:"));
          if (!baris) continue;
          const payload = baris.trim().slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const t = JSON.parse(payload).t;
            if (t) {
              terkumpul += t;
              const snap = terkumpul;
              setChats((cs) => cs.map((c) => (c.id === id
                ? { ...c, pesan: c.pesan.map((m, i) => (i === c.pesan.length - 1 ? { ...m, content: snap } : m)) }
                : c)));
            }
          } catch { /* abaikan */ }
        }
      }
    } catch (e) {
      const pesan = "⚠️ " + String((e as Error).message ?? e);
      setChats((cs) => cs.map((c) => (c.id === id
        ? { ...c, pesan: c.pesan.map((m, i) => (i === c.pesan.length - 1 ? { ...m, content: pesan } : m)) }
        : c)));
    } finally {
      setJalan(false);
    }
  }

  return (
    <div className="chat">
      <aside>
        <button className="baru" onClick={chatBaru}>+ Chat baru</button>
        <div className="daftar">
          {chats.map((c) => (
            <div key={c.id} className={`item ${c.id === aktif ? "on" : ""}`} onClick={() => setAktif(c.id)}>
              {c.judul}
              <span className="hapus" onClick={(e) => { e.stopPropagation(); setChats((cs) => cs.filter((x) => x.id !== c.id)); if (aktif === c.id) setAktif(null); }}>×</span>
            </div>
          ))}
        </div>
        <div className="setting">
          <label>Provider</label>
          <select value={provider} onChange={(e) => ubahProvider(e.target.value)}>
            <option value="groq">Groq (cepat, gratis)</option>
            <option value="gemini">Gemini (gratis)</option>
          </select>
          <label>Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {PROVIDERS[provider].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label>API key <small>(tersimpan di browser saja)</small></label>
          <div className="keyrow">
            <input type={tampilKunci ? "text" : "password"} value={kunci} onChange={(e) => simpanKunci(e.target.value)} placeholder="gsk_... / AIza..." />
            <button onClick={() => setTampilKunci((v) => !v)}>{tampilKunci ? "🙈" : "👁️"}</button>
          </div>
          <small><a href={provider === "groq" ? "https://console.groq.com/keys" : "https://aistudio.google.com/apikey"} target="_blank">Dapatkan key gratis →</a></small>
        </div>
      </aside>
      <main>
        <div className="topbar"><a href="/">📊 Monitor</a><b>⚡ GrokLite</b><span /></div>
        <div className="pesan">
          {!chat || chat.pesan.length === 0 ? (
            <div className="kosong">
              <div style={{ fontSize: 40 }}>⚡</div>
              <h2>Halo, mau bahas apa?</h2>
              <p>Asisten AI gratis — ketik di bawah. Key gratis dimasukkan sekali di sidebar.</p>
            </div>
          ) : chat.pesan.map((m, i) => (
            <div key={i} className={`bub ${m.role}`}>
              <div className="isi">{m.content || "…"}</div>
            </div>
          ))}
          <div ref={bawah} />
        </div>
        <div className="kirim">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanya apa saja…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(); } }} />
          <button onClick={kirim} disabled={jalan}>{jalan ? "…" : "➤"}</button>
        </div>
      </main>
    </div>
  );
}
