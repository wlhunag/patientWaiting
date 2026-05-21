"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, colors, type IconColorKey } from "@/components/Icon";
import { clinicConfig, type Article } from "@/lib/clinic-config";

// ─── Types (匹配 /api/lookup 回傳格式) ─────────────────────────
type UiMode =
  | "waiting"
  | "nextup"
  | "delay"
  | "insession"
  | "done"
  | "cancelled";

type Progress = {
  // 隱私原則：不包含其他病人的療程內容
  inSession: {
    startedMinutesAgo: number;
    plannedDurationMin: number;
  } | null;
  nextUp: { estimatedStart: string } | null;
};

type Match = {
  id: string;
  // 注意：刻意不包含 treatment 欄位，伺服器不會傳給病人端
  scheduledStart: string;
  scheduledEnd: string;
  estimatedStart: string;
  estimatedEnd: string;
  scheduledDurationMin: number;
  status: "waiting" | "in_progress" | "done" | "cancelled";
  mode: UiMode;
  actualStart?: string;
  delayMin: number;
  aheadCount: number;
  waitMinutes: number;
  progress: Progress;
  articles: Article[];
};

// ─── Helpers ────────────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const TC = {
  bg: "var(--c-bg)",
  bgDeep: "var(--c-bg-deep)",
  ink: "var(--c-ink)",
  inkSoft: "var(--c-ink-soft)",
  inkMute: "var(--c-ink-mute)",
  line: "var(--c-line)",
  orange: "var(--c-orange)",
  orangeBg: "var(--c-orange-bg)",
  amber: "var(--c-amber)",
  amberBg: "var(--c-amber-bg)",
  green: "var(--c-green)",
  greenBg: "var(--c-green-bg)",
  blue: "var(--c-blue)",
  blueBg: "var(--c-blue-bg)",
  rose: "var(--c-rose)",
  roseBg: "var(--c-rose-bg)",
};

