import { NextResponse } from "next/server";
import { loadTodaySchedule } from "@/lib/schedule-service";
import { findByName, countAheadOf } from "@/lib/scheduler";
import { sanitizeTreatment } from "@/lib/parser";
import { diffMinutes } from "@/lib/time";
import type { AppointmentView } from "@/lib/types";

export const dynamic = "force-dynamic";

// 從原始狀態 + 等待數推算 UI mode（給設計用的 5 種狀態）
type UiMode = "waiting" | "nextup" | "delay" | "insession" | "done" | "cancelled";
function deriveMode(view: AppointmentView, aheadCount: number): UiMode {
  if (view.status === "done") return "done";
  if (view.status === "cancelled") return "cancelled";
  if (view.status === "in_progress") return "insession";
  // 以下為 waiting
  if (aheadCount === 0) return "nextup";
  if (view.delayMin > 0) return "delay";
  return "waiting";
}

// 提供「目前進度」區塊：診間此時在做什麼 + 下一位準備中。
// 隱私原則：不洩漏其他病人的療程內容（含金額）。只回時間相關資訊。
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
    nextUp: nextUp
      ? {
          estimatedStart: nextUp.estimatedStart,
        }
      : null,
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
    const result = matches.map((m) => {
      const aheadCount = countAheadOf(schedule, m.id);
      return {
        id: m.id,
        // 病人自己也看到 sanitized 版本（拿掉 $XXXX 金額），避免他人偷瞄手機
        treatment: sanitizeTreatment(m.treatment),
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
