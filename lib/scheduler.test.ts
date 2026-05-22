import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSchedule } from "./scheduler";
import type { AppointmentState, RawAppointment } from "./types";

// 工具：建立一筆預約（最少欄位）
function appt(
  id: string,
  scheduledStart: string,
  scheduledEnd: string,
  scheduledDurationMin: number,
): RawAppointment {
  return {
    id,
    patientChartNo: `chart-${id}`,
    patientName: `patient-${id}`,
    treatment: "",
    scheduledStart,
    scheduledEnd,
    scheduledDurationMin,
    rawSummary: "",
  };
}

// 工具：把 "HH:mm" + 今天日期，組成 ISO 字串（台北時區）
function t(hhmm: string): string {
  // 用一個固定日期 2026-05-22（與測試無關，只要前後一致）
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2026, 4, 22, hh - 8, mm, 0, 0)); // 台北 = UTC+8
  return d.toISOString();
}

// 工具：把 ISO 字串轉回 "HH:mm"（給斷言失敗時看比較好懂）
function fmt(iso: string): string {
  const d = new Date(iso);
  const taipei = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return `${String(taipei.getUTCHours()).padStart(2, "0")}:${String(taipei.getUTCMinutes()).padStart(2, "0")}`;
}

describe("computeSchedule — 等待時間估算", () => {
  it("情境 1：A 看診中、尚未超時 → B 正常倒數", () => {
    // A 約 2:00-2:30、actualStart 2:00、in_progress
    // B 約 2:30-3:00、waiting
    // now = 2:25（A 還沒到 plannedEnd）
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {
      A: { status: "in_progress", actualStart: t("14:00") },
    };
    const now = new Date(t("14:25"));
    const [vA, vB] = computeSchedule([A, B], states, now);

    assert.equal(fmt(vA.estimatedEnd), "14:30", "A 的 estimatedEnd 應該還是 plannedEnd 2:30");
    assert.equal(fmt(vB.estimatedStart), "14:30", "B 從 2:30 開始（沒延遲）");
    assert.equal(vB.delayMin, 0);
  });

  it("情境 2：A 看診中且已超時 → B 顯示 buffer，不會跳成 0", () => {
    // A 約 2:00-2:30、actualStart 2:00、in_progress（已超時 10 分鐘）
    // B 約 2:30-3:00、waiting
    // now = 2:40
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {
      A: { status: "in_progress", actualStart: t("14:00") },
    };
    const now = new Date(t("14:40"));
    const [, vB] = computeSchedule([A, B], states, now);

    // OVERRUN_BUFFER_MIN = 5 → B 至少要等到 now + 5 = 2:45
    assert.equal(fmt(vB.estimatedStart), "14:45", "B 的 estimatedStart 應該被推到 now + 5 分鐘");
    assert.equal(vB.delayMin, 15, "B 延遲 15 分鐘（從 2:30 變 2:45）");
  });

  it("情境 3：A 延後開始（actualStart 比 scheduledStart 晚）→ 延遲完整傳遞", () => {
    // A 約 2:00-2:30、actualStart 2:20、in_progress
    // B 約 2:30-3:00、waiting
    // now = 2:25
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {
      A: { status: "in_progress", actualStart: t("14:20") },
    };
    const now = new Date(t("14:25"));
    const [vA, vB] = computeSchedule([A, B], states, now);

    assert.equal(fmt(vA.estimatedEnd), "14:50", "A 預計 2:20 + 30 = 2:50 結束");
    assert.equal(fmt(vB.estimatedStart), "14:50", "B 被往後推到 2:50");
    assert.equal(vB.delayMin, 20, "B 延遲 20 分鐘");
  });

  it("情境 4：A 已完成 (done) → 之後沒有 in_progress 時，B 不被往後推", () => {
    // A 約 2:00-2:30、actualEnd 2:25、done（提早結束）
    // B 約 2:30-3:00、waiting
    // now = 2:28
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {
      A: { status: "done", actualStart: t("14:00"), actualEnd: t("14:25") },
    };
    const now = new Date(t("14:28"));
    const [, vB] = computeSchedule([A, B], states, now);

    assert.equal(fmt(vB.estimatedStart), "14:30", "B 仍按原排程 2:30");
    assert.equal(vB.delayMin, 0);
  });

  it("情境 5：A 還在 waiting 但已過 scheduledStart → 延遲傳遞給 B", () => {
    // A 約 2:00-2:30、status waiting（助理沒按開始）
    // B 約 2:30-3:00、waiting
    // now = 2:25
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {};
    const now = new Date(t("14:25"));
    const [vA, vB] = computeSchedule([A, B], states, now);

    // A 估從 now 開始 → 2:25 + 30 = 2:55
    assert.equal(fmt(vA.estimatedStart), "14:25");
    assert.equal(fmt(vA.estimatedEnd), "14:55");
    assert.equal(fmt(vB.estimatedStart), "14:55", "B 被推到 A 預估結束時間");
    assert.equal(vB.delayMin, 25);
  });

  it("情境 6：兩位平行 in_progress（跳台）→ B 等到最晚的那位結束", () => {
    // A actualStart 2:00、plannedEnd 2:30、in_progress
    // B actualStart 2:10、plannedEnd 2:40、in_progress
    // C 約 2:30、waiting
    // now = 2:35（兩位都還在）
    const A = appt("A", t("14:00"), t("14:30"), 30);
    const B = appt("B", t("14:10"), t("14:40"), 30);
    const C = appt("C", t("14:30"), t("15:00"), 30);
    const states: Record<string, AppointmentState> = {
      A: { status: "in_progress", actualStart: t("14:00") },
      B: { status: "in_progress", actualStart: t("14:10") },
    };
    const now = new Date(t("14:35"));
    const [, , vC] = computeSchedule([A, B, C], states, now);

    // A.plannedEnd 2:30、buffer floor 2:40 → A.estimatedEnd = 2:40
    // B.plannedEnd 2:40、buffer floor 2:40 → B.estimatedEnd = 2:40
    // carryOver = 2:40 → C.estimatedStart = 2:40
    assert.equal(fmt(vC.estimatedStart), "14:40");
    assert.equal(vC.delayMin, 10);
  });
});
