"use client";
import { useState } from "react";
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })} className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10">
      {ok ? "✓" : label}
    </button>
  );
}
