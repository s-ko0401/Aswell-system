# [PROJECT_NAME]

社内システム（Frontend: React + TypeScript / Backend: Laravel / DB: Supabase Postgres）。
本READMEは、開発ルール、API規約、環境、ワークフローを統一するためのものです。全メンバーはこれに従ってください。

[中文 (Chinese)](./README.md) | [English](./README.en.md)

> 新規メンバーへの推奨：第6章（起動プロセス）+ 第7・8章（ルール）を最初に読んでください。

## 目次
- [1. 技術スタックと前提](#1-技術スタックと前提)
- [2. Versions](#2-versions)
- [3. Frontend 技術構成と規約（React）](#3-frontend-技術構成と規約react)
- [4. Repo 構成](#4-repo-構成)
- [5. 環境要件](#5-環境要件)
- [6. 初回起動（Docker）](#6-初回起動docker)
- [7. 開発フロー規則](#7-開発フロー規則)
- [8. API 設計規約（REST）](#8-api-設計規約rest)
- [9. 認証と認可](#9-認証と認可)
- [10. 例外処理とエラー形式](#10-例外処理とエラー形式)
- [11. DB（Supabase Postgres）規則](#11-db-supabase-postgres-規則)
- [12. ログと監視](#12-ログと監視)
- [13. デプロイと設定](#13-デプロイと設定)
- [14. FAQ / トラブルシューティング](#14-faq--トラブルシューティング)

---

## 1. 技術スタックと前提
- Frontend: React + TypeScript（Vite）
- Backend: Laravel（PHP）
- DB: PostgreSQL（Supabase）
- API: RESTful API（JSON）
- 開発環境：Docker Compose（統一されたバージョンと起動方法）

本システムはフロントエンドとバックエンドが分離されています：
- フロントエンドは UI / 状態管理 / API呼び出し のみを担当
- バックエンドは バリデーション、ビジネスロジック、DBアクセス、一貫したJSONレスポンス を担当

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

## 3. Frontend 技術構成と規約（React）
### 3.1 使用技術一覧
| カテゴリ | 技術 |
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
| フォーム入力 | React Hook Form | 入力中の値、エラーステータス |

禁止事項：
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

## 4. Repo 構成
Monorepo（同一リポジトリにフロントエンドとバックエンドを配置）を推奨します。例：

```text
/
frontend/        # React + TS
backend/         # Laravel
infra/           # docker, nginx, scripts（任意）
docker-compose.yml
.env.example
README.MD
```

命名規則：
- フロントエンド：`kebab-case` ファイル名（React component は `PascalCase.tsx` 可）
- バックエンド：Laravel デフォルト規約（Class `PascalCase`）
- API ルート：`kebab-case`、リソースは複数形名詞

## 5. 環境要件
- Docker Desktop（必須）
- Node.js（フロントエンドをローカルで実行する場合、LTS版）
- Composer（バックエンドをローカルで実行する場合、Docker推奨）
- Supabase プロジェクト（Postgres作成済み）

## 6. 初回起動（Docker）
### 6.1 環境変数
環境設定ファイルをコピー：
- ルート：`.env.example` -> `.env`
- バックエンド：`backend/.env.example` -> `backend/.env`
- フロントエンド：`frontend/.env.example` -> `frontend/.env`

必須項目（例、実際のものに置き換えてください）：
- Backend
  - `APP_URL=[APP_URL]`
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=[SUPABASE_DB_HOST]`
  - `DB_PORT=5432`
  - `DB_DATABASE=[DB_NAME]`
  - `DB_USERNAME=[DB_USER]`
  - `DB_PASSWORD=[DB_PASSWORD]`
- Frontend
  - `VITE_API_BASE_URL=[API_BASE_URL]`（例：`https://api.[domain]` または Docker network URL）

> 注意：Supabase DB Host/Password 等は Supabase Project の接続情報を使用してください。

### 6.2 起動
```bash
docker compose up -d --build
```

### 6.3 バックエンド初期化（Laravel）
```bash
# コンテナ内で実行
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan jwt:secret
docker compose exec backend php artisan migrate
```

### 6.4 フロントエンド起動確認
- ブラウザで `http://localhost:[FRONTEND_PORT]` にアクセス
- API ヘルスチェック：`GET /api/health`

## 7. 開発フロー規則
### 7.1 Branch 規則
- main：デプロイ可能状態
- develop：統合ブランチ（チームで採用する場合）
- feature ブランチ：`feature/[ticket]-short-title`
- fix ブランチ：`fix/[ticket]-short-title`

### 7.2 Commit 規則（推奨）
- `feat:` 新機能
- `fix:` バグ修正
- `refactor:` リファクタリング
- `docs:` ドキュメント
- `chore:` 雑務

### 7.3 PR 規則
- 必須：変更の要約、対応するチケット/課題
- API 変更時は「新規/変更エンドポイント」とリクエスト/レスポンス例を添付
- レビュー：少なくとも1名の承認（チーム規模により調整）

### 7.4 Code Style / Lint
- Frontend：ESLint + Prettier（通過必須）
- Backend：Laravel Pint（推奨）+ 基本 PSR-12

## 8. API 設計規約（REST）
### 8.1 基本原則
- Base path：`/api`
- 全て `application/json` を返す
- 名詞（リソース）+ HTTP Method で表現し、動詞ルートは避ける
- リソース名：複数形、小文字、kebab-case

正：
- `/api/users`
- `/api/order-items`

誤：
- `/api/getUsers`
- `/api/userList`

### 8.2 Method 対応
- `GET /resources`：一覧（ページング、検索、ソート対応）
- `GET /resources/{id}`：単一取得
- `POST /resources`：新規作成
- `PUT /resources/{id}`：全体更新（前後端で一致させることを推奨）
- `PATCH /resources/{id}`：部分更新（採用する場合はルールを明確化）
- `DELETE /resources/{id}`：削除（物理削除か論理削除かはプロジェクト定義による）

### 8.3 Query 規則（一覧）
一覧 API は統一して以下の query をサポート（不要なら実装しなくて良いが、独自命名は不可）：
- `page`：ページ番号（1-based）
- `per_page`：ページあたりの件数（デフォルト 20、上限 100）
- `q`：キーワード検索（意味はバックエンド定義）
- `sort`：ソートフィールド（例：`created_at`）
- `order`：`asc` | `desc`
- `filter`：フィールド名でフィルタ（例：`status=active`）

例：
```http
GET /api/users?page=1&per_page=20&q=tanaka&sort=created_at&order=desc
```

### 8.4 HTTP Status 規則
- `200 OK`：成功（GET/PUT/PATCH/DELETE）
- `201 Created`：作成成功（POST）
- `204 No Content`：成功だが body なし（DELETE で使用可）
- `400 Bad Request`：パラメータ不正
- `401 Unauthorized`：未ログイン
- `403 Forbidden`：権限なし
- `404 Not Found`：リソースが見つからない
- `409 Conflict`：データ競合（unique 等）
- `422 Unprocessable Entity`：バリデーションエラー（Laravel で常用）
- `500 Internal Server Error`：予期せぬエラー

### 8.5 命名とフィールド形式
- JSON key：`snake_case`（Laravel の慣習に合わせる、フロントエンドは mapping/型で処理）
- 日時：ISO 8601（UTC または明示的なタイムゾーン；UTC 推奨）
- 金額/数量：数値型、文字列は避ける

## 9. 認証と認可
（実際に採用する方式を選び、最初に明確に定義してください）

### 9.1 Token（推奨：Laravel Sanctum / JWT）
- フロントエンドはログイン後に token を保存（HttpOnly cookie または安全な保存戦略を推奨）
- ログインが必要なエンドポイントは全て `Authorization: Bearer <token>` を付与

### 9.2 権限（Role-based）
- ロール例：`admin`, `manager`, `staff`
- バックエンドは middleware/policy で制御
- API は `403` を返し、統一エラー形式を使用

> 注意："password: admin" は開発環境のデフォルトアカウント用です。staging/production ではパスワード変更または環境変数注入を行ってください。

## 10. 例外処理とエラー形式
### 10.1 成功レスポンス形式（統一）
以下の構造に統一することを推奨（フロントエンドが API ごとに判断するのを避けるため）：

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": ""
}
```

### 10.2 エラーレスポンス形式（統一）
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
- `error.code`：固定 enum（例：`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`）
- `error.details`：422/400 の時のみ使用（フィールドエラー）

## 11. DB（Supabase Postgres）規則
### 11.1 接続
- バックエンドは Supabase 提供の Postgres 接続情報（host/user/password/db）を使用
- パスワードを git にコミットしない（`.env.example` のみ）

### 11.2 Migration
- DB schema は Laravel migration を正とする
- 「Supabase UI で直接 schema を変更し、migration に書き戻さない」ことは禁止
- リリース前に migration が再現可能であることを確認（`fresh migrate` で完全なテーブル構築が可能であること）

### 11.3 命名
- table：`snake_case` 複数形
- column：`snake_case`
- pivot：`table_a_table_b`（Laravel 慣習）

## 12. ログと監視
- Laravel：`storage/logs` を使用（コンテナ環境では stdout への出力可）
- 重要イベントは構造化ログを残す（少なくとも `user_id` / `request_id` / `action` を含む）
- エラー時に機密情報をフロントエンドに返さない（汎用的な message のみ返す）

## 13. デプロイと設定
- `.env` は環境ごとに管理：local / staging / production
- フロントエンド `VITE_API_BASE_URL` は環境に対応させる
- CORS：会社指定のドメインのみ許可（`*` は不可）
- Nginx/Reverse Proxy がある場合：`infra/` に設定とルーティング戦略を記録

## 14. FAQ / トラブルシューティング
### 14.1 CORS エラー
- バックエンドの CORS whitelist を確認
- フロントエンドの `VITE_API_BASE_URL` を確認
- cookie / Authorization header がブラウザにブロックされていないか確認

### 14.2 DB 接続不可
- Supabase の host/port を確認
- password が正しいか確認
- Supabase のネットワーク制限（IP allowlist 等）を確認

### 14.3 Migration 失敗
- migration 順序と FK を確認
- データ型（uuid / bigint）を確認
