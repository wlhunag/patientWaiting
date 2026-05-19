import type { Article, ArticleTag } from "@/lib/clinic-config";

// 從病人的療程內容字串猜出對應的標籤。
// 比對是寬鬆的（中英文混合），盡可能命中相關文章。
export function tagsFromTreatment(treatment: string): ArticleTag[] {
  const t = (treatment ?? "").toUpperCase();
  const tags: ArticleTag[] = [];

  if (/IMPLANT|植牙|人工牙根/.test(t)) tags.push("IMPLANT");
  if (/VENEER|貼片|美白|WHITEN|BLEACH|美學/.test(t)) {
    tags.push("VENEER", "CROWN");
  }
  if (/CROWN|牙冠|牙橋|BRIDGE|嵌體|INLAY|ONLAY/.test(t)) tags.push("CROWN");
  if (/ORTHO|矯正|BRACE|INVISALIGN|隱適美/.test(t)) tags.push("ORTHO");
  if (/PERIO|牙周|SCALING|洗牙|PROPHY|ROS|FLAP/.test(t)) {
    tags.push("PERIO", "HYGIENE");
  }
  if (/RCT|ENDO|根管|抽神經/.test(t)) tags.push("ENDO");
  if (/\bEXT\b|拔牙|XTRAC|REMOVAL|OPERCULECTOMY/.test(t)) {
    tags.push("EXTRACT");
  }
  if (/DENTURE|假牙|活動|RPD|CD/.test(t)) tags.push("DENTURE");
  if (/FILL|FIL|補牙|樹脂|COMPOSITE|RESIN|OD|MO|DO|MOD/.test(t)) {
    tags.push("GENERAL");
  }

  return tags;
}

// 用 FNV-1a 變形做出 32-bit 整數種子（穩定 hash）
function stableHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned
}

// 用種子做的 LCG，搭配 Fisher-Yates shuffle
function stableShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let s = stableHash(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 48271) + 1) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 依照病人療程，挑出最多 count 篇文章。
// 先用 tag 命中的文章打底，再用其他文章補滿。
// seed 用病人 appointmentId，讓 30 秒自動更新不會換文章，但不同病人會看到不同組合。
export function pickArticlesForTreatment(
  articles: Article[],
  treatment: string,
  count: number,
  seed: string,
): Article[] {
  const wantedTags = new Set(tagsFromTreatment(treatment));

  if (wantedTags.size === 0) {
    return stableShuffle(articles, seed).slice(0, count);
  }

  const matching = articles.filter((a) =>
    a.tags.some((t) => wantedTags.has(t)),
  );
  const others = articles.filter(
    (a) => !a.tags.some((t) => wantedTags.has(t)),
  );

  const shuffledMatching = stableShuffle(matching, seed + "-m");
  const shuffledOthers = stableShuffle(others, seed + "-o");

  return [...shuffledMatching, ...shuffledOthers].slice(0, count);
}
