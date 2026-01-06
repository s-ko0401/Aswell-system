# [PROJECT_NAME]

公司內部系統（Frontend: React + TypeScript / Backend: Laravel / DB: Supabase Postgres）。
本 README 用於統一開發規則、API 規約、環境與流程，請所有成員遵守。

> 建議新成員先閱讀：第 6 章啟動流程 + 第 7、8 章規則。

## 目錄
- [1. 技術棧與前提](#1-技術棧與前提)
- [2. Versions](#2-versions)
- [3. Frontend 技術構成與規約（React）](#3-frontend-技術構成與規約react)
- [4. Repo 結構](#4-repo-結構)
- [5. 環境需求](#5-環境需求)
- [6. 初次啟動（Docker）](#6-初次啟動docker)
- [7. 開發流程規則](#7-開發流程規則)
- [8. API 設計規約（REST）](#8-api-設計規約rest)
- [9. 認證與授權](#9-認證與授權)
- [10. 例外處理與錯誤格式](#10-例外處理與錯誤格式)
- [11. DB（Supabase Postgres）規則](#11-db-supabase-postgres-規則)
- [12. 日誌與監控](#12-日誌與監控)
- [13. 部署與設定](#13-部署與設定)
- [14. FAQ / Troubleshooting](#14-faq--troubleshooting)

---

## 1. 技術棧與前提
- Frontend: React + TypeScript（Vite）
- Backend: Laravel（PHP）
- DB: PostgreSQL（Supabase）
- API: RESTful API（JSON）
- 開發環境：Docker Compose（統一版本與啟動方式）

本系統採前後端分離：
- 前端只負責 UI / 狀態管理 / 呼叫 API
- 後端負責驗證、商業邏輯、DB 存取與回傳一致格式的 JSON

## 2. Versions
### 2.1 Backend
- PHP: 8.3.26
- Composer: >= 2.7
- Laravel: 11.x
- Auth: JWT
- Database: PostgreSQL 15 (Supabase)

### 2.2 Frontend
- Node.js: v22.20.0
- Package Manager: npm 10.x
- React: 18.x
- TypeScript: 5.x
- Vite: 5.x

### 2.3 Infrastructure
- Docker: >= 24.x
- Docker Compose: v2

## 3. Frontend 技術構成與規約（React）
### 3.1 使用技術一覽
| 分類 | 技術 |
| --- | --- |
| Framework | React + TypeScript |
| Build Tool | Vite |
| 通信 | axios |
| 状態管理（UI状態） | Jotai |
| サーバー状態 / キャッシュ | TanStack Query |
| フォーム管理 | React Hook Form |
| バリデーション | Zod |
| CSS | Tailwind CSS |
| UI コンポーネント | shadcn/ui |
| テーブル | TanStack Table |
| グラフ | Recharts |
| デプロイ | Vercel |
| 認証 | JWT（Bearer Token） |

### 3.2 状態管理ルール
#### 3.2.1 状態の責務分離（重要）
状態は役割ごとに明確に分けること。

| 種類 | 使用ライブラリ | 用途 |
| --- | --- | --- |
| UI状態 | Jotai | モーダル開閉、選択中ID、表示切替など |
| サーバー状態 | TanStack Query | APIレスポンス、一覧データ、詳細データ |
| フォーム入力 | React Hook Form | 入力中の値、エラー状態 |

禁止：
- APIレスポンスを Jotai に保存する
- フォームの値を useState で管理する
- TanStack Query を「単なる state 管理」として使う

### 3.3 通信（axios）規約
#### 3.3.1 axios 共通設定
- axios は必ず共通インスタンスを使用
- Base URL は `VITE_API_BASE_URL` から取得
- 認証は Authorization Header に JWT を付与（`Authorization: Bearer <JWT>`）

#### 3.3.2 レスポンス取り扱い
- API レスポンスはそのまま UI に流さない
- 必要に応じて変換（DTO的な役割）を挟む

### 3.4 認証方式（JWT）
#### 3.4.1 認証概要
- Backend（Laravel）で JWT を発行
- Frontend は JWT を保持し、API 通信時に付与
- 認証必須 API は Backend 側で auth middleware を適用

#### 3.4.2 JWT 保持ルール（重要）
- 原則：HttpOnly Cookie 推奨
- localStorage 使用時は以下を厳守：XSS 対策、token 直参照禁止（必ず axios interceptor 経由）

#### 3.4.3 フロント側責務
- 未認証時は API を叩かない
- 401 を受け取った場合はログアウト処理を行う

### 3.5 フォーム設計ルール
#### 3.5.1 使用方針
- すべてのフォームは React Hook Form を使用
- バリデーションは Zod に一本化
- フロー：React Hook Form（入力管理） -> Zod（バリデーションスキーマ）

#### 3.5.2 禁止事項
- onChange + useState によるフォーム管理
- バリデーションロジックの分散（if 文での個別チェック）

### 3.6 UI / CSS 規約
#### 3.6.1 Tailwind CSS
- 基本は Tailwind の utility class を使用
- 共通スタイルは component 化する
- 長すぎる class は cn() + 定数化を検討

#### 3.6.2 shadcn/ui
- 原則 shadcn/ui をベースに拡張
- 独自 UI をゼロから作らない
- デザイン統一を最優先

### 3.7 テーブル・グラフ
#### 3.7.1 テーブル（TanStack Table）
- 一覧表示は TanStack Table を使用
- ページング・ソート・フィルタは Table 側で制御
- API は「生データ提供」に徹する

#### 3.7.2 グラフ（Recharts）
- 集計処理は Backend or Selector 層
- Component 内で複雑な計算は禁止

### 3.8 デプロイ（Vercel）
#### 3.8.1 基本方針
- main ブランチ -> Production
- feature / PR -> Preview Deploy
- 環境変数は Vercel 側で管理

#### 3.8.2 環境変数例
- `VITE_API_BASE_URL=https://api.example.com`

### 3.9 重要な思想
> 本プロジェクトでは「状態の責務分離」「技術の役割固定」「例外を作らない」ことを最優先とする。
> 迷った場合は新しいやり方を増やさず、既存ルールに合わせること。

## 4. Repo 結構
建議採 monorepo（同一個 repo 同時放前端與後端），範例如下：

```text
/
frontend/        # React + TS
backend/         # Laravel
infra/           # docker, nginx, scripts（可選）
docker-compose.yml
.env.example
README.MD
```

命名原則：
- 前端：`kebab-case` 檔名（React component 可用 `PascalCase.tsx`）
- 後端：Laravel 預設規範（Class `PascalCase`）
- API 路由：`kebab-case`，資源用複數名詞

## 5. 環境需求
- Docker Desktop（必須）
- Node.js（若要本機跑前端，版本：LTS）
- Composer（若要本機跑後端，建議仍以 Docker 為主）
- Supabase 專案（已建立 Postgres）

## 6. 初次啟動（Docker）
### 6.1 環境變數
複製環境檔：
- 根目錄：`.env.example` -> `.env`
- 後端：`backend/.env.example` -> `backend/.env`
- 前端：`frontend/.env.example` -> `frontend/.env`

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

### 6.2 啟動
```bash
docker compose up -d --build
```

### 6.3 後端初始化（Laravel）
```bash
# 容器內執行
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan jwt:secret
docker compose exec backend php artisan migrate
```

### 6.4 前端啟動確認
- 瀏覽 `http://localhost:[FRONTEND_PORT]`
- API health check：`GET /api/health`

## 7. 開發流程規則
### 7.1 Branch 規則
- main：可部署狀態
- develop：整合分支（如團隊採用）
- feature 分支：`feature/[ticket]-short-title`
- fix 分支：`fix/[ticket]-short-title`

### 7.2 Commit 規則（建議）
- `feat:` 新功能
- `fix:` 修復
- `refactor:` 重構
- `docs:` 文件
- `chore:` 雜項

### 7.3 PR 規則
- 必須包含：變更摘要、對應 ticket/議題
- API 變更需附「新增/變更端點」與範例 request/response
- Review 至少 1 人通過（依團隊規模調整）

### 7.4 Code Style / Lint
- Frontend：ESLint + Prettier（必須保持通過）
- Backend：Laravel Pint（建議）+ 基本 PSR-12

## 8. API 設計規約（REST）
### 8.1 基本原則
- Base path：`/api`
- 全部回傳 `application/json`
- 使用名詞（資源）+ HTTP Method 表意，不用動詞路由
- 資源名稱：複數、小寫、kebab-case

正確：
- `/api/users`
- `/api/order-items`

避免：
- `/api/getUsers`
- `/api/userList`

### 8.2 Method 對應
- `GET /resources`：列表（支援分頁、搜尋、排序）
- `GET /resources/{id}`：取得單筆
- `POST /resources`：新增
- `PUT /resources/{id}`：整筆更新（建議前後端一致）
- `PATCH /resources/{id}`：部分更新（若採用需明確規則）
- `DELETE /resources/{id}`：刪除（是否物理刪除依專案定義）

### 8.3 Query 規則（列表）
列表 API 統一支援下列 query（如不需要可不實作，但命名不可自創）：
- `page`：頁碼（1-based）
- `per_page`：每頁筆數（預設 20，上限 100）
- `q`：關鍵字搜尋（語意由後端定義）
- `sort`：排序欄位（例如 `created_at`）
- `order`：`asc` | `desc`
- `filter`：用欄位名（例如 `status=active`）

範例：
```http
GET /api/users?page=1&per_page=20&q=tanaka&sort=created_at&order=desc
```

### 8.4 HTTP Status 規則
- `200 OK`：成功（GET/PUT/PATCH/DELETE）
- `201 Created`：成功建立（POST）
- `204 No Content`：成功但無回傳 body（可用於 DELETE）
- `400 Bad Request`：參數不合法
- `401 Unauthorized`：未登入
- `403 Forbidden`：無權限
- `404 Not Found`：找不到資源
- `409 Conflict`：資料衝突（unique 等）
- `422 Unprocessable Entity`：表單驗證錯誤（Laravel 常用）
- `500 Internal Server Error`：未預期錯誤

### 8.5 命名與欄位格式
- JSON key：`snake_case`（與 Laravel 慣例一致，前端用 mapping/型別處理）
- 日期時間：ISO 8601（UTC 或明確時區；建議 UTC）
- 金額/數量：數字型別，避免字串

## 9. 認證與授權
（依實際採用方式擇一，請先明確定義）

### 9.1 Token（建議：Laravel Sanctum / JWT）
- 前端登入後保存 token（建議 HttpOnly cookie 或安全儲存策略）
- 所有需登入端點必須帶 `Authorization: Bearer <token>`

### 9.2 權限（Role-based）
- 角色範例：`admin`, `manager`, `staff`
- 後端以 middleware/policy 控制
- API 回傳 `403` 並使用統一錯誤格式

> 注意："password: admin" 僅供開發環境預設帳號使用，staging/production 必須改密碼或改成環境變數注入。

## 10. 例外處理與錯誤格式
### 10.1 成功回傳格式（統一）
建議統一以下結構（避免前端每支 API 自行判斷）：

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": ""
}
```

### 10.2 錯誤回傳格式（統一）
```json
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
```

規則：
- `error.code`：固定 enum（例如 `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`）
- `error.details`：僅在 422/400 時使用（欄位錯誤）

## 11. DB（Supabase Postgres）規則
### 11.1 連線
- 後端使用 Supabase 提供的 Postgres 連線資訊（host/user/password/db）
- 不允許把密碼提交到 git（只放 `.env.example`）

### 11.2 Migration
- DB schema 以 Laravel migration 為準
- 不允許「直接在 Supabase UI 改 schema 後不回寫 migration」
- 上線前需確保 migration 可重放（`fresh migrate` 可完整建表）

### 11.3 命名
- table：`snake_case` 複數
- column：`snake_case`
- pivot：`table_a_table_b`（依 Laravel 慣例）

## 12. 日誌與監控
- Laravel：使用 `storage/logs`（容器環境可導出到 stdout）
- 重要事件需有結構化 log（至少包含 `user_id` / `request_id` / `action`）
- 錯誤不可把敏感資訊回傳給前端（僅回傳通用 message）

## 13. 部署與設定
- `.env` 分環境管理：local / staging / production
- 前端 `VITE_API_BASE_URL` 需對應環境
- CORS：只允許公司指定網域（不要 `*`）
- 若有 Nginx/Reverse Proxy：請在 `infra/` 記錄設定與路由策略

## 14. FAQ / Troubleshooting
### 14.1 CORS 錯誤
- 確認後端 CORS whitelist
- 確認前端 `VITE_API_BASE_URL`
- 確認 cookie / Authorization header 是否被瀏覽器阻擋

### 14.2 DB 連不上
- 確認 Supabase 的 host/port
- 確認 password 是否正確
- 確認 Supabase 的網路限制（IP allowlist 等）

### 14.3 Migration 失敗
- 檢查 migration 順序與 FK
- 檢查資料型別（uuid / bigint）



