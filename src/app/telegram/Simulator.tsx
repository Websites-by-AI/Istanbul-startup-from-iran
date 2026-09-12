"use client";
import { useState } from "react";

export default function Simulator({ placeholder, send }: { placeholder: string; send: string }) {
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([]);
  const [input, setInput] = useState("/start");
  const [busy, setBusy] = useState(false);
  async function go(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setLog((l) => [...l, { me: true, text }]);
    setInput("");
    try {
      const r = await fetch("/api/telegram/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId: "sim-web", text, username: "web_tester" }) });
      const d = await r.json();
      setLog((l) => [...l, { me: false, text: d.reply ?? d.error }]);
    } finally { setBusy(false); }
  }
  return (
    <div className="card p-0">
      <div className="h-[420px] space-y-2 overflow-y-auto p-4">
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
            <pre dir="auto" className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 font-sans text-sm ${m.me ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-100"}`}>{m.text}</pre>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-white/10 px-3 py-2">
        {["/start", "/rules", "/agent legal", "/team RouteX", "/need accommodation legal poc", "/status", "/lang tr"].map((c) => (
          <button key={c} onClick={() => go(c)} className="rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[11px] hover:bg-white/10" dir="ltr">{c}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); go(input); }} className="flex gap-2 border-t border-white/10 p-3">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} />
        <button disabled={busy} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{send}</button>
      </form>
    </div>
  );
}
