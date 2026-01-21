# Deployment Guide / 部署指南 / デプロイガイド

This document outlines the deployment process for the Aswell-system.
本文件說明 Aswell-system 的部署流程。
このドキュメントでは、Aswell-system のデプロイ手順について説明します。

---

## 1. Backend Deployment (Google Cloud Run)
## 1. 後端部署 (Google Cloud Run)
## 1. バックエンドのデプロイ (Google Cloud Run)

### Prerequisites / 前提條件 / 前提条件
- Google Cloud SDK (gcloud) installed and initialized.
- Docker installed (optional, `gcloud` can build from source).

### Deployment Command / 部署指令 / デプロイコマンド
Run this command from the `backend` directory:
在 `backend` 目錄下執行此指令：
`backend` ディレクトリでこのコマンドを実行します：

```bash
gcloud run deploy aswell-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### Required Environment Variables / 必填環境變數 / 必要な環境変数
Set these in the Cloud Run console:
請在 Cloud Run 控制台設定以下變數：
Cloud Run コンソールでこれらを設定してください：

| Key | Description |
| :--- | :--- |
| `APP_KEY` | Laravel Application Key |
| `DB_PASSWORD` | Database password (Supabase) |
| `JWT_SECRET` | JWT Secret key |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend URLs (separated by `;`) |

---

## 2. Frontend Deployment (Vercel)
## 2. 前端部署 (Vercel)
## 2. フロントエンドのデプロイ (Vercel)

### Project Configuration / 專案設定 / プロジェクト設定
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Environment Variables / 環境變數 / 環境変数
Vite automatically uses `.env.production` during the build process.
Vite 在構建過程中會自動使用 `.env.production`。
Vite はビルドプロセス中に自動的に `.env.production` を使用します。

- **`VITE_API_BASE_URL`**: Set to your Cloud Run Service URL + `/api`.
  (e.g., `https://aswell-backend-xxxxx.a.run.app/api`)

---

## 3. Environment Switching / 環境切換 / 環境の切り替え

The system is configured to switch automatically:
系統已設定為自動切換：
システムは自動的に切り替わるように設定されています：

- **Local Development / 本地開發 / ローカル開発**: Uses `.env` (connects to `localhost:8000`).
- **Production / 生產環境 / 本番環境**: Uses `.env.production` (connects to Cloud Run).

> [!IMPORTANT]
> Do not commit the `.env` file. It is ignored by git to protect your local settings.
> 請勿提交 `.env` 檔案。它已被 git 忽略以保護您的本地設定。
> `.env` ファイルをコミットしないでください。ローカル設定を保護するために git によって無視されます。
