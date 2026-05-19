// 🛠️ 診所資訊設定檔
//
// 修改這個檔案後，整個網站顯示的診所名稱、地址、電話、LINE 等都會自動更新。
// 部署到 Vercel 後，這個檔案的修改要重新部署（git push）才會生效。

import type { IconName, IconColorKey } from "@/components/Icon";

// 文章標籤 — 用於依照病人療程挑選相關文章
export type ArticleTag =
  | "IMPLANT" // 植牙
  | "CROWN" // 牙冠 / 牙橋
  | "VENEER" // 美學貼片
  | "ORTHO" // 矯正
  | "PERIO" // 牙周
  | "ENDO" // 根管
  | "HYGIENE" // 洗牙 / 刷牙
  | "EXTRACT" // 拔牙
  | "DENTURE" // 假牙
  | "GENERAL"; // 通用

export interface Article {
  title: string;
  url: string;
  tag: string; // 文章上方的英文標籤（短）
  readMinutes: number;
  tags: ArticleTag[]; // 用來和療程比對
  color: IconColorKey;
  icon: IconName;
}

export const clinicConfig = {
  // 診所名稱（顯示在頁面上方 logo 和 meta title）
  name: "橙蒔美學牙醫診所",
  logoChar: "橙",
  location: "竹北 · 成功三路",

  // 地址 + 附註
  address: "新竹縣竹北市成功三路 92 號",
  addressNote: "竹北市區 · 平日看診",

  // 聯絡方式
  phone: "03-658-9988",
  lineUrl: "https://page.line.me/835zuren?openQrModal=true",
  mapUrl: "https://maps.google.com/?q=新竹縣竹北市成功三路92號",

  // 對外社群與網站連結
  websiteUrl: "https://smile-tw.com/",
  threadsUrl: "https://www.threads.com/@dr.wenlonghuang",
  threadsHandle: "@dr.wenlonghuang",
  // 看診完成「分享今天的感受」按鈕指向的 Google Maps 評論連結
  googleReviewUrl: "https://maps.app.goo.gl/pUrn3PHtEX7unCHP6",

  // 主治醫師資訊
  doctorName: "黃文龍 醫師",
  doctorAvatarChar: "黃",
  doctorWebsite: "https://smile-tw.com/",

  // 候診小提醒（可自訂任意筆數）
  // 若有 url，整列會變成可點擊連結
  tips: [
    {
      icon: "water" as IconName,
      text: "記得補水，看診前記得刷牙，不要抽菸",
      color: "blue" as IconColorKey,
    },
    {
      icon: "sparkle" as IconName,
      text: "追蹤黃醫師的 Threads，看牙科衛教日常",
      color: "rose" as IconColorKey,
      url: "https://www.threads.com/@dr.wenlonghuang",
    },
  ],

  // 看診完成頁的術後叮嚀
  aftercareTip:
    "如有麻醉，2 小時內請避免進食或熱飲，麻醉退前小心咬到嘴唇。如有不適請隨時聯絡診所。",

  // 衛教文章庫（會依照病人的療程內容隨機挑出 2 篇顯示）
  // 之後增加文章直接在這裡加一筆即可
  articles: [
    {
      title: "假牙邊緣黑黑的怎麼辦？",
      url: "https://smile-tw.com/blog/%e5%81%87%e7%89%99%e9%82%8a%e7%b7%a3%e9%bb%91%e9%bb%91%e7%9a%84%e6%80%8e%e9%ba%bc%e8%be%a6%ef%bc%9f/",
      tag: "CROWN",
      readMinutes: 4,
      tags: ["CROWN", "DENTURE"],
      color: "amber",
      icon: "tooth",
    },
    {
      title: "什麼是 RBFDPs？保留齒質的牙橋方案",
      url: "https://smile-tw.com/blog/rbfdps/",
      tag: "CROWN",
      readMinutes: 5,
      tags: ["CROWN"],
      color: "rose",
      icon: "sparkle",
    },
    {
      title: "牙齒上面白白的是什麼？是蛀牙、脫鈣、還是氟斑？",
      url: "https://smile-tw.com/blog/%e7%89%99%e9%bd%92%e4%b8%8a%e9%9d%a2%e7%99%bd%e7%99%bd%e7%9a%84%e6%98%af%e4%bb%80%e9%ba%bc%ef%bc%9f%e6%98%af%e8%9b%80%e7%89%99%ef%bc%9f%e8%84%ab%e9%88%a3%ef%bc%9f%e6%88%96%e6%98%af%e6%b0%9f%e6%96%91/",
      tag: "GENERAL",
      readMinutes: 4,
      tags: ["GENERAL"],
      color: "green",
      icon: "leaf",
    },
    {
      title: "什麼情況下需要戴牙冠？",
      url: "https://smile-tw.com/blog/need_crown/",
      tag: "CROWN",
      readMinutes: 4,
      tags: ["CROWN"],
      color: "amber",
      icon: "tooth",
    },
    {
      title: "深層洗牙完整指南",
      url: "https://smile-tw.com/blog/%e6%b7%b1%e5%b1%a4%e6%b4%97%e7%89%99%e6%8c%87%e5%8d%97/",
      tag: "HYGIENE",
      readMinutes: 5,
      tags: ["HYGIENE", "PERIO"],
      color: "green",
      icon: "leaf",
    },
    {
      title: "拔牙後要不要用力咬紗布？牙醫師完整解析",
      url: "https://smile-tw.com/blog/%e6%8b%94%e7%89%99%e5%be%8c%e8%a6%81%e4%b8%8d%e8%a6%81%e7%94%a8%e5%8a%9b%e5%92%ac%e7%b4%97%e5%b8%83%ef%bc%9f%e7%89%99%e9%86%ab%e5%b8%ab%e5%ae%8c%e6%95%b4%e8%a7%a3%e6%9e%90/",
      tag: "EXTRACT",
      readMinutes: 4,
      tags: ["EXTRACT"],
      color: "amber",
      icon: "info",
    },
    {
      title: "破解假牙的常見迷思",
      url: "https://smile-tw.com/blog/denture-myth/",
      tag: "DENTURE",
      readMinutes: 5,
      tags: ["DENTURE"],
      color: "rose",
      icon: "sparkle",
    },
    {
      title: "牙齒裂掉了怎麼辦？裂齒症完整介紹",
      url: "https://smile-tw.com/blog/cracked-tooth/",
      tag: "CROWN",
      readMinutes: 5,
      tags: ["CROWN", "ENDO"],
      color: "amber",
      icon: "tooth",
    },
    {
      title: "牙周雷射治療介紹",
      url: "https://smile-tw.com/blog/perio-laser/",
      tag: "PERIO",
      readMinutes: 4,
      tags: ["PERIO"],
      color: "blue",
      icon: "sparkle",
    },
    {
      title: "牙周不好需要拔牙嗎？",
      url: "https://smile-tw.com/blog/perio_ext/",
      tag: "PERIO",
      readMinutes: 4,
      tags: ["PERIO", "EXTRACT"],
      color: "blue",
      icon: "info",
    },
    {
      title: "植牙後遺症有哪些？完整風險評估與預防方法",
      url: "https://smile-tw.com/blog/%e6%a4%8d%e7%89%99%e5%be%8c%e9%81%ba%e7%97%87%e6%9c%89%e5%93%aa%e4%ba%9b%ef%bc%9f%e5%ae%8c%e6%95%b4%e9%a2%a8%e9%9a%aa%e8%a9%95%e4%bc%b0%e8%88%87%e9%a0%90%e9%98%b2%e6%96%b9%e6%b3%95/",
      tag: "IMPLANT",
      readMinutes: 6,
      tags: ["IMPLANT"],
      color: "amber",
      icon: "info",
    },
    {
      title: "植牙後的保養重點",
      url: "https://smile-tw.com/blog/implant-care/",
      tag: "IMPLANT",
      readMinutes: 4,
      tags: ["IMPLANT"],
      color: "green",
      icon: "leaf",
    },
    {
      title: "牙橋 vs 植牙：牙橋的五大缺點解析",
      url: "https://smile-tw.com/blog/%e7%89%99%e6%a9%8b-vs-%e6%a4%8d%e7%89%99%ef%bc%9a%e7%89%99%e6%a9%8b%e7%9a%84%e4%ba%94%e5%a4%a7%e7%bc%ba%e9%bb%9e%e8%a7%a3%e6%9e%90%ef%bc%9a%e7%82%ba%e4%bb%80%e9%ba%bc%e6%a4%8d%e7%89%99%e5%8f%af/",
      tag: "IMPLANT",
      readMinutes: 5,
      tags: ["IMPLANT", "CROWN"],
      color: "blue",
      icon: "tooth",
    },
    {
      title: "刷牙這 90 秒，藏著大學問",
      url: "https://smile-tw.com/blog/brush_clean/",
      tag: "DAILY",
      readMinutes: 3,
      tags: ["HYGIENE", "GENERAL"],
      color: "green",
      icon: "leaf",
    },
    {
      title: "LH 矯正系統介紹",
      url: "https://smile-tw.com/blog/lh_ortho/",
      tag: "ORTHO",
      readMinutes: 5,
      tags: ["ORTHO"],
      color: "rose",
      icon: "sparkle",
    },
    {
      title: "醫療級植牙的標準",
      url: "https://smile-tw.com/blog/medi_implant/",
      tag: "IMPLANT",
      readMinutes: 4,
      tags: ["IMPLANT"],
      color: "blue",
      icon: "tooth",
    },
    {
      title: "矯正牙齒後中線一定會完美嗎？",
      url: "https://smile-tw.com/blog/%e7%9f%af%e6%ad%a3%e7%89%99%e9%bd%92%e5%be%8c%e4%b8%ad%e7%b7%9a%e4%b8%80%e5%ae%9a%e6%9c%83%e5%ae%8c%e7%be%8e%e5%97%8e/",
      tag: "ORTHO",
      readMinutes: 4,
      tags: ["ORTHO"],
      color: "rose",
      icon: "sparkle",
    },
    {
      title: "門牙補樹脂會容易掉嗎？附上科學數據",
      url: "https://smile-tw.com/blog/%e9%96%80%e7%89%99%e8%a3%9c%e6%a8%b9%e8%84%82%e6%9c%83%e5%ae%b9%e6%98%93%e6%8e%89%e5%97%8e%ef%bc%9f%e9%99%84%e4%b8%8a%e7%a7%91%e5%ad%b8%e6%95%b8%e6%93%9a/",
      tag: "GENERAL",
      readMinutes: 5,
      tags: ["GENERAL"],
      color: "blue",
      icon: "info",
    },
  ] as Article[],
};

export type ClinicConfig = typeof clinicConfig;
