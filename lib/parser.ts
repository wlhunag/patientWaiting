// 解析 Google Calendar event title 的格式：
//   v@4791-官大程-#26IMPLANT(OT)+頂鼻竇+補骨+15.16ROS $28000!
// 規則：以第一個 "-" 切出病歷號，以第二個 "-" 切出姓名，剩下都是療程
//
// 容錯：
//   - 如果沒有預期格式（例如純文字 event），整段視為 patientName，
//     病歷號和療程留空
//   - 若姓名包含 "-"，因為我們只切前兩個 "-"，所以姓名中有 "-" 會被當成療程一部分；
//     這部分有問題的話之後再加更聰明的邏輯

export interface ParsedSummary {
  patientChartNo: string;
  patientName: string;
  treatment: string;
}

export function parseSummary(rawSummary: string): ParsedSummary {
  const summary = (rawSummary ?? "").trim();
  if (!summary) {
    return { patientChartNo: "", patientName: "", treatment: "" };
  }

  // 找前兩個 "-"
  const firstDash = summary.indexOf("-");
  if (firstDash === -1) {
    return {
      patientChartNo: "",
      patientName: normalizeName(summary),
      treatment: "",
    };
  }
  const secondDash = summary.indexOf("-", firstDash + 1);
  if (secondDash === -1) {
    return {
      patientChartNo: summary.slice(0, firstDash).trim(),
      patientName: normalizeName(summary.slice(firstDash + 1)),
      treatment: "",
    };
  }

  return {
    patientChartNo: summary.slice(0, firstDash).trim(),
    patientName: normalizeName(summary.slice(firstDash + 1, secondDash)),
    treatment: summary.slice(secondDash + 1).trim(),
  };
}

// 把療程內容裡的「價錢」拿掉，避免別人偷瞄手機看到金額。
// 支援：$28000 / $ 72,000 / $ 28000 !  → 全部清掉
// 同時清掉尾端孤立的 ! 與多餘空白。
export function sanitizeTreatment(treatment: string): string {
  if (!treatment) return "";
  return treatment
    .replace(/\s*\$\s*[\d,]+\s*!?/g, "") // 移除 $金額（含後面的驚嘆號）
    .replace(/\s+!+\s*$/g, "")             // 收尾孤立的驚嘆號
    .replace(/\s+/g, " ")                  // 多重空白合併
    .trim();
}

// 把姓名「正規化」：去掉頭尾的非中文/非英數字字元，並做 trim。
// 處理助理 key in 時的常見 typo：多打了 "/"、"\"、"・"、空格、"-" 等。
//
// 中間字元不動（保留全形字、罕用字）；只動頭尾。
// 例： "/劉晏廷"   → "劉晏廷"
//      " 劉晏廷 " → "劉晏廷"
//      "-劉晏廷"  → "劉晏廷"
//      "劉晏廷／" → "劉晏廷"
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(
      /^[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9]+/u,
      "",
    )
    .replace(
      /[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9]+$/u,
      "",
    );
}

// 把姓名遮蔽：保留首尾，中間用 O 代替
//   官大程 → 官O程
//   王小明 → 王O明
//   林志玲 → 林O玲
//   王明   → 王O
//   王     → 王
export function maskName(name: string): string {
  const chars = Array.from(name);
  if (chars.length <= 1) return name;
  if (chars.length === 2) return chars[0] + "O";
  return chars[0] + "O".repeat(chars.length - 2) + chars[chars.length - 1];
}
