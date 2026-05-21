import { NextResponse } from "next/server";
import { loadTodaySchedule } from "@/lib/schedule-service";
import { findByName, countAheadOf } from "@/lib/scheduler";
import { pickArticlesForTreatment } from "@/lib/article-picker";
import { clinicConfig } from "@/lib/clinic-config";
import { diffMinutes } from "@/lib/time";
import type { AppointmentView } from "@/lib/types";

export const dynamic = "force-dynamic";

// 從原始狀態 + 等待數推算 UI mode（給設計用的 5 種狀態）
type UiMode =
  | "waiting"
  | "nextup"
  | "delay"
  | "insession"
  | "done"
  | "cancelled";
function deriveMode(view: AppointmentView, aheadCount: number): UiMode {
  if (view.status === "done") return "done";
  if (view.status === "cancelled") return "cancelled";
  if (view.status === "in_progress") return "insession";
  if (aheadCount === 0) return "nextup";
  if (view.delayMin > 0) return "delay";
  return "waiting";
}

// 「目前進度」區塊：只回時間資訊，絕不洩漏其他病人的療程內容
function buildProgress(schedule: AppointmentView[], selfId: string) {
  const inSession = schedule.find(
    (s) => s.status === "in_progress" && s.id !== selfId,
  );
  const nextUp = schedule
    .filter((s) => s.status === "waiting" && s.id !== selfId)
    .sort((a, b) => a.estimatedStart.localeCompare(b.estimatedStart))[0];

  const now = Date.now();
  return {
    inSession: inSession
      ? {
          startedMinutesAgo: inSession.actualStart
            ? Math.max(
                0,
                Math.round(
                  (now - new Date(inSession.actualStart).getTime()) / 60000,
                ),
              )
            : 0,
          plannedDurationMin: inSession.scheduledDurationMin,
        }
      : null,
    nextUp: nextUp ? { estimatedStart: nextUp.estimatedStart } : null,
  };
}

export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) as { name?: string };
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "請輸入姓名" }, { status: 400 });
    }

    const now = new Date();
    const schedule = await loadTodaySchedule(now);
    const matches = findByName(schedule, name);

    if (matches.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const nowIso = now.toISOString();
    // 隱私原則：不把 treatment 回傳給病人端（即使是病人自己的也不送）
    // 但伺服器端仍會用 treatment 來挑選相關衛教文章
    const result = matches.map((m) => {
      const aheadCount = countAheadOf(schedule, m.id);
      const articles = pickArticlesForTreatment(
        clinicConfig.articles,
        m.treatment,
        2,
        m.id,
      );
      return {
        id: m.id,
        scheduledStart: m.scheduledStart,
        scheduledEnd: m.scheduledEnd,
        estimatedStart: m.estimatedStart,
        estimatedEnd: m.estimatedEnd,
        scheduledDurationMin: m.scheduledDurationMin,
        status: m.status,
        mode: deriveMode(m, aheadCount),
        actualStart: m.actualStart,
        delayMin: m.delayMin,
        aheadCount,
        waitMinutes:
          m.status === "done"
            ? 0
            : Math.max(0, diffMinutes(m.estimatedStart, nowIso)),
        progress: buildProgress(schedule, m.id),
        articles,
      };
    });

    return NextResponse.json({ matches: result, now: nowIso });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
