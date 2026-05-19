import { NextResponse } from "next/server";
import { loadTodaySchedule } from "@/lib/schedule-service";
import { isValidStaffPath } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 助理端：取得今日完整名單（含姓名、療程、狀態）
// 用 querystring 傳 secret 比 header 簡單，因為瀏覽器直接 fetch 即可
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("s") ?? undefined;
  if (!isValidStaffPath(secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schedule = await loadTodaySchedule();
    return NextResponse.json({ schedule, now: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
