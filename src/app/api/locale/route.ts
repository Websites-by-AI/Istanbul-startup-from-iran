import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang");
  const back = url.searchParams.get("back") || "/";
  const locale = lang === "fa" || lang === "tr" ? lang : "en";
  const res = NextResponse.redirect(new URL(back.startsWith("/") ? back : "/", url.origin));
  res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
