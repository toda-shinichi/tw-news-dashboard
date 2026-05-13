# 新聞輿情風向儀

台灣新聞輿情即時分析儀表板，整合台灣媒體 RSS、Google News、GDELT 國際視角與 NewsAPI，搭配 AI 情緒分析與輿情總結。

---

## 功能特色

- **雙欄設計**：左欄台灣輿情（台灣媒體 + NewsAPI），右欄國際視角（GDELT + Google News）
- **時間維度切換**：今天 / 三天 / 本週 / 本月
- **AI 功能**：每期輿情總結、新聞情緒標籤（正/負/中）、高頻議題關鍵詞
- **6 小時快取**：Vercel KV（生產）/ 記憶體（本地開發）
- **RWD**：桌面雙欄、行動裝置單欄

---

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| 樣式 | Tailwind CSS |
| AI API | OpenAI 相容介面（banana2556） |
| 快取 | Vercel KV → fallback 記憶體 |
| 新聞來源 | RSS × 13、NewsAPI、GDELT 2.0 |
| 部署 | Vercel（免費方案） |

---

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入以下必要變數：

```env
CPA_API_KEY=your_banana2556_api_key
NEWS_API_KEY=your_newsapi_key        # 可選，無則略過 NewsAPI
NEXT_PUBLIC_SITE_TITLE=新聞輿情風向儀  # 可自訂
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000

---

## 部署至 Vercel

### Step 1 — 推送至 GitHub

```bash
git init
git add .
git commit -m "init: tw-news-dashboard"
gh repo create tw-news-dashboard --public --push
```

### Step 2 — 匯入至 Vercel

1. 前往 [vercel.com](https://vercel.com) → **Add New Project**
2. 選取剛建立的 GitHub repo
3. Framework Preset 選 **Next.js**，其餘保留預設
4. 點擊 **Deploy**（先跳過環境變數，後面再設）

### Step 3 — 設定 Upstash Redis（快取）

Vercel KV 已棄用，請改用 Upstash Redis：

1. Vercel Dashboard → 你的專案 → **Integrations** → 搜尋 **Upstash Redis** → **Add Integration**
2. 在 Upstash 建立免費 Database（台灣最近選 `ap-northeast-1`）
3. 回到 Vercel → Connect 到你的專案
4. `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 會自動注入

### Step 4 — 設定環境變數

Vercel Dashboard → 你的專案 → **Settings** → **Environment Variables**

| 變數名稱 | 說明 | 必要 |
|----------|------|------|
| `CPA_API_KEY` | banana2556 API Key | 是 |
| `NEWS_API_KEY` | NewsAPI.org Key | 否 |
| `NEXT_PUBLIC_SITE_TITLE` | 網站標題 | 否 |

填完後點 **Redeploy** 讓設定生效。

### Step 5 — 驗證部署

- 開啟 Vercel 分配的網址
- 確認頁面可正常載入新聞
- 檢查 Vercel Dashboard → **Logs** 確認無錯誤

---

## 環境變數說明

詳見 [.env.example](.env.example)

---

## 新聞來源

### 台灣媒體 RSS（左欄）
中央社、聯合新聞網、中時電子報、自由時報、民視新聞、ETtoday、風傳媒、TVBS

### Google News RSS（左欄 + 右欄）
台灣政治、台灣社會、台灣財經（→ 左欄）；Taiwan international、兩岸關係（→ 右欄）

### NewsAPI.org（左欄）
查詢關鍵字：`taiwan OR 台灣`，免費方案每天 100 次

### GDELT 2.0（右欄）
查詢 Taiwan 相關英文國際報導，免費無 API Key

---

## 快取策略

| 快取 Key | TTL | 說明 |
|----------|-----|------|
| `news:{tab}:{col}` | 6 小時 | 各 Tab + 欄位的新聞列表 |
| `summary:{tab}` | 6 小時 | AI 輿情總結 |
| `keywords:{tab}` | 6 小時 | 高頻關鍵詞 |

本地開發未設 KV 時，快取存於記憶體（重啟後清空）。

---

## AI 模型設定

| 功能 | Model | 說明 |
|------|-------|------|
| 情緒分析 | `gpt-5.4-mini` | 批次處理，每批最多 20 篇 |
| 輿情總結 | `gpt-5.4` | 每期一次，有 6h 快取 |
| 關鍵詞萃取 | `gpt-5.4-mini` | 取前 50 篇標題分析 |

Base URL：`https://api.banana2556.com/v1`（OpenAI 相容格式）

---

## 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── news/route.ts       # 新聞彙整 API
│   │   ├── summary/route.ts    # AI 輿情總結 API
│   │   └── keywords/route.ts   # 關鍵詞萃取 API
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── TabBar.tsx
│   ├── SummaryBanner.tsx
│   ├── KeywordCloud.tsx
│   ├── NewsCard.tsx
│   ├── NewsColumn.tsx
│   └── LoadingState.tsx
├── lib/
│   ├── rss.ts          # RSS 解析（13 個 feed）
│   ├── newsapi.ts      # NewsAPI.org
│   ├── gdelt.ts        # GDELT 2.0
│   ├── ai.ts           # AI 分析（banana2556）
│   ├── cache.ts        # Vercel KV / 記憶體快取
│   └── utils.ts        # 工具函式
└── types/
    └── index.ts
```
