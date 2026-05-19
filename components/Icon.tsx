// 直接從 design/direction-c.jsx 的 CIcon 元件 port 過來
// 全部使用相同的 viewBox、strokeWidth 等視覺參數

export type IconName =
  | "clock"
  | "tooth"
  | "sparkle"
  | "syringe"
  | "search"
  | "calendar"
  | "user"
  | "pin"
  | "phone"
  | "msg"
  | "map"
  | "leaf"
  | "water"
  | "arrow"
  | "check"
  | "bell"
  | "info"
  | "at"
  | "globe"
  | "star";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = "#2A1E15" }: IconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "tooth":
      return (
        <svg {...p}>
          <path d="M7 4c-2 0-3 1.5-3 4 0 3 1.5 4 2 6 .5 2 .5 6 2 6s1.5-3 2-5c.3-1 .7-1 1 0 .5 2 .5 5 2 5s1.5-4 2-6c.5-2 2-3 2-6 0-2.5-1-4-3-4-1.5 0-2.5 1-3.5 1S8.5 4 7 4z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...p}>
          <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z" />
        </svg>
      );
    case "syringe":
      return (
        <svg {...p}>
          <path d="M14 4l6 6M11 7l6 6-4 4-6-6zM7 13l-3 3M4 16l4 4" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l4 4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...p}>
          <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...p}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" />
        </svg>
      );
    case "msg":
      return (
        <svg {...p}>
          <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2z" />
        </svg>
      );
    case "map":
      return (
        <svg {...p}>
          <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...p}>
          <path d="M4 20c0-9 7-15 16-15-1 9-6 15-15 15zM4 20l9-9" />
        </svg>
      );
    case "water":
      return (
        <svg {...p}>
          <path d="M12 3s7 8 7 13a7 7 0 01-14 0c0-5 7-13 7-13z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 20a2 2 0 004 0" />
        </svg>
      );
    case "info":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8v.5" />
        </svg>
      );
    case "at":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v6a2 2 0 002 2 3 3 0 003-3v-1a9 9 0 10-3.5 7.1" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 010 18" />
          <path d="M12 3a14 14 0 000 18" />
        </svg>
      );
    case "star":
      return (
        <svg {...p}>
          <path d="M12 3l2.7 5.5 6 .9-4.4 4.2 1 6L12 16.9 6.7 19.6l1-6L3.3 9.4l6-.9z" />
        </svg>
      );
    default:
      return null;
  }
}

// 給療程內容推測 icon（從關鍵字判斷）
export function treatmentIcon(treatment: string): IconName {
  const t = treatment.toLowerCase();
  if (/implant|植牙/.test(t)) return "tooth";
  if (/veneer|貼片|美白|whitening/.test(t)) return "sparkle";
  if (/洗牙|cleaning|scaling|prophy/.test(t)) return "leaf";
  if (/x.?ray|拍片|檢查|check|consult|諮詢/.test(t)) return "search";
  if (/麻醉|injection|inj|注射/.test(t)) return "syringe";
  if (/根管|endo|rct/.test(t)) return "tooth";
  if (/拆線|換藥|追蹤|follow/.test(t)) return "calendar";
  return "tooth";
}

// 顏色族系（與 design tokens 對應）
export type IconColorKey =
  | "orange"
  | "amber"
  | "green"
  | "blue"
  | "rose"
  | "ink";

export const colors: Record<
  IconColorKey,
  { fg: string; bg: string }
> = {
  orange: { fg: "#C2410C", bg: "#FDE8D4" },
  amber: { fg: "#D97742", bg: "#FBE3CA" },
  green: { fg: "#65864F", bg: "#DBE8CC" },
  blue: { fg: "#5778A5", bg: "#D8E3F0" },
  rose: { fg: "#B86C7A", bg: "#F2DDE2" },
  ink: { fg: "#2A1E15", bg: "#F2EADB" },
};
