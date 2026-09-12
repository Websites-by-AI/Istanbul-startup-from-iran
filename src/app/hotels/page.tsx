import { db } from "@/db";
import { hotels } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import HotelMap from "./HotelMap";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  await ensureSeeded();
  const { t } = await getT();
  const rows = await db.select().from(hotels).orderBy(hotels.city, hotels.name);
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t.p_hotels_eyebrow}
        title={t.p_hotels_title}
        desc={t.p_hotels_desc}
      />
      <HotelMap hotels={rows} labels={{ hotel: t.common_hotel, city: t.common_city, rooms: t.common_rooms, support: t.common_support }} />
    </main>
  );
}
