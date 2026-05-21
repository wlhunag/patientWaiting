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
      // 不自動把其他 in_progress 標完成 — 允許同時多人看診（跳台）
      const state: AppointmentState = {
        status: "in_progress",
        actualStart: nowIso,
      };
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
