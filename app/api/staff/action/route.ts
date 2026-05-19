import { NextResponse } from "next/server";
import { isValidStaffPath } from "@/lib/auth";
import { setState, clearState, resetDay, getAllStates } from "@/lib/storage";
import type { AppointmentState } from "@/lib/types";

export const dynamic = "force-dynamic";

type ActionBody =
  | { secret: string; action: "start" | "done" | "cancel"; id: string }
  | { secret: string; action: "clear"; id: string }
  | { secret: string; action: "reset" };

export async function POST(req: Request) {
  const body = (await req.json()) as ActionBody;
  if (!isValidStaffPath(body.secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  try {
    if (body.action === "reset") {
      await resetDay(now);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "clear") {
      await clearState(body.id, now);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "start") {
      const state: AppointmentState = {
        status: "in_progress",
        actualStart: nowIso,
      };
      // 如果有別人正在 in_progress，先把他自動標完成（多數情況下助理會忘記按完成）
      const all = await getAllStates(now);
      for (const [id, s] of Object.entries(all)) {
        if (id !== body.id && s.status === "in_progress") {
          await setState(
            id,
            { status: "done", actualStart: s.actualStart, actualEnd: nowIso },
            now,
          );
        }
      }
      await setState(body.id, state, now);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "done") {
      const all = await getAllStates(now);
      const existing = all[body.id];
      const state: AppointmentState = {
        status: "done",
        actualStart: existing?.actualStart ?? nowIso,
        actualEnd: nowIso,
      };
      await setState(body.id, state, now);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "cancel") {
      const state: AppointmentState = { status: "cancelled" };
      await setState(body.id, state, now);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