// ─── Main page ──────────────────────────────────────────────────
export default function PatientPage() {
  const [name, setName] = useState("");
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowStr, setNowStr] = useState<string>("");

  // 「即時更新」時鐘
  useEffect(() => {
    const update = () => setNowStr(formatTime(new Date().toISOString()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const lookup = useCallback(
    async (queryName: string, keepSelectedId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: queryName }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "查詢失敗");
          setMatches(null);
          return;
        }
        const newMatches: Match[] = data.matches;
        setMatches(newMatches);
        if (keepSelectedId) {
          // 自動更新時保留已選擇的那筆
          const same = newMatches.find((m) => m.id === keepSelectedId);
          if (same) setSelected(same);
        } else if (newMatches.length === 1) {
          setSelected(newMatches[0]);
        } else if (newMatches.length === 0) {
          setSelected(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "網路錯誤");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 自動每 30 秒更新
  useEffect(() => {
    if (!submittedName) return;
    const id = setInterval(() => {
      lookup(submittedName, selected?.id);
    }, 30_000);
    return () => clearInterval(id);
  }, [submittedName, selected?.id, lookup]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmittedName(trimmed);
    setSelected(null);
    lookup(trimmed);
  };

  const onReset = () => {
    setName("");
    setSubmittedName(null);
    setMatches(null);
    setSelected(null);
    setError(null);
  };

  // ─── Render branches ──────────────────────────────────────────
  if (!submittedName) {
    return <NameInputForm name={name} setName={setName} onSubmit={onSubmit} />;
  }

  if (loading && !matches) {
    return <LoadingScreen />;
  }

  if (matches && matches.length === 0) {
    return (
      <NotFound submittedName={submittedName} onReset={onReset} error={error} />
    );
  }

  if (matches && matches.length > 1 && !selected) {
    return (
      <MultiMatch
        matches={matches}
        onPick={setSelected}
        onReset={onReset}
      />
    );
  }

  if (selected) {
    const patientName = submittedName;
    if (selected.mode === "done") {
      return <DoneView patientName={patientName} match={selected} onReset={onReset} />;
    }
    if (selected.mode === "cancelled") {
      return <CancelledView onReset={onReset} />;
    }
    return (
      <RichView
        patientName={patientName}
        match={selected}
        nowStr={nowStr}
        onReset={onReset}
      />
    );
  }

  return null;
}

// ─── Name input form ────────────────────────────────────────────
function NameInputForm({
  name,
  setName,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        display: "flex",
        flexDirection: "column",
        padding: "16px 18px 40px",
      }}
    >
      <ClinicTopBar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 430,
          width: "100%",
          margin: "0 auto",
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-noto-serif-tc), serif",
            fontSize: 28,
            color: TC.ink,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          歡迎光臨
        </div>
        <div
          style={{
            fontSize: 14,
            color: TC.inkMute,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          請輸入您預約時使用的姓名
        </div>

        <form onSubmit={onSubmit}>
          <CardBox padding={22} radius={20}>
            <label
              style={{
                fontSize: 11,
                color: TC.inkMute,
                fontWeight: 700,
                letterSpacing: 1.5,
                display: "block",
                marginBottom: 8,
              }}
            >
              您的姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="例：王小明"
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 22,
                color: TC.ink,
                fontFamily: "inherit",
                border: "none",
                borderBottom: `1.5px solid ${TC.line}`,
                background: "transparent",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              style={{
                marginTop: 20,
                width: "100%",
                padding: 16,
                borderRadius: 14,
                background: TC.orange,
                color: "#fff",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                boxShadow: `0 4px 12px var(--c-amber-bg)`,
              }}
            >
              查詢候診時間
              <Icon name="arrow" size={16} color="#fff" />
            </button>
          </CardBox>

          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 14,
              background: TC.amberBg,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Icon name="info" size={18} color={TC.amber} />
            <div
              style={{
                fontSize: 12,
                color: TC.inkSoft,
                lineHeight: 1.6,
              }}
            >
              查詢結果只會顯示您本人的等待資訊，不會洩漏其他病人姓名。
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Loading / Not found / Cancelled ───────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: TC.inkMute,
        fontSize: 14,
      }}
    >
      查詢中…
    </div>
  );
}

function NotFound({
  submittedName,
  onReset,
  error,
}: {
  submittedName: string;
  onReset: () => void;
  error: string | null;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        padding: "16px 18px",
      }}
    >
      <ClinicTopBar />
      <div
        style={{
          maxWidth: 430,
          margin: "60px auto 0",
        }}
      >
        <CardBox padding={28} radius={22}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: TC.amberBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="search" size={32} color={TC.amber} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              fontSize: 22,
              color: TC.ink,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            找不到您的預約
          </div>
          <div
            style={{
              fontSize: 13,
              color: TC.inkMute,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            「{submittedName}」今天沒有對應的預約。請確認姓名是否正確，或洽櫃台。
          </div>
          {error && (
            <div
              style={{
                fontSize: 12,
                color: TC.orange,
                background: TC.orangeBg,
                padding: 10,
                borderRadius: 10,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
          <button
            onClick={onReset}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: TC.orange,
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            重新輸入
          </button>
        </CardBox>
      </div>
    </div>
  );
}

function CancelledView({ onReset }: { onReset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        padding: "16px 18px",
      }}
    >
      <ClinicTopBar />
      <div style={{ maxWidth: 430, margin: "60px auto 0" }}>
        <CardBox padding={28} radius={22}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#f3eee5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="info" size={32} color={TC.inkMute} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              fontSize: 20,
              color: TC.ink,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            這筆預約已取消
          </div>
          <div
            style={{
              fontSize: 13,
              color: TC.inkMute,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            如有疑問請洽櫃台
          </div>
          <button
            onClick={onReset}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: TC.bgDeep,
              color: TC.ink,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            返回
          </button>
        </CardBox>
      </div>
    </div>
  );
}

// ─── Multi-match picker ───────────────────────────────────────
function MultiMatch({
  matches,
  onPick,
  onReset,
}: {
  matches: Match[];
  onPick: (m: Match) => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        padding: "16px 18px 40px",
      }}
    >
      <ClinicTopBar />
      <div style={{ maxWidth: 430, margin: "30px auto 0" }}>
        <div
          style={{
            fontSize: 13,
            color: TC.inkSoft,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          您今日有多筆預約，請選擇您要查詢的療程：
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <CardBox padding={16} radius={16}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: TC.roseBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="calendar" size={24} color={TC.rose} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        color: TC.ink,
                        fontWeight: 700,
                      }}
                    >
                      {formatTime(m.scheduledStart)} – {formatTime(m.scheduledEnd)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: TC.inkMute,
                        marginTop: 3,
                        lineHeight: 1.4,
                      }}
                    >
                      預估 {m.scheduledDurationMin} 分鐘
                    </div>
                  </div>
                  <Icon name="arrow" size={16} color={TC.inkMute} />
                </div>
              </CardBox>
            </button>
          ))}
        </div>
        <button
          onClick={onReset}
          style={{
            marginTop: 20,
            width: "100%",
            padding: 12,
            background: "transparent",
            border: "none",
            color: TC.inkMute,
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          重新輸入姓名
        </button>
      </div>
    </div>
  );
}

