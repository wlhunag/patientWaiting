import { addMinutes, diffMinutes } from "./time";
import { maskName, normalizeName } from "./parser";
import type {
  AppointmentState,
  AppointmentView,
  RawAppointment,
} from "./types";

// 當 in_progress 病人已經超過原訂結束時間，仍未被標記完成時，
// 我們假設「至少還要再做這麼多分鐘」才會結束，避免後面病人 waitMinutes 變 0。
const OVERRUN_BUFFER_MIN = 5;

// 用「時間值」（getTime）比較兩個 ISO 字串，避免字串比較被時區寫法影響。
// 例：Google Calendar 回傳 "2026-05-22T14:00:00+08:00"、now 是 UTC "2026-05-22T06:00:00.000Z"，
//     兩者代表「同一時刻」，但字串比較會錯判 "T14" > "T06"。
function isAfter(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}
function laterOf(a: string, b: string): string {
  return isAfter(a, b) ? a : b;
}

/**
 * 把原始預約 + 助理操作狀態，計算成「預估時間」的 view。
 *
 * 演算法（依時間順序處理）：
 *   carryOver = 目前時間（初始值）
 *   for each appointment (依原約診時間排序):
 *     - done:        estimatedStart = actualStart, estimatedEnd = actualEnd
 *                    carryOver = max(carryOver, actualEnd)
 *     - in_progress: estimatedStart = actualStart
 *                    estimatedEnd   = max(actualStart + 預定長度, now + OVERRUN_BUFFER_MIN)
 *                    carryOver = max(carryOver, estimatedEnd)
 *                    （超時保護：若已過原訂結束時間仍未按完成，至少預留 buffer 分鐘）
 *     - cancelled:   estimatedStart = scheduledStart, estimatedEnd = scheduledEnd
 *                    不更新 carryOver
 *     - waiting:     estimatedStart = max(scheduledStart, carryOver)
 *                    estimatedEnd   = estimatedStart + 預定長度
 *                    carryOver = estimatedEnd
 *
 * 已知簡化：
 *   1) 時段重疊（例如三位病人都約 10:00）會被序列化堆疊。
 *   2) 多人 in_progress（跳台）時，carryOver 取最晚的 estimatedEnd，
 *      會略為保守地估計後續病人的等待時間。
 */
export function computeSchedule(
  appointments: RawAppointment[],
  states: Record<string, AppointmentState>,
  now: Date = new Date(),
): AppointmentView[] {
  const nowIso = now.toISOString();
  let carryOver = nowIso;

  return appointments.map((appt): AppointmentView => {
    const state = states[appt.id];
    const status = state?.status ?? "waiting";

    let estimatedStart: string;
    let estimatedEnd: string;

    if (status === "done") {
      estimatedStart = state!.actualStart ?? appt.scheduledStart;
      estimatedEnd = state!.actualEnd ?? appt.scheduledEnd;
      carryOver = laterOf(carryOver, estimatedEnd);
    } else if (status === "in_progress") {
      estimatedStart = state!.actualStart ?? appt.scheduledStart;
      const plannedEnd = addMinutes(estimatedStart, appt.scheduledDurationMin);
      // 超時保護：若 plannedEnd 已過去，假設至少還要 OVERRUN_BUFFER_MIN 分鐘
      const overrunFloor = addMinutes(nowIso, OVERRUN_BUFFER_MIN);
      estimatedEnd = laterOf(plannedEnd, overrunFloor);
      carryOver = laterOf(carryOver, estimatedEnd);
    } else if (status === "cancelled") {
      estimatedStart = appt.scheduledStart;
      estimatedEnd = appt.scheduledEnd;
      // 不影響 carryOver
    } else {
      // waiting
      estimatedStart = laterOf(appt.scheduledStart, carryOver);
      estimatedEnd = addMinutes(estimatedStart, appt.scheduledDurationMin);
      carryOver = estimatedEnd;
    }

    return {
      id: appt.id,
      patientChartNo: appt.patientChartNo,
      patientName: appt.patientName,
      patientNameMasked: maskName(appt.patientName),
      treatment: appt.treatment,
      scheduledStart: appt.scheduledStart,
      scheduledEnd: appt.scheduledEnd,
      scheduledDurationMin: appt.scheduledDurationMin,
      status,
      actualStart: state?.actualStart,
      actualEnd: state?.actualEnd,
      estimatedStart,
      estimatedEnd,
      delayMin: diffMinutes(estimatedStart, appt.scheduledStart),
    };
  });
}

// 給病人端查詢：根據姓名找出對應的 view（同名同姓會回多筆）
// 比對前會先做正規化，吃掉助理或病人輸入時的頭尾 typo。
export function findByName(
  views: AppointmentView[],
  inputName: string,
): AppointmentView[] {
  const target = normalizeName(inputName);
  if (!target) return [];
  return views.filter((v) => normalizeName(v.patientName) === target);
}

// 計算「我前面還有幾位等待中的病人」
export function countAheadOf(
  views: AppointmentView[],
  appointmentId: string,
): number {
  const idx = views.findIndex((v) => v.id === appointmentId);
  if (idx === -1) return 0;
  // 在我前面（按 estimatedStart 排）、狀態為 waiting 或 in_progress 的
  const me = views[idx];
  const meTime = new Date(me.estimatedStart).getTime();
  return views.filter(
    (v) =>
      v.id !== appointmentId &&
      (v.status === "waiting" || v.status === "in_progress") &&
      new Date(v.estimatedStart).getTime() <= meTime,
  ).length;
}
