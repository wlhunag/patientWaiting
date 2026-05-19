import { NextResponse } from "next/server";
import { isValidStaffPath } from "@/lib/auth";
import { todayInTaipei, todayRangeUtc } from "@/lib/time";
import { fetchTodayAppointments } from "@/lib/calendar";
import { getAllStates } from "@/lib/storage";

export const dynamic = "force-dynamic";

// 除錯頁面：列出時間範圍、Google API 原始回傳、解析後資料。
// 用助理 secret 保護以免暴露病人資料。
//   GET /api/debug?s=<STAFF_SECRET_PATH>
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("s") ?? undefined;
  if (!isValidStaffPath(secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const range = todayRangeUtc(now);

  const debug: Record<string, unknown> = {
    serverTime: now.toISOString(),
    taipeiToday: todayInTaipei(now),
    queryRange: range,
    env: {
      hasApiKey: Boolean(process.env.GOOGLE_CALENDAR_API_KEY),
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      hasUpstashUrl: Boolean(
        process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
      ),
      hasUpstashToken: Boolean(
        process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
      ),
    },
  };

  try {
    // 直接呼叫一次 Google API 並回傳原始 response（前 5 筆）
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const directUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId!)}/events` +
      `?key=${encodeURIComponent(apiKey!)}` +
      `&timeMin=${encodeURIComponent(range.start)}` +
      `&timeMax=${encodeURIComponent(range.end)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=250`;
    const directRes = await fetch(directUrl, { cache: "no-store" });
    const directData = await directRes.json();
    debug.googleApiStatus = directRes.status;
    debug.googleApiSummary = directData.summary;
    debug.googleApiItemCount = directData.items?.length ?? 0;
    debug.googleApiFirstFive = (directData.items ?? [])
      .slice(0, 5)
      .map(
        (e: {
          id: string;
          summary?: string;
          status?: string;
          start?: { dateTime?: string };
          end?: { dateTime?: string };
        }) => ({
          id: e.id,
          summary: e.summary,
          status: e.status,
          start: e.start?.dateTime,
          end: e.end?.dateTime,
        }),
      );
    if (directData.error) debug.googleApiError = directData.error;
  } catch (e) {
    debug.googleApiError = e instanceof Error ? e.message : String(e);
  }

  try {
    debug.parsedAppointments = await fetchTodayAppointments(now);
  } catch (e) {
    debug.parseError = e instanceof Error ? e.message : String(e);
  }

  try {
    debug.storedStates = await getAllStates(now);
  } catch (e) {
    debug.storageError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(debug, {
    headers: { "Cache-Control": "no-store" },
  });
}