// ─── Rich view (主要 5 種 mode 的顯示) ────────────────────────
function RichView({
  patientName,
  match,
  nowStr,
  onReset,
}: {
  patientName: string;
  match: Match;
  nowStr: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        maxWidth: 460,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <CFTopBar mode={match.mode} nowStr={nowStr} delayMin={match.delayMin} />
      <CFHero patientName={patientName} match={match} />
      <CFAppointment match={match} />
      {match.mode !== "insession" && <CFProgress progress={match.progress} />}
      <CFTips />
      <CFConnect />
      <CFPosts articles={match.articles} />
      <CFFooter />
      <div
        style={{
          textAlign: "center",
          padding: "0 18px 32px",
        }}
      >
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            border: "none",
            color: TC.inkMute,
            fontSize: 12,
            textDecoration: "underline",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          重新查詢
        </button>
      </div>
    </div>
  );
}

// ─── Small UI primitives ───────────────────────────────────────
function CardBox({
  children,
  padding = 18,
  radius = 18,
  style = {},
}: {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding,
        borderRadius: radius,
        background: "#fff",
        boxShadow:
          "0 1px 2px rgba(60,40,20,0.04), 0 8px 24px rgba(60,40,20,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  icon,
  text,
  color,
  bg,
}: {
  icon?: React.ComponentProps<typeof Icon>["name"];
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {icon && <Icon name={icon} size={12} color={color} />}
      {text}
    </div>
  );
}

