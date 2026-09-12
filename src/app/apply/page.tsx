import Link from "next/link";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import { submitApplication } from "./actions";

const KINDS = [
  { k: "startup", label: "Startup", desc: "3-person team from Iran" },
  { k: "hotel", label: "Hotel", desc: "Accommodation Partner" },
  { k: "corporate", label: "Corporate", desc: "Innovation Partner" },
  { k: "investor", label: "Investor", desc: "VC / Angel / CVC" },
  { k: "legal", label: "Legal Firm", desc: "Market Entry Partner" },
  { k: "media", label: "Media", desc: "Visibility Partner" },
];

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { kind: k, error } = await searchParams;
  const { t } = await getT();
  const kind = KINDS.some((x) => x.k === k) ? (k as string) : "startup";

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={t.p_apply_eyebrow} title={t.p_apply_title} desc={t.p_apply_desc} />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {KINDS.map((x) => (
          <Link
            key={x.k}
            href={`/apply?kind=${x.k}`}
            className={`rounded-xl border p-3 text-center text-sm ${kind === x.k ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-white/10 hover:bg-white/5"}`}
          >
            <span className="block font-semibold">{x.label}</span>
            <span className="block text-[11px] text-slate-400">{x.desc}</span>
          </Link>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">Please fill in the required fields (organization, contact name, valid email).</p>}

      <form action={submitApplication} className="card space-y-4">
        <input type="hidden" name="kind" value={kind} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={kind === "startup" ? "Startup name *" : "Organization *"} name="organization" />
          <Field label={kind === "startup" ? "Founder name *" : "Contact name *"} name="contactName" />
          <Field label="Email *" name="email" type="email" />
          {kind === "hotel" ? (
            <Select label="City" name="city" options={["Istanbul", "Ankara", "İzmir"]} />
          ) : (
            <Field label="City" name="city" placeholder={kind === "startup" ? "Tehran" : "Istanbul"} />
          )}
        </div>

        {kind === "startup" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tagline" name="tagline" placeholder="One-line description" />
            <Field label="Sector" name="sector" placeholder="Energy AI, Fintech, …" />
            <Field label="Technical co-founder" name="technicalName" />
            <Field label="Business co-founder" name="businessName" />
            <Select label="Stage" name="stage" options={["idea", "mvp", "revenue", "scaling"]} />
            <Field label="Seeking (USD)" name="seekingUsd" type="number" placeholder="250000" />
            <Field label="Corporate sectors you need (comma-separated)" name="needsCorporate" placeholder="Energy, Utilities" />
            <Select label="Where did you hear about us?" name="sourceEvent" options={["Elcom 2025", "GITEX AI Türkiye 2026", "University Demo Day", "Accelerator", "Website"]} />
          </div>
        )}

        {kind === "hotel" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" name="district" placeholder="Beşiktaş" />
            <Field label="Startup rooms you can allocate" name="rooms" type="number" placeholder="5" />
            <Select label="Support type" name="supportType" options={["free", "discount50", "corporate"]} labels={["Free rooms", "50% discount", "Corporate-paid"]} />
            <Field label="Preferred startup sectors (comma-separated)" name="sector" placeholder="AI, Fintech" />
            <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
              {[
                ["meetingRoom", "Meeting room"],
                ["coworking", "Coworking"],
                ["airportTransfer", "Airport transfer"],
              ].map(([n, l]) => (
                <label key={n} className="flex items-center gap-2">
                  <input type="checkbox" name={n} className="accent-amber-400" /> {l}
                </label>
              ))}
            </div>
          </div>
        )}

        {kind === "corporate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry" name="sector" placeholder="Energy, Logistics, …" />
            <Field label="Technologies you're looking for" name="lookingFor" placeholder="Grid AI, Predictive maintenance" />
            <Select label="Package" name="tier" options={["innovation", "strategic"]} labels={["Innovation Partner (1 team)", "Strategic Partner (2–3 teams)"]} />
            <Field label="Indicative budget (USD)" name="budgetUsd" type="number" placeholder="50000" />
          </div>
        )}

        {kind === "investor" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type" name="type" options={["vc", "angel", "corporate", "accelerator"]} />
            <Field label="Sectors" name="sector" placeholder="AI, Fintech" />
            <Field label="Ticket min (USD)" name="ticketMin" type="number" />
            <Field label="Ticket max (USD)" name="ticketMax" type="number" />
          </div>
        )}

        {(kind === "legal" || kind === "media") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={kind === "legal" ? "Practice areas" : "Channels"} name="sector" placeholder={kind === "legal" ? "Immigration, Corporate, IP" : "LinkedIn, Press, Video"} />
            <Select label="Partner type" name="partnerType" options={kind === "legal" ? ["Team 1 — Entry & Settlement", "Team 2 — Investment & Growth", "Both"] : ["PR package", "Demo-day coverage", "Content partner"]} />
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400">{kind === "startup" ? "Traction summary" : "Message"}</label>
          <textarea name="message" rows={4} className="input mt-1" placeholder={kind === "startup" ? "Customers, revenue, pilots…" : "Tell us how you'd like to partner"} />
        </div>

        <button className="w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-slate-950 hover:bg-amber-300">{t.p_apply_submit}</button>
        <p className="text-xs text-slate-500">
          By submitting you acknowledge the platform provides coordination and professional support; it does not guarantee visas, residence permits, funding or sponsorship.
        </p>
      </form>
    </main>
  );
}

function Field({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <input name={name} type={type} placeholder={placeholder} className="input mt-1" />
    </div>
  );
}

function Select({ label, name, options, labels }: { label: string; name: string; options: string[]; labels?: string[] }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <select name={name} className="input mt-1">
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels?.[i] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}
