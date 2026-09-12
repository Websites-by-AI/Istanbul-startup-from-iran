"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Hotel } from "@/db/schema";
import { levelColor, supportLabel } from "@/lib/ui";

const CITY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number; label: string }> = {
  Istanbul: { minLat: 40.94, maxLat: 41.14, minLng: 28.78, maxLng: 29.09, label: "Istanbul" },
  Ankara: { minLat: 39.84, maxLat: 39.94, minLng: 32.72, maxLng: 32.9, label: "Ankara" },
  İzmir: { minLat: 38.4, maxLat: 38.48, minLng: 27.1, maxLng: 27.2, label: "İzmir" },
};

const LANDMARKS: Record<string, { name: string; lat: number; lng: number }[]> = {
  Istanbul: [
    { name: "Istanbul Expo Center", lat: 40.98, lng: 28.81 },
    { name: "IST Airport", lat: 41.11, lng: 28.79 },
    { name: "Bosphorus", lat: 41.05, lng: 29.03 },
    { name: "İTÜ Teknokent", lat: 41.105, lng: 29.025 },
  ],
  Ankara: [
    { name: "ODTÜ Teknokent", lat: 39.89, lng: 32.78 },
    { name: "Kızılay", lat: 39.92, lng: 32.85 },
  ],
  İzmir: [{ name: "Fuar İzmir", lat: 38.41, lng: 27.13 }],
};

export default function HotelMap({ hotels, labels }: { hotels: Hotel[]; labels: { hotel: string; city: string; rooms: string; support: string } }) {
  const [city, setCity] = useState("Istanbul");
  const [level, setLevel] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);

  const list = useMemo(
    () => hotels.filter((h) => h.city === city && (level === "all" || h.sponsorLevel === level)),
    [hotels, city, level],
  );
  const b = CITY_BOUNDS[city];
  const project = (lat: number, lng: number) => ({
    x: ((lng - b.minLng) / (b.maxLng - b.minLng)) * 100,
    y: (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * 100,
  });
  const sel = list.find((h) => h.id === selected) ?? list[0];
  const capacity = list.reduce((a, h) => a + h.roomsAvailable, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {Object.keys(CITY_BOUNDS).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCity(c);
                setSelected(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                city === c ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
            >
              {c} <span className="opacity-70">({hotels.filter((h) => h.city === c).length})</span>
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-white/10" />
          {["all", "gold", "silver", "bronze"].map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                level === l ? "bg-white text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
            >
              {l}
            </button>
          ))}
          <span className="ms-auto text-sm text-slate-400">
            <b className="text-white">{capacity}</b> startup rooms available
          </span>
        </div>

        <div dir="ltr" className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,#0f2a3f,#0b1220_70%)]">
          <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {city === "Istanbul" && (
              <path
                d="M 62% 0 C 60% 30%, 66% 55%, 58% 100%"
                stroke="#38bdf8"
                strokeWidth="18"
                fill="none"
                strokeLinecap="round"
                opacity="0.35"
              />
            )}
          </svg>
          <div className="absolute left-3 top-3 rounded-md bg-slate-950/70 px-2 py-1 text-xs font-semibold text-slate-200">
            {b.label} · Startup Hotel Map
          </div>
          {(LANDMARKS[city] ?? []).map((lm) => {
            const p = project(lm.lat, lm.lng);
            return (
              <div
                key={lm.name}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] text-sky-300/80"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div className="mx-auto h-1.5 w-1.5 rounded-full bg-sky-300/80" />
                <div className="mt-0.5 whitespace-nowrap">{lm.name}</div>
              </div>
            );
          })}
          {list.map((h) => {
            const p = project(h.lat, h.lng);
            const active = sel?.id === h.id;
            const color = h.sponsorLevel === "gold" ? "text-amber-400" : h.sponsorLevel === "silver" ? "text-slate-200" : "text-orange-500";
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${color}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                title={h.name}
              >
                <span className={`relative block rounded-full ${active ? "pulse-ring" : ""}`}>
                  <span
                    className={`grid place-items-center rounded-full border-2 border-current bg-slate-950 font-bold ${
                      active ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]"
                    }`}
                  >
                    {h.roomsAvailable}
                  </span>
                </span>
                <span className="mt-1 block whitespace-nowrap rounded bg-slate-950/70 px-1 text-[10px] text-slate-200">
                  {h.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Marker number = startup rooms currently available. Gold / Silver / Bronze = sponsor level.
        </p>
      </div>

      <div className="space-y-4">
        {sel ? (
          <div className="card border-amber-400/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{sel.name}</h3>
                <p className="text-sm text-slate-400">
                  {sel.district}, {sel.city}
                </p>
              </div>
              <span className={`badge capitalize ${levelColor(sel.sponsorLevel)}`}>{sel.sponsorLevel} partner</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{sel.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat l="Support" v={supportLabel(sel.supportType)} />
              <Stat l="Startup rooms" v={`${sel.roomsAvailable} / ${sel.startupRooms}`} />
              <Stat l="Metro" v={`${sel.metroMinutes} min`} />
              <Stat l="Exhibition" v={`${sel.exhibitionMinutes} min`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sel.meetingRoom && <Chip>Meeting room</Chip>}
              {sel.coworking && <Chip>Coworking</Chip>}
              {sel.airportTransfer && <Chip>Airport transfer</Chip>}
              {sel.breakfast && <Chip>Breakfast</Chip>}
              {sel.sectors.map((s) => (
                <Chip key={s} tone="amber">
                  {s}
                </Chip>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Sponsored by {sel.name} · Startup Partner Hotel – {sel.city}</p>
          </div>
        ) : (
          <div className="card text-sm text-slate-400">No hotels match these filters.</div>
        )}

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-start text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">{labels.hotel}</th>
                <th className="px-4 py-2">{labels.city}</th>
                <th className="px-4 py-2 text-end">{labels.rooms}</th>
                <th className="px-4 py-2">{labels.support}</th>
              </tr>
            </thead>
            <tbody>
              {hotels
                .filter((h) => level === "all" || h.sponsorLevel === level)
                .map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => {
                      setCity(h.city);
                      setSelected(h.id);
                    }}
                    className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${sel?.id === h.id ? "bg-amber-400/10" : ""}`}
                  >
                    <td className="px-4 py-2 font-medium">{h.name}</td>
                    <td className="px-4 py-2 text-slate-400">{h.city}</td>
                    <td className="px-4 py-2 text-end">{h.roomsAvailable}</td>
                    <td className="px-4 py-2 text-slate-400">{supportLabel(h.supportType)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Link
          href="/apply?kind=hotel"
          className="block rounded-xl bg-amber-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-amber-300"
        >
          List your hotel as a Startup Partner →
        </Link>
      </div>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{l}</p>
      <p className="font-semibold">{v}</p>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  return (
    <span
      className={`badge ${tone === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-slate-300"}`}
    >
      {children}
    </span>
  );
}