function DocAvatar({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${TC.amberBg} 0%, ${TC.roseBg} 100%)`,
        border: "2px solid #fff",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-fraunces), serif",
        fontSize: size * 0.4,
        color: TC.orange,
        fontWeight: 600,
        boxShadow: "0 1px 3px rgba(60,40,20,0.08)",
      }}
    >
      {clinicConfig.doctorAvatarChar}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "16px 18px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: TC.ink,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Top bar with clinic logo + live update pill ──────────────
function ClinicTopBar() {
  return (
    <div
      style={{
        padding: "20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: TC.orange,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-fraunces), serif",
          color: "#fff",
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {clinicConfig.logoChar}
      </div>
      <div style={{ textAlign: "left" }}>
        <div
          style={{
            fontSize: 14,
            color: TC.ink,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {clinicConfig.name}
        </div>
        <div style={{ fontSize: 11, color: TC.inkMute, marginTop: 1 }}>
          {clinicConfig.location}
        </div>
      </div>
    </div>
  );
}

function CFTopBar({
  mode,
  nowStr,
  delayMin,
}: {
  mode: UiMode;
  nowStr: string;
  delayMin: number;
}) {
  const delay = mode === "delay" || delayMin > 0;
  const insession = mode === "insession";
  const dotColor = insession ? TC.green : delay ? TC.orange : TC.green;
  const label = insession
    ? "看診中"
    : delay
      ? `延遲 ${delayMin} 分鐘`
      : nowStr
        ? `${nowStr} 即時`
        : "即時更新";

  return (
    <div
      style={{
        padding: "20px 18px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <a
        href={clinicConfig.websiteUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: TC.orange,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-fraunces), serif",
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
            boxShadow: `0 4px 12px var(--c-amber-bg)`,
          }}
        >
          {clinicConfig.logoChar}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              color: TC.ink,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {clinicConfig.name}
          </div>
          <div style={{ fontSize: 11, color: TC.inkMute, marginTop: 1 }}>
            {clinicConfig.location}
          </div>
        </div>
      </a>
      <div
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          background: "#fff",
          fontSize: 11,
          color: TC.inkSoft,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: 7,
            height: 7,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: dotColor,
              opacity: 0.4,
              animation: "cf-ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
          <span
            style={{
              position: "relative",
              borderRadius: "50%",
              width: 7,
              height: 7,
              background: dotColor,
            }}
          />
        </span>
        {label}
      </div>
    </div>
  );
}

// ─── Hero card (5 modes) ──────────────────────────────────────
function CFHero({ patientName, match }: { patientName: string; match: Match }) {
  const mode = match.mode;
  const insession = mode === "insession";
  const nextup = mode === "nextup";
  const delay = mode === "delay";

  const tagColor = insession
    ? TC.green
    : nextup
      ? TC.rose
      : TC.orange;
  const tagBg = insession
    ? TC.greenBg
    : nextup
      ? TC.roseBg
      : delay
        ? TC.amberBg
        : TC.orangeBg;
  const tagIcon = insession ? "check" : nextup ? "bell" : "clock";
  const tagText = insession
    ? "看診中"
    : nextup
      ? "即將輪到您"
      : delay
        ? `延遲 ${match.delayMin} 分鐘`
        : "候診中";

  const bigNumberColor = insession ? TC.green : nextup ? TC.rose : TC.orange;
  const time = insession ? null : nextup ? match.waitMinutes : match.waitMinutes;
  const label = insession
    ? "您正在看診中"
    : nextup
      ? `${patientName}，準備一下`
      : delay
        ? "不好意思，再請您稍等"
        : `${patientName}，大約再`;

  const sub = insession
    ? "請放輕鬆，我們會好好照顧您"
    : nextup
      ? "馬上會為您準備診療椅"
      : `預計 ${formatTime(match.estimatedStart)} 為您看診`;

  const bgBlob = insession ? TC.greenBg : nextup ? TC.roseBg : delay ? TC.amberBg : TC.orangeBg;

  return (
    <div style={{ padding: "8px 18px 0" }}>
      <CardBox padding={22} radius={24} style={{ position: "relative", overflow: "hidden" }}>
        {/* decorative blobs */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: bgBlob,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 30,
            right: 80,
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: bgBlob,
            opacity: 0.5,
          }}
        />

        <div style={{ position: "relative" }}>
          <Pill icon={tagIcon} text={tagText} color={tagColor} bg={tagBg} />

          <div
            style={{
              fontSize: 14,
              color: TC.inkSoft,
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            {label}
          </div>

          {time !== null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div
                style={{
                  fontFamily: "var(--font-fraunces), serif",
                  fontSize: 80,
                  lineHeight: 0.95,
                  color: bigNumberColor,
                  fontWeight: 700,
                  letterSpacing: -2,
                }}
              >
                {time}
              </div>
              <div style={{ fontSize: 22, color: TC.ink, fontWeight: 600 }}>
                分鐘
              </div>
            </div>
          ) : (
            <div
              style={{
                fontFamily: "var(--font-noto-serif-tc), serif",
                fontSize: 28,
                color: TC.ink,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              請放鬆，我們在這。
            </div>
          )}

          <div style={{ fontSize: 12, color: TC.inkMute, marginTop: 10 }}>{sub}</div>

          {/* Ahead-of-you dots */}
          {!insession && (
            <div
              style={{
                marginTop: 18,
                padding: "12px 14px",
                borderRadius: 14,
                background: TC.bg,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <DotsRow ahead={match.aheadCount} nextup={nextup} />
              <div
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: TC.ink,
                  fontWeight: 700,
                }}
              >
                {nextup ? (
                  <>
                    下一位就是您{" "}
                    <span style={{ color: TC.rose }}>✨</span>
                  </>
                ) : (
                  <>
                    您前面還有{" "}
                    <span style={{ color: TC.orange }}>{match.aheadCount}</span> 位
                  </>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: TC.inkMute,
                  textAlign: "right",
                  lineHeight: 1.4,
                }}
              >
                預計
                <br />
                {match.scheduledDurationMin} 分鐘
              </div>
            </div>
          )}

          {/* CTA buttons (delay / nextup) */}
          {delay && (
            <a
              href={clinicConfig.lineUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                marginTop: 12,
                width: "100%",
                padding: 14,
                borderRadius: 14,
                background: TC.orange,
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              <Icon name="msg" size={16} color="#fff" />
              用 LINE 告訴櫃台「我晚點到」
            </a>
          )}
          {nextup && (
            <div
              style={{
                marginTop: 12,
                width: "100%",
                padding: 14,
                borderRadius: 14,
                background: TC.rose,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxSizing: "border-box",
              }}
            >
              <Icon name="bell" size={16} color="#fff" />
              請至診療椅準備
            </div>
          )}
        </div>
      </CardBox>
    </div>
  );
}

function DotsRow({ ahead, nextup }: { ahead: number; nextup: boolean }) {
  const total = Math.max(3, Math.min(ahead + 1, 5));
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < total - 1 - (nextup ? 0 : Math.max(0, total - 1 - ahead));
        const isYou = nextup ? i === total - 1 : false;
        // Simplification: 已過的位置實心，您的位置用 orange 圈起來
        const filled = i < (total - 1 - ahead) || (nextup && i < total - 1);
        return (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: filled
                ? TC.amber
                : isYou
                  ? TC.orange
                  : "transparent",
              border:
                filled || isYou
                  ? "none"
                  : `1.5px dashed ${TC.amber}`,
              boxShadow: isYou ? `0 0 0 4px var(--c-amber-bg)` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Appointment card ─────────────────────────────────────────
function CFAppointment({ match }: { match: Match }) {
  return (
    <Section title="您的預約">
      <CardBox padding={16}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: TC.roseBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="tooth" size={26} color={TC.rose} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                color: TC.ink,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              今日預約看診
            </div>
            <div
              style={{
                fontSize: 12,
                color: TC.inkMute,
                marginTop: 2,
              }}
            >
              共 {match.scheduledDurationMin} 分鐘
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            background: TC.line,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {(
            [
              {
                icon: "calendar" as const,
                label: "時間",
                value: `今日 ${formatTime(match.scheduledStart)} – ${formatTime(match.scheduledEnd)}`,
                color: "blue" as IconColorKey,
              },
              {
                icon: "user" as const,
                label: "醫師",
                value: clinicConfig.doctorName,
                color: "green" as IconColorKey,
                hasAvatar: true,
                url: clinicConfig.doctorWebsite,
              },
              {
                icon: "clock" as const,
                label: "預估",
                value: `${formatTime(match.estimatedStart)}${
                  match.delayMin > 0 ? `（延後 ${match.delayMin} 分鐘）` : ""
                }`,
                color: (match.delayMin > 0 ? "amber" : "green") as IconColorKey,
              },
            ] as {
              icon: React.ComponentProps<typeof Icon>["name"];
              label: string;
              value: string;
              color: IconColorKey;
              hasAvatar?: boolean;
              url?: string;
            }[]
          ).map((r) => {
            const inner = (
              <>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: colors[r.color].bg,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={r.icon} size={16} color={colors[r.color].fg} />
                </div>
                <div style={{ fontSize: 11, color: TC.inkMute, width: 40 }}>
                  {r.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: TC.ink,
                    fontWeight: 600,
                    wordBreak: "break-all",
                  }}
                >
                  {r.value}
                </div>
                {r.hasAvatar && <DocAvatar size={28} />}
                {r.url && (
                  <Icon name="arrow" size={14} color={TC.inkMute} />
                )}
              </>
            );

            const rowStyle: React.CSSProperties = {
              padding: "11px 14px",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "inherit",
            };

            return r.url ? (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                style={rowStyle}
              >
                {inner}
              </a>
            ) : (
              <div key={r.label} style={rowStyle}>
                {inner}
              </div>
            );
          })}
        </div>
      </CardBox>
    </Section>
  );
}

// ─── Progress (替代「診間此刻」) ───────────────
// 隱私設計：只顯示時間進度，不洩漏其他病人的療程內容、姓名、金額
function CFProgress({ progress }: { progress: Progress }) {
  type Item = {
    label: string;
    title: string;
    sub: string;
    icon: React.ComponentProps<typeof Icon>["name"];
    color: IconColorKey;
    status: "active" | "preparing";
    progress: number;
  };
  const items: Item[] = [];

  if (progress.inSession) {
    const { startedMinutesAgo, plannedDurationMin } = progress.inSession;
    const remaining = Math.max(0, plannedDurationMin - startedMinutesAgo);
    items.push({
      label: "目前看診中",
      title: `已進行約 ${startedMinutesAgo} 分鐘`,
      sub:
        plannedDurationMin > 0
          ? `預計約再 ${remaining} 分鐘結束`
          : "看診進行中",
      icon: "user",
      color: "amber",
      status: "active",
      progress:
        plannedDurationMin > 0
          ? Math.min(1, startedMinutesAgo / plannedDurationMin)
          : 0,
    });
  }
  if (progress.nextUp) {
    items.push({
      label: "下一位準備中",
      title: `預計 ${formatTime(progress.nextUp.estimatedStart)} 開始`,
      sub: "助理會親自前來引導",
      icon: "clock",
      color: "blue",
      status: "preparing",
      progress: 0,
    });
  }

  if (items.length === 0) return null;

  return (
    <Section
      title="目前進度"
      action={
        <div
          style={{
            fontSize: 10,
            color: TC.inkMute,
            padding: "4px 8px",
            borderRadius: 999,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Icon name="info" size={10} color={TC.inkMute} />
          已去識別化
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((r, i) => (
          <CardBox key={i} padding={12} radius={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: colors[r.color].bg,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={r.icon} size={22} color={colors[r.color].fg} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: TC.inkMute,
                    fontFamily: "var(--font-inter)",
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: TC.ink,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {r.title}
                </div>
                <div style={{ fontSize: 11, color: TC.inkMute, marginTop: 2 }}>
                  {r.sub}
                </div>
                {r.status === "active" && (
                  <div
                    style={{
                      marginTop: 8,
                      height: 4,
                      borderRadius: 2,
                      background: TC.bg,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${r.progress * 100}%`,
                        background: colors[r.color].fg,
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  color: r.status === "active" ? TC.orange : TC.inkMute,
                  background:
                    r.status === "active" ? TC.orangeBg : TC.bgDeep,
                  whiteSpace: "nowrap",
                }}
              >
                {r.status === "active" ? "進行中" : "準備中"}
              </div>
            </div>
          </CardBox>
        ))}
      </div>
    </Section>
  );
}

