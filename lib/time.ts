const TZ = "Asia/Taipei";

// 取得「今天」在台北時區的 yyyy-mm-dd 字串
export function todayInTaipei(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // en-CA 會給 yyyy-mm-dd
}

// 取得今日範圍（台北時區）的 UTC ISO 字串：00:00 與隔日 00:00
export function todayRangeUtc(now: Date = new Date()): { start: string; end: string } {
  const date = todayInTaipei(now);
  // 台北 = UTC+8，沒有夏令時間，直接加 24 小時就是隔天 00:00（台北）
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// 格式化 ISO 為 HH:mm（台北時區）
export function formatHHmm(iso: string): string {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(d);
}

export function diffMinutes(aIso: string, bIso: string): number {
  return Math.round((new Date(aIso).getTime() - new Date(bIso).getTime()) / 60000);
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}
