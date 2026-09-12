"use client";

import { usePathname } from "next/navigation";

export default function LangSwitcher({ current, locales }: { current: string; locales: { code: string; label: string }[] }) {
  const path = usePathname() || "/";
  return (
    <span className="flex items-center rounded-md border border-white/15 p-0.5 text-xs">
      {locales.map((l) => (
        <a
          key={l.code}
          href={`/api/locale?lang=${l.code}&back=${encodeURIComponent(path)}`}
          className={`rounded px-2 py-1 ${current === l.code ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
        >
          {l.label}
        </a>
      ))}
    </span>
  );
}
