"use client";

import { useEffect, useRef, useState } from "react";

type Agent = { key: string; name: string; icon: string; desc: string; prompts: string[] };
type Msg = { role: "user" | "assistant"; content: string };
type Copy = { team: string; none: string; ask: string; send: string; thinking: string; start: string; error: string };

export default function NavigatorClient({
  startups,
  agents,
  initialStartup,
  initialAgent,
  lang,
  copy,
}: {
  startups: { id: number; name: string; sector: string }[];
  agents: Agent[];
  lang: string;
  copy: Copy;
  initialStartup: number | null;
  initialAgent: string;
}) {
  const [startupId, setStartupId] = useState<number | null>(initialStartup);
  const [agent, setAgent] = useState(initialAgent);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startupId) return setMessages([]);
    fetch(`/api/navigator?startup=${startupId}&agent=${agent}`)
      .then((r) => r.json())
      .then((d) => setMessages((d.messages ?? []).map((m: Msg) => ({ role: m.role, content: m.content }))))
      .catch(() => setMessages([]));
  }, [startupId, agent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const r = await fetch("/api/navigator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, question, startupId, lang }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: d.answer ?? d.error ?? "Something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: copy.error }]);
    } finally {
      setLoading(false);
    }
  }

  const current = agents.find((a) => a.key === agent)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="card">
          <label className="text-[11px] uppercase tracking-wide text-slate-500">{copy.team}</label>
          <select className="input mt-1" value={startupId ?? ""} onChange={(e) => setStartupId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{copy.none}</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.sector}
              </option>
            ))}
          </select>
        </div>
        <div className="card p-2">
          {agents.map((a) => (
            <button
              key={a.key}
              onClick={() => setAgent(a.key)}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition ${
                agent === a.key ? "bg-amber-400/15 text-amber-200" : "hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{a.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{a.name}</span>
                <span className="block text-xs text-slate-400">{a.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="card flex min-h-[560px] flex-col p-0">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <span className="text-2xl">{current.icon}</span>
          <div>
            <p className="font-semibold">{current.name}</p>
            <p className="text-xs text-slate-400">{current.desc}</p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="text-sm text-slate-400">
              <p>{copy.start}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {current.prompts.map((p) => (
                  <button key={p} onClick={() => ask(p)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                dir="auto"
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-100"
                }`}
                dangerouslySetInnerHTML={{ __html: format(m.content) }}
              />
            </div>
          ))}
          {loading && <div className="text-xs text-slate-500">{current.name} {copy.thinking}</div>}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2 border-t border-white/10 p-3"
        >
          <input className="input" placeholder={`${copy.ask} ${current.name}…`} value={input} onChange={(e) => setInput(e.target.value)} />
          <button disabled={loading} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {copy.send}
          </button>
        </form>
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-3 py-2">
            {current.prompts.map((p) => (
              <button key={p} onClick={() => ask(p)} className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10">
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function format(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]{10,})_/g, '<em class="text-slate-400">$1</em>');
}