// ─── Tips ──────────────────────────────────────────────────────
function CFTips() {
  return (
    <Section title="候診小提醒">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {clinicConfig.tips.map((t, i) => {
          const hasLink = "url" in t && Boolean(t.url);
          const inner = (
            <>
              <Icon name={t.icon} size={18} color={colors[t.color].fg} />
              <div
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: TC.ink,
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {t.text}
              </div>
              {hasLink && (
                <Icon name="arrow" size={14} color={colors[t.color].fg} />
              )}
            </>
          );
          const baseStyle: React.CSSProperties = {
            padding: "12px 14px",
            borderRadius: 14,
            background: colors[t.color].bg,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          };
          return hasLink ? (
            <a
              key={i}
              href={(t as { url: string }).url}
              target="_blank"
              rel="noreferrer"
              style={baseStyle}
            >
              {inner}
            </a>
          ) : (
            <div key={i} style={baseStyle}>
              {inner}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ─── 認識橙蒔 (網站 + Threads) — 醒目放置 ────────────────────
function CFConnect() {
  const links: {
    title: string;
    sub: string;
    url: string;
    icon: React.ComponentProps<typeof Icon>["name"];
    color: IconColorKey;
  }[] = [
    {
      title: "黃文龍醫師網站",
      sub: "smile-tw.com",
      url: clinicConfig.websiteUrl,
      icon: "globe",
      color: "amber",
    },
    {
      title: "Threads",
      sub: clinicConfig.threadsHandle,
      url: clinicConfig.threadsUrl,
      icon: "at",
      color: "rose",
    },
  ];
  return (
    <Section title="認識黃醫師">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {links.map((l) => (
          <a
            key={l.title}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <CardBox padding={14} radius={16}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: colors[l.color].bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={l.icon} size={22} color={colors[l.color].fg} />
                </div>
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: TC.ink,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {l.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TC.inkMute,
                      marginTop: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {l.sub}
                  </div>
                </div>
              </div>
            </CardBox>
          </a>
        ))}
      </div>
    </Section>
  );
}

// ─── Posts ─────────────────────────────────────────────────────
// 文章已在伺服器端依病人療程挑選好（不會把療程名稱傳到前端）
function CFPosts({ articles }: { articles: Article[] }) {
  const posts = articles;
  if (posts.length === 0) return null;
  return (
    <Section
      title="候診時讀一下"
      action={
        <a
          href={`${clinicConfig.websiteUrl}blog/`}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 11,
            color: TC.orange,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          看更多 →
        </a>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map((p) => (
          <a
            key={p.title}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <CardBox padding={12} radius={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${colors[p.color].bg} 0%, #fff 100%)`,
                    border: `1px solid ${TC.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={p.icon} size={24} color={colors[p.color].fg} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: colors[p.color].fg,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {p.tag}
                    <span
                      style={{
                        width: 2,
                        height: 2,
                        borderRadius: "50%",
                        background: TC.inkMute,
                      }}
                    />
                    <span style={{ color: TC.inkMute, letterSpacing: 0 }}>
                      {p.readMinutes} 分鐘閱讀
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: TC.ink,
                      fontWeight: 600,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {p.title}
                  </div>
                </div>
                <Icon name="arrow" size={14} color={TC.inkMute} />
              </div>
            </CardBox>
          </a>
        ))}
      </div>
    </Section>
  );
}

// ─── Footer (map + contact) ───────────────────────────────────
function CFFooter() {
  return (
    <div style={{ padding: "16px 18px 40px" }}>
      <div
        style={{
          borderRadius: 18,
          background: TC.ink,
          color: "#fff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 96,
            position: "relative",
            background: `
              linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%),
              repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px),
              repeating-linear-gradient(-45deg, transparent 0 24px, rgba(255,255,255,0.03) 24px 25px)
            `,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50% 50% 50% 0",
                background: TC.orange,
                transform: "rotate(-45deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  transform: "rotate(45deg)",
                  fontFamily: "var(--font-fraunces), serif",
                  fontSize: 16,
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {clinicConfig.logoChar}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            {clinicConfig.address}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
            {clinicConfig.addressNote}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {[
              {
                icon: "map" as const,
                label: "導航",
                color: "blue" as IconColorKey,
                url: clinicConfig.mapUrl,
              },
              {
                icon: "phone" as const,
                label: clinicConfig.phone,
                color: "green" as IconColorKey,
                url: `tel:${clinicConfig.phone.replace(/[^\d+]/g, "")}`,
              },
              {
                icon: "msg" as const,
                label: "LINE",
                color: "amber" as IconColorKey,
                url: clinicConfig.lineUrl,
              },
            ].map((b) => (
              <a
                key={b.icon}
                href={b.url}
                target={b.icon === "phone" ? undefined : "_blank"}
                rel="noreferrer"
                style={{
                  padding: "10px 0",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <Icon name={b.icon} size={14} color={colors[b.color].fg} />
                {b.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Done view ─────────────────────────────────────────────────
function DoneView({
  patientName,
  match,
  onReset,
}: {
  patientName: string;
  match: Match;
  onReset: () => void;
}) {
  const minutes = match.scheduledDurationMin;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TC.bg,
        maxWidth: 460,
        margin: "0 auto",
        padding: "20px 18px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 24,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: TC.greenBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 24px var(--c-green-bg)`,
          }}
        >
          <Icon name="check" size={52} color={TC.green} />
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: "var(--font-noto-serif-tc), serif",
            fontSize: 26,
            color: TC.ink,
            fontWeight: 700,
          }}
        >
          看診完成！
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: TC.inkSoft,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          {patientName}，謝謝您今天來到{clinicConfig.name}。
          <br />
          路上小心，記得溫柔對待新做的笑容。
        </div>
      </div>

      <CardBox padding={16} radius={18} style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 10,
            color: TC.inkMute,
            fontWeight: 700,
            letterSpacing: 1.5,
            marginBottom: 10,
          }}
        >
          今日摘要
        </div>
        <a
          href={clinicConfig.doctorWebsite}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <DocAvatar size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: TC.ink, fontWeight: 600 }}>
              {clinicConfig.doctorName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: TC.inkMute,
                marginTop: 2,
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              共 {minutes} 分鐘看診
            </div>
          </div>
          <Icon name="arrow" size={16} color={TC.inkMute} />
        </a>
      </CardBox>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: TC.amberBg,
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Icon name="info" size={18} color={TC.orange} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              color: TC.ink,
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            術後叮嚀
          </div>
          <div style={{ fontSize: 12, color: TC.inkSoft, lineHeight: 1.5 }}>
            {clinicConfig.aftercareTip}
          </div>
        </div>
      </div>

      <a
        href={clinicConfig.googleReviewUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: 16,
          borderRadius: 14,
          background: TC.orange,
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        <Icon name="star" size={16} color="#fff" />
        分享今天的感受
      </a>
      <a
        href={clinicConfig.threadsUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: 14,
          borderRadius: 14,
          background: "#fff",
          color: TC.ink,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          boxSizing: "border-box",
          border: `1px solid ${TC.line}`,
        }}
      >
        <Icon name="at" size={16} color={TC.rose} />
        追蹤黃醫師 Threads
      </a>
      <button
        onClick={onReset}
        style={{
          marginTop: 8,
          width: "100%",
          padding: 12,
          background: "transparent",
          color: TC.inkMute,
          fontSize: 13,
          fontWeight: 500,
          border: "none",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        關閉
      </button>
    </div>
  );
}
