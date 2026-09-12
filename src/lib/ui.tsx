export function levelColor(level: string) {
  switch (level) {
    case "gold":
      return "bg-amber-400/20 text-amber-300 border border-amber-400/40";
    case "silver":
      return "bg-slate-300/20 text-slate-200 border border-slate-300/40";
    default:
      return "bg-orange-700/30 text-orange-300 border border-orange-600/40";
  }
}

export function supportLabel(t: string) {
  return t === "free" ? "Free rooms" : t === "discount50" ? "50% discount" : "Corporate-paid";
}

export function statusColor(s: string) {
  switch (s) {
    case "funded":
      return "bg-emerald-500/20 text-emerald-300";
    case "poc":
      return "bg-sky-500/20 text-sky-300";
    case "landed":
      return "bg-violet-500/20 text-violet-300";
    case "selected":
      return "bg-amber-500/20 text-amber-300";
    default:
      return "bg-slate-500/20 text-slate-300";
  }
}

export const LANDING_STEPS = [
  "Exhibition",
  "Selection",
  "Sponsor Matching",
  "Travel & Hotel",
  "Legal Setup",
  "Corporate Meetings",
  "PoC",
  "Investor Meetings",
  "Investment",
  "Scale-up",
];

export function money(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
}

export function PageHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-slate-400">{desc}</p>
    </div>
  );
}
