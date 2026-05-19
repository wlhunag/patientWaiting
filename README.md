# 牙科候診時間查詢系統

讓病人輸入姓名即可查詢預估看診時間。系統會從 Google Calendar 讀取當日預約，並由助理「按下開始看診」即時更新進度，動態推算後面每位病人的等待時間。

## 系統架構

```
┌─ Google Calendar（你目前用的行事曆，不需改）
│
└─→ Next.js（部署到 Vercel）
    ├─ 病人端：/           （輸入姓名 → 看到等待時間）

    狀態儲存：Upstash Redis（每天自動清除）
```

---

## 第一次設定（從零開始大約 30 分鐘）

### Step 1：拿到 Google Calendar API Key

1. 開啟 [Google Cloud Console](https://console.cloud.google.com)
2. 左上角點「Select a project」→「New Project」→ 取個名字（例如 `dental-clinic`）→ Create
3. 等待約一分鐘建立完成後，進入該專案
4. 左側選單 → 「APIs & Services」→「Library」
5. 搜尋 `Google Calendar API` → 點進去 → 按 **Enable**
6. 左側選單 → 「APIs & Services」→「Credentials」
7. 上方按 **+ CREATE CREDENTIALS** → **API key**
8. 複製這串 API Key（之後要用），先存到記事本
9. （選用，建議做）按「Edit API key」→ 在 **API restrictions** 限制只能用 Google Calendar API

### Step 2：取得行事曆 ID

如果之後換行事曆，從 Google Calendar 設定的「整合行事曆」可以找到。

### Step 3：建立 Upstash Redis（儲存當日進度）

1. 到 [Upstash Console](https://console.upstash.com/) → 用 Google 登入
2. **Create Database**
   - Name: `dental-clinic`
   - Type: Regional
   - Region: 選 `ap-northeast-1`（東京，離台灣近）
   - 點 Create
3. 進入這個 database 的詳細頁
4. 往下找 **REST API** 區塊，複製：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 4：本機測試

1. 把這個資料夾的 `.env.example` 複製一份成 `.env.local`
2. 編輯 `.env.local`，填入剛剛拿到的資訊：
   ```
   GOOGLE_CALENDAR_API_KEY=AIzaSy...剛剛複製的
   GOOGLE_CALENDAR_ID=p.calendar.google.com
   STAFF_SECRET_PATH=隨便想一串長字串例如abcd1234efgh5678
   KV_REST_API_URL=https://...upstash.io（剛剛複製的）
   KV_REST_API_TOKEN=AaIxAA...（剛剛複製的）
   TZ=Asia/Taipei
   ```
3. 開啟 PowerShell，cd 到專案資料夾，執行：
   ```powershell
   npm run dev
   ```
4. 開瀏覽器：
   - 病人端：http://localhost:3000
   - 助理端：http://localhost:3000/s/你剛剛設定的STAFF_SECRET_PATH

如果一切正常，輸入今天行事曆上的病人姓名就會看到等待時間。

### Step 5：部署到 Vercel

1. 把這個資料夾上傳到 GitHub（建議；也可以用 Vercel CLI 直接 deploy）
   ```powershell
   git init
   git add .
   git commit -m "initial"
   # 在 GitHub 開新 repo，然後：
   git remote add origin <你的repo網址>
   git push -u origin main
   ```
2. 到 [vercel.com](https://vercel.com) → Sign up（用 GitHub 登入最快）
3. **Add New → Project** → 選擇剛剛 push 的 repo → Import
4. 在 **Environment Variables** 區塊，把 `.env.local` 裡面那五個變數一個個貼上：
   - `GOOGLE_CALENDAR_API_KEY`
   - `GOOGLE_CALENDAR_ID`
   - `STAFF_SECRET_PATH`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
5. 按 **Deploy**，等約 2 分鐘
6. 部署完成後會給你一個網址，例如 `https://dental-clinic-abc.vercel.app`

### Step 6：產生 QR Code 給病人

用任何 QR Code 產生器（例如 https://www.qrcode-monkey.com）輸入：
```
https://你的vercel網址/
```
列印出來貼在候診區。


---

## 平常怎麼用

### 病人端
1. 病人掃 QR Code → 輸入姓名
2. 看到「預估還要等 X 分鐘」「您前面還有 N 位」
3. 自動每 30 秒更新

### 助理端
1. 開啟助理網址，看到今日完整名單
2. 病人到場、開始看診時 → 按「開始看診」
3. 看診結束 → 按「完成看診」
4. 病人沒到 → 按「病人未到 / 取消」（不會影響後面的等待估算）
5. 按錯了 → 按「還原狀態」

> 小技巧：如果忘記按「完成看診」就按下一位的「開始看診」，系統會自動把前一位標記為完成（結束時間 = 當下）。

---


## 隱私設計

- 病人端輸入姓名後，**只看得到自己**的等待資訊
- 從不顯示其他病人姓名或療程
- 同名同姓會列出對應的療程讓本人挑選（這部分是必要的）

---

## 常見問題

**Q: API 用量會不會收費？**
- Google Calendar API 免費額度：每天 100 萬次。實際用不到 1000 次。
- Upstash Redis 免費額度：每天 10000 commands。實際用不到 500。
- Vercel Hobby plan：個人專案完全免費。
- 結論：以個人診所規模，這個系統長期免費。

**Q: 如果我改了行事曆，多久會反映？**
- 系統會快取 60 秒，最久 1 分鐘看到更新。

**Q: 同時段約了三個病人怎麼辦？**
- 目前是按時間順序「序列排隊」，所以可能會把第二、第三位的預估時間往後排。
- 若你的診所經常有時段重疊的並行看診，請告訴我，我加入「平行 slot」邏輯。

**Q: 怎麼讓某位病人比預約時間更早叫號？**
- 直接在助理端按他的「開始看診」即可，系統會以實際時間為準。

---

## 技術棧

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Google Calendar API (API Key, public calendar)
- Upstash Redis (serverless KV)
- Vercel hosting
