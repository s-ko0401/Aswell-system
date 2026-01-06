# [PROJECT_NAME]

公司內部用系統（Frontend: React + TypeScript / Backend: Laravel / DB: Supabase Postgres）。
本 README 用於「統一開發規則、API 規約、環境與流程」，請所有成員遵守。

## 目錄
- [1. 技術棧與前提](#1-技術棧與前提)
- [2. Repo 結構](#2-repo-結構)
- [3. 環境需求](#3-環境需求)
- [4. 初次啟動（Docker）](#4-初次啟動docker)
- [5. 開發流程規則](#5-開發流程規則)
- [6. API 設計規約（REST）](#6-api-設計規約rest)
- [7. 認證與授權](#7-認證與授權)
- [8. 例外處理與錯誤格式](#8-例外處理與錯誤格式)
- [9. DB（Supabase Postgres）規則](#9-db-supabase-postgres-規則)
- [10. 日誌與監控](#10-日誌與監控)
- [11. 部署與設定](#11-部署與設定)
- [12. FAQ / Troubleshooting](#12-faq--troubleshooting)

---

## 1. 技術棧與前提
- Frontend: React + TypeScript（Vite）
- Backend: Laravel（PHP）
- DB: PostgreSQL（Supabase）
- API: RESTful API（JSON）
- 開發環境：Docker Compose（統一版本與啟動方式）

本系統採前後端分離：
- 前端只負責 UI/狀態管理/呼叫 API
- 後端負責驗證、商業邏輯、DB 存取、回傳一致格式的 JSON

---

## 2. Repo 結構
建議採 monorepo（同一個 repo 同時放前端與後端），範例：

/
frontend/ # React + TS
backend/ # Laravel
infra/ # docker, nginx, scripts (可選)
docker-compose.yml
.env.example
README.md

markdown
複製程式碼

命名原則：
- 前端：`kebab-case` 檔名（React component 可用 `PascalCase.tsx`）
- 後端：Laravel 預設規範（Class `PascalCase`）
- API 路由：`kebab-case`，資源用複數名詞

---

## 3. 環境需求
- Docker Desktop（必須）
- Node.js（若要本機跑前端，版本：LTS）
- Composer（若要本機跑後端，建議仍以 Docker 為主）
- Supabase 專案（已建立 Postgres）

---

## 4. 初次啟動（Docker）
### 4.1 環境變數
複製環境檔：
- 根目錄：`.env.example` → `.env`
- 後端：`backend/.env.example` → `backend/.env`
- 前端：`frontend/.env.example` → `frontend/.env`

必要欄位（示例，依實際替換）：
- Backend
  - `APP_URL=[APP_URL]`
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=[SUPABASE_DB_HOST]`
  - `DB_PORT=5432`
  - `DB_DATABASE=[DB_NAME]`
  - `DB_USERNAME=[DB_USER]`
  - `DB_PASSWORD=[DB_PASSWORD]`
- Frontend
  - `VITE_API_BASE_URL=[API_BASE_URL]`（例如 `https://api.[domain]` 或 Docker network URL）

> 注意：Supabase DB Host/Password 等請使用 Supabase Project 的連線資訊。

### 4.2 啟動
```bash
docker compose up -d --build
4.3 後端初始化（Laravel）
bash
複製程式碼
# 容器內執行（範例）
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate
4.4 前端啟動確認
瀏覽 http://localhost:[FRONTEND_PORT]

API health check：GET /api/health

5. 開發流程規則
5.1 Branch 規則
main: 可部署狀態

develop: 整合分支（如團隊採用）

feature 分支：feature/[ticket]-short-title

fix 分支：fix/[ticket]-short-title

5.2 Commit 規則（建議）
feat: ...

fix: ...

refactor: ...

docs: ...

chore: ...

5.3 PR 規則
必須有：

變更摘要

對應 ticket/議題

API 變更需附上「新增/變更端點」與範例 request/response

Review 至少 1 人通過（依團隊規模調整）

5.4 Code Style / Lint
Frontend：ESLint + Prettier（必須保持通過）

Backend：Laravel Pint（建議）+ 基本 PSR-12

6. API 設計規約（REST）
6.1 基本原則
Base path：/api

全部回傳 application/json

使用名詞（資源）+ HTTP Method 表意，不用動詞路由

資源名稱：複數、小寫、kebab-case

✅ /api/users

✅ /api/order-items

❌ /api/getUsers

❌ /api/userList

6.2 Method 對應
GET /resources：列表（支援分頁、搜尋、排序）

GET /resources/{id}：取得單筆

POST /resources：新增

PUT /resources/{id}：整筆更新（建議前後端一致）

PATCH /resources/{id}：部分更新（若採用需明確規則）

DELETE /resources/{id}：刪除（是否物理刪除依專案定義）

6.3 Query 規則（列表）
列表 API 統一支援下列 query（如不需要可不實作，但命名不可自創）：

page：頁碼（1-based）

per_page：每頁筆數（預設 20，上限 100）

q：關鍵字搜尋（語意由後端定義）

sort：排序欄位（例如 created_at）

order：asc | desc

filter：用欄位名（例如 status=active）

範例：

GET /api/users?page=1&per_page=20&q=tanaka&sort=created_at&order=desc

6.4 HTTP Status 規則
200 OK：成功（GET/PUT/PATCH/DELETE）

201 Created：成功建立（POST）

204 No Content：成功但無回傳 body（可用於 DELETE）

400 Bad Request：參數不合法

401 Unauthorized：未登入

403 Forbidden：無權限

404 Not Found：找不到資源

409 Conflict：資料衝突（unique 等）

422 Unprocessable Entity：表單驗證錯誤（Laravel 常用）

500 Internal Server Error：未預期錯誤

6.5 命名與欄位格式
JSON key：snake_case（與 Laravel 慣例一致，前端用 mapping/型別處理）

日期時間：ISO 8601（UTC 或明確時區；建議 UTC）

金額/數量：數字型別，避免字串

7. 認證與授權
（依實際採用方式擇一，先把規則寫死）

7.1 Token（建議：Laravel Sanctum / JWT）
前端登入後保存 token（建議 HttpOnly cookie 或安全儲存策略）

所有需登入端點必須帶 Authorization: Bearer <token>

7.2 權限（Role-based）
角色範例：admin, manager, staff

後端以 middleware/policy 控制

API 回傳 403 並使用統一錯誤格式

8. 例外處理與錯誤格式
8.1 成功回傳格式（統一）
建議統一以下結構（避免前端每支 API 自行判斷）：

json
複製程式碼
{
  "success": true,
  "data": { },
  "meta": { },
  "message": ""
}
8.2 錯誤回傳格式（統一）
json
複製程式碼
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["The email field is required."]
    }
  }
}
規則：

code：固定 enum（例如 UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR）

details：僅在 422/400 時使用（欄位錯誤）

9. DB（Supabase Postgres）規則
9.1 連線
後端使用 Supabase 提供的 Postgres 連線資訊（host/user/password/db）

不允許把密碼提交到 git（只放 .env.example）

9.2 Migration
DB schema 以 Laravel migration 為準

不允許「直接在 Supabase UI 改 schema 後不回寫 migration」

上線前需確保 migration 可重放（fresh migrate 可完整建表）

9.3 命名
table：snake_case 複數

column：snake_case

pivot：table_a_table_b（依 Laravel 慣例）

10. 日誌與監控
Laravel：使用 storage/logs（容器環境可導出到 stdout）

重要事件需有結構化 log（至少包含 user_id / request_id / action）

錯誤不可把敏感資訊回傳給前端（僅回傳通用 message）

11. 部署與設定
.env 分環境管理：local / staging / production

前端 VITE_API_BASE_URL 需對應環境

CORS：只允許公司指定網域（不要 *）

若有 Nginx/Reverse Proxy：請在 infra/ 記錄設定與路由策略

12. FAQ / Troubleshooting
12.1 CORS 錯誤
確認後端 CORS whitelist

確認前端 VITE_API_BASE_URL

確認 cookie / Authorization header 是否被瀏覽器阻擋

12.2 DB 連不上
確認 Supabase 的 host/port

確認 password 是否正確

確認 Supabase 的網路限制（IP allowlist 等）

12.3 Migration 失敗
檢查 migration 順序與 FK

檢查資料型別（uuid / bigint）

yaml
複製程式碼
