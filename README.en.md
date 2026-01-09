# [PROJECT_NAME]

Internal Company System (Frontend: React + TypeScript / Backend: Laravel / DB: Supabase Postgres).
This README serves to unify development rules, API conventions, environments, and workflows. All members are expected to follow these guidelines.

[中文 (Chinese)](./README.md) | [日本語 (Japanese)](./README.ja.md)

> New members are recommended to read: Chapter 6 (Startup Process) + Chapters 7 & 8 (Rules).

## Table of Contents
- [1. Tech Stack & Prerequisites](#1-tech-stack--prerequisites)
- [2. Versions](#2-versions)
- [3. Frontend Architecture & Conventions (React)](#3-frontend-architecture--conventions-react)
- [4. Repo Structure](#4-repo-structure)
- [5. Environment Requirements](#5-environment-requirements)
- [6. Initial Startup (Docker)](#6-initial-startup-docker)
- [7. Development Workflow Rules](#7-development-workflow-rules)
- [8. API Design Conventions (REST)](#8-api-design-conventions-rest)
- [9. Authentication & Authorization](#9-authentication--authorization)
- [10. Exception Handling & Error Formats](#10-exception-handling--error-formats)
- [11. DB (Supabase Postgres) Rules](#11-db-supabase-postgres-rules)
- [12. Logging & Monitoring](#12-logging--monitoring)
- [13. Deployment & Configuration](#13-deployment--configuration)
- [14. FAQ / Troubleshooting](#14-faq--troubleshooting)

---

## 1. Tech Stack & Prerequisites
- Frontend: React + TypeScript (Vite)
- Backend: Laravel (PHP)
- DB: PostgreSQL (Supabase)
- API: RESTful API (JSON)
- Development Environment: Docker Compose (Unified version and startup method)

This system uses a separated frontend/backend architecture:
- Frontend is responsible for UI / State Management / API Calls only.
- Backend is responsible for Validation, Business Logic, DB Access, and returning consistent JSON responses.

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

## 3. Frontend Architecture & Conventions (React)
### 3.1 Technology Overview
| Category | Technology |
| --- | --- |
| Framework | React + TypeScript |
| Build Tool | Vite |
| Communication | axios |
| State Management (UI) | Jotai |
| Server State / Cache | TanStack Query |
| Form Management | React Hook Form |
| Validation | Zod |
| CSS | Tailwind CSS |
| UI Components | shadcn/ui |
| Table | TanStack Table |
| Charts | Recharts |
| Deployment | Vercel |
| Auth | JWT (Bearer Token) |

### 3.2 State Management Rules
#### 3.2.1 Separation of State Responsibilities (Important)
State must be clearly separated by role.

| Type | Library | Usage |
| --- | --- | --- |
| UI State | Jotai | Modal open/close, selected ID, display toggles, etc. |
| Server State | TanStack Query | API responses, list data, detail data |
| Form Input | React Hook Form | Input values, error states |

Prohibited:
- Saving API responses in Jotai
- Managing form values with useState
- Using TanStack Query merely as "state management"

### 3.3 Communication (axios) Conventions
#### 3.3.1 axios Common Settings
- Must use the common axios instance
- Base URL is obtained from `VITE_API_BASE_URL`
- Authentication must attach JWT in Authorization Header (`Authorization: Bearer <JWT>`)

#### 3.3.2 Response Handling
- Do not flow API responses directly to the UI
- Insert a transformation layer (DTO role) if necessary

### 3.4 Authentication (JWT)
#### 3.4.1 Overview
- Backend (Laravel) issues JWT
- Frontend holds JWT and attaches it to API requests
- Auth middleware is applied on the Backend for protected APIs

#### 3.4.2 JWT Storage Rules (Important)
- Principle: HttpOnly Cookie is recommended
- If using localStorage, strictly observe: XSS countermeasures, prohibition of direct token reference (must go through axios interceptor)

#### 3.4.3 Frontend Responsibilities
- Do not call APIs when unauthenticated
- Perform logout processing upon receiving 401

### 3.5 Form Design Rules
#### 3.5.1 Policy
- Use React Hook Form for all forms
- Unify validation with Zod
- Flow: React Hook Form (Input Management) -> Zod (Validation Schema)

#### 3.5.2 Prohibited
- Form management using onChange + useState
- Scattering validation logic (individual checks in if statements)

### 3.6 UI / CSS Conventions
#### 3.6.1 Tailwind CSS
- Basically use Tailwind utility classes
- Componentize common styles
- Consider `cn()` + constants for overly long classes

#### 3.6.2 shadcn/ui
- Extend based on shadcn/ui in principle
- Do not create unique UIs from scratch
- Design consistency is top priority

### 3.7 Tables & Charts
#### 3.7.1 Tables (TanStack Table)
- Use TanStack Table for list displays
- Paging, sorting, and filtering are controlled on the Table side
- API should stick to "providing raw data"

#### 3.7.2 Charts (Recharts)
- Aggregation processing should be done in Backend or Selector layer
- Complex calculations within Components are prohibited

### 3.8 Deployment (Vercel)
#### 3.8.1 Basic Policy
- main branch -> Production
- feature / PR -> Preview Deploy
- Environment variables are managed on the Vercel side

#### 3.8.2 Environment Variable Example
- `VITE_API_BASE_URL=https://api.example.com`

### 3.9 Important Philosophy
> In this project, "Separation of State Responsibilities", "Fixed Roles for Technologies", and "Creating No Exceptions" are top priorities.
> If in doubt, do not add new methods; adapt to existing rules.

## 4. Repo Structure
Monorepo is recommended (Frontend and Backend in the same repo). Example:

```text
/
frontend/        # React + TS
backend/         # Laravel
infra/           # docker, nginx, scripts (optional)
docker-compose.yml
.env.example
README.MD
```

Naming Conventions:
- Frontend: `kebab-case` filenames (React components can use `PascalCase.tsx`)
- Backend: Laravel default standards (Class `PascalCase`)
- API Routes: `kebab-case`, plural nouns for resources

## 5. Environment Requirements
- Docker Desktop (Required)
- Node.js (LTS version if running frontend locally)
- Composer (Recommended to use Docker for backend)
- Supabase Project (Postgres created)

## 6. Initial Startup (Docker)
### 6.1 Environment Variables
Copy environment files:
- Root: `.env.example` -> `.env`
- Backend: `backend/.env.example` -> `backend/.env`
- Frontend: `frontend/.env.example` -> `frontend/.env`

Required Fields (Example, replace with actuals):
- Backend
  - `APP_URL=[APP_URL]`
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=[SUPABASE_DB_HOST]`
  - `DB_PORT=5432`
  - `DB_DATABASE=[DB_NAME]`
  - `DB_USERNAME=[DB_USER]`
  - `DB_PASSWORD=[DB_PASSWORD]`
- Frontend
  - `VITE_API_BASE_URL=[API_BASE_URL]` (e.g., `https://api.[domain]` or Docker network URL)

> Note: Use Supabase Project connection info for Supabase DB Host/Password etc.

### 6.2 Startup
```bash
docker compose up -d --build
```

### 6.3 Backend Initialization (Laravel)
```bash
# Execute inside container
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan jwt:secret
docker compose exec backend php artisan migrate
```

### 6.4 Frontend Startup Confirmation
- Browse `http://localhost:[FRONTEND_PORT]`
- API health check: `GET /api/health`

## 7. Development Workflow Rules
### 7.1 Branch Rules
- main: Deployable state
- develop: Integration branch (if adopted by team)
- feature branch: `feature/[ticket]-short-title`
- fix branch: `fix/[ticket]-short-title`

### 7.2 Commit Rules (Recommended)
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Refactoring
- `docs:` Documentation
- `chore:` Chores

### 7.3 PR Rules
- Must include: Summary of changes, corresponding ticket/issue
- API changes must include "New/Changed Endpoints" and example request/response
- Review: At least 1 approval (adjust based on team size)

### 7.4 Code Style / Lint
- Frontend: ESLint + Prettier (Must pass)
- Backend: Laravel Pint (Recommended) + Basic PSR-12

## 8. API Design Conventions (REST)
### 8.1 Basic Principles
- Base path: `/api`
- All return `application/json`
- Use Nouns (Resources) + HTTP Methods, avoid verb routes
- Resource names: Plural, lowercase, kebab-case

Correct:
- `/api/users`
- `/api/order-items`

Avoid:
- `/api/getUsers`
- `/api/userList`

### 8.2 Method Correspondence
- `GET /resources`: List (Support paging, search, sorting)
- `GET /resources/{id}`: Get single item
- `POST /resources`: Create
- `PUT /resources/{id}`: Full update (Recommended consistent frontend/backend)
- `PATCH /resources/{id}`: Partial update (Define rules if used)
- `DELETE /resources/{id}`: Delete (Physical/Logical delete depends on project definition)

### 8.3 Query Rules (List)
List APIs uniformly support the following queries (implement if needed, but do not invent names):
- `page`: Page number (1-based)
- `per_page`: Items per page (Default 20, Max 100)
- `q`: Keyword search (Semantics defined by backend)
- `sort`: Sort field (e.g., `created_at`)
- `order`: `asc` | `desc`
- `filter`: By field name (e.g., `status=active`)

Example:
```http
GET /api/users?page=1&per_page=20&q=tanaka&sort=created_at&order=desc
```

### 8.4 HTTP Status Rules
- `200 OK`: Success (GET/PUT/PATCH/DELETE)
- `201 Created`: Successfully Created (POST)
- `204 No Content`: Success but no body (Can be used for DELETE)
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Not logged in
- `403 Forbidden`: No permission
- `404 Not Found`: Resource not found
- `409 Conflict`: Data conflict (unique etc.)
- `422 Unprocessable Entity`: Validation error (Common in Laravel)
- `500 Internal Server Error`: Unexpected error

### 8.5 Naming & Field Formats
- JSON key: `snake_case` (Consistent with Laravel convention, handle with mapping/types in frontend)
- Date/Time: ISO 8601 (UTC or explicit timezone; UTC recommended)
- Amount/Quantity: Number type, avoid strings

## 9. Authentication & Authorization
(Choose one based on actual adoption, define clearly first)

### 9.1 Token (Recommended: Laravel Sanctum / JWT)
- Frontend stores token after login (HttpOnly cookie or secure storage strategy recommended)
- All endpoints requiring login must carry `Authorization: Bearer <token>`

### 9.2 Permissions (Role-based)
- Role examples: `admin`, `manager`, `staff`
- Backend controlled via middleware/policy
- API returns `403` and uses unified error format

> Note: "password: admin" is for development environment default account only. Must change password or inject via env vars for staging/production.

## 10. Exception Handling & Error Formats
### 10.1 Success Response Format (Unified)
Recommended unified structure (Avoid frontend judging each API individually):

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": ""
}
```

### 10.2 Error Response Format (Unified)
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

Rules:
- `error.code`: Fixed enum (e.g., `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`)
- `error.details`: Used only for 422/400 (Field errors)

## 11. DB (Supabase Postgres) Rules
### 11.1 Connection
- Backend uses Supabase provided Postgres connection info (host/user/password/db)
- Do not commit passwords to git (only `.env.example`)

### 11.2 Migration
- DB schema follows Laravel migration
- "Changing schema directly in Supabase UI without writing back to migration" is prohibited
- Ensure migration is replayable before release (`fresh migrate` can build full tables)

### 11.3 Naming
- table: `snake_case` plural
- column: `snake_case`
- pivot: `table_a_table_b` (Laravel convention)

## 12. Logging & Monitoring
- Laravel: Use `storage/logs` (Can export to stdout in container environment)
- Important events must have structured logs (Include at least `user_id` / `request_id` / `action`)
- Do not return sensitive info to frontend on error (Return generic message only)

## 13. Deployment & Configuration
- `.env` managed by environment: local / staging / production
- Frontend `VITE_API_BASE_URL` must correspond to environment
- CORS: Allow only company specified domains (No `*`)
- If Nginx/Reverse Proxy exists: Record settings and routing strategies in `infra/`

## 14. FAQ / Troubleshooting
### 14.1 CORS Error
- Check Backend CORS whitelist
- Check Frontend `VITE_API_BASE_URL`
- Check if cookie / Authorization header is blocked by browser

### 14.2 DB Connection Failed
- Check Supabase host/port
- Check if password is correct
- Check Supabase network restrictions (IP allowlist etc.)

### 14.3 Migration Failed
- Check migration order and FK
- Check data types (uuid / bigint)
