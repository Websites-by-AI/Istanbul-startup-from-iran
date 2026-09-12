"use server";

import { db } from "@/db";
import { channelPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendTelegram } from "@/lib/telegram";

export async function publishPost(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const [p] = await db.select().from(channelPosts).where(eq(channelPosts.id, id));
  if (!p) return;
  const channel = process.env.TELEGRAM_CHANNEL_ID;
  if (channel && process.env.TELEGRAM_BOT_TOKEN) await sendTelegram(channel, `*${p.title}*\n\n${p.body}`);
  await db.update(channelPosts).set({ status: "published", publishedAt: new Date() }).where(eq(channelPosts.id, id));
  revalidatePath("/channel");
}

export async function deletePost(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.delete(channelPosts).where(eq(channelPosts.id, id));
  revalidatePath("/channel");
}
