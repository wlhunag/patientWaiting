export type AppointmentStatus = "waiting" | "in_progress" | "done" | "cancelled";

// 從 Google Calendar 抓回來、解析後的原始資料
export interface RawAppointment {
  id: string;                // Google Calendar event id
  patientChartNo: string;    // 病歷號（v@4791）
  patientName: string;       // 姓名（官大程）
  treatment: string;         // 療程內容（#26IMPLANT(OT)+...）
  scheduledStart: string;    // ISO 8601，原約診開始時間
  scheduledEnd: string;      // ISO 8601，原約診結束時間
  scheduledDurationMin: number;
  rawSummary: string;        // 原始 event title 用於除錯
}

// 助理操作儲存於 KV 的狀態
export interface AppointmentState {
  status: Exclude<AppointmentStatus, "waiting">;
  // 「看診中」時記錄 actualStart；「已完成」時記錄 actualStart + actualEnd
  actualStart?: string;
  actualEnd?: string;
}

// 合併原始預約 + 狀態 + 演算法計算後的結果
export interface AppointmentView {
  id: string;
  patientChartNo: string;
  patientName: string;
  patientNameMasked: string; // 顯示給其他人看的遮蔽姓名
  treatment: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDurationMin: number;
  status: AppointmentStatus;
  actualStart?: string;
  actualEnd?: string;
  // 演算法計算後的預估時間
  estimatedStart: string;
  estimatedEnd: string;
  // 相對於原時間延後幾分鐘（正數=delay，負數=提前）
  delayMin: number;
}
