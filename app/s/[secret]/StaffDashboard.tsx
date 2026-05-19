"use client";

import { useCallback, useEffect, useState } from "react";

type AppointmentView = {
  id: string;
  patientChartNo: string;
  patientName: string;
  patientNameMasked: string;
  treatment: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDurationMin: number;
  status: "waiting" | "in_progress" | "done" | "cancelled";
  actualStart?: string;
  actualEnd?: string;
  estimatedStart: string;
  estimatedEnd: string;
  delayMin: number;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const STATUS_LABEL: Record<AppointmentView["status"], string> = {
  waiting: "等待中",
  in_progress: "看診中",
  done: "已完成",
  cancelled: "已取消",
};

const STATUS_CLASS: Record<AppointmentView["status"], string> = {
  waiting: "bg-slate-100 text-slate-700",
  in_progress: "bg-green-100 text-green-800 ring-2 ring-green-400",
  done: "bg-slate-200 text-slate-500",
  cancelled: "bg-slate-100 text-slate-400 line-through",
};

export default function StaffDashboard({ secret }: { secret: string }) {
  const [schedule, setSchedule] = useState<AppointmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/staff/schedule?s=${encodeURIComponent(secret)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "載入失敗");
      setSchedule(data.schedule);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, [load]);

  const act = async (
    action: "start" | "done" | "cancel" | "clear",
    id: string,
  ) => {
    setActionLoading(`${action}-${id}`);
    try {
      const res = await fetch("/api/staff/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, action, id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "操作失敗");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
    } finally {
      setActionLoading(null);
    }
  };

  const resetDay = async () => {
    if (!confirm("確定要重置今天所有狀態？此動作無法復原")) return;
    setActionLoading("reset");
    try {
      const res = await fetch("/api/staff/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, action: "reset" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "重置失敗");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <p className="p-6 text-center text-slate-500">載入中…</p>;
  }

  const summary = {
    total: schedule.length,
    done: schedule.filter((s) => s.status === "done").length,
    inProgress: schedule.filter((s) => s.status === "in_progress").length,
    waiting: schedule.filter((s) => s.status === "waiting").length,
  };

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">助理控制台</h1>
          <p className="text-xs text-slate-500 mt-1">
            完成 {summary.done} / 看診中 {summary.inProgress} / 等待 {summary.waiting} / 共 {summary.total} 位
          </p>
        </div>
        <button
          onClick={resetDay}
          disabled={actionLoading === "reset"}
          className="text-xs px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          重置今天
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {schedule.length === 0 && (
          <p className="text-center text-slate-500 py-10">
            今天沒有預約
          </p>
        )}
        {schedule.map((a) => (
          <div
            key={a.id}
            className={`p-4 rounded-xl border ${
              a.status === "in_progress"
                ? "border-green-400 bg-green-50"
                : a.status === "done" || a.status === "cancelled"
                ? "border-slate-200 bg-slate-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-lg font-bold tabular-nums">
                {formatTime(a.scheduledStart)}
              </span>
              <span className="text-lg font-medium">{a.patientName}</span>
              <span className="text-xs text-slate-400">
                {a.patientChartNo}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[a.status]}`}
              >
                {STATUS_LABEL[a.status]}
              </span>
              {a.status === "waiting" && a.delayMin > 0 && (
                <span className="text-xs text-amber-700 font-medium">
                  預估延後 {a.delayMin} 分鐘 → {formatTime(a.estimatedStart)}
                </span>
              )}
              {a.status === "in_progress" && a.actualStart && (
                <span className="text-xs text-green-700">
                  {formatTime(a.actualStart)} 開始
                </span>
              )}
              {a.status === "done" && a.actualStart && a.actualEnd && (
                <span className="text-xs text-slate-500">
                  {formatTime(a.actualStart)} – {formatTime(a.actualEnd)}
                </span>
              )}
            </div>
            {a.treatment && (
              <p className="text-sm text-slate-600 mb-3 break-all">
                {a.treatment}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {a.status === "waiting" && (
                <>
                  <button
                    onClick={() => act("start", a.id)}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    開始看診
                  </button>
                  <button
                    onClick={() => act("cancel", a.id)}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg disabled:opacity-50"
                  >
                    病人未到 / 取消
                  </button>
                </>
              )}
              {a.status === "in_progress" && (
                <button
                  onClick={() => act("done", a.id)}
                  disabled={actionLoading !== null}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  完成看診
                </button>
              )}
              {(a.status === "done" || a.status === "cancelled") && (
                <button
                  onClick={() => act("clear", a.id)}
                  disabled={actionLoading !== null}
                  className="px-3 py-1.5 text-sm text-slate-500 underline disabled:opacity-50"
                >
                  還原狀態
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">
        每 20 秒自動更新
      </p>
    </main>
  );
}
