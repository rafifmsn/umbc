# UMBC

[![CI Status](https://github.com/rafifmsn/umbc/actions/workflows/ci.yml/badge.svg)](https://github.com/rafifmsn/umbc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/rafifmsn/umbc?color=blue)](LICENSE)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Framework: Hono](https://img.shields.io/badge/Framework-Hono-E36002?logo=hono&logoColor=white)](https://hono.dev)

**UMBC (Universitas Mercu Buana Connect)** is a unified web platform designed for students and faculty across Universitas Mercu Buana. It streamlines academic collaboration, student team formation, creative project ideation, peer recruitment, and university-wide announcements with a minimalist, zero-bloat architecture.

## Core Features

- **Team Formation & Project Recruitment**: Create teams, declare specific roles/vacancies with required skills, set project timelines (start & end date range), upload cover photos, and review student join requests.
- **Idea Sandbox**: Propose innovative project ideas, gather peer feedback, and vote on community initiatives.
- **Campus Directory & Networking**: Explore student profiles across all university faculties (Fakultas Ilmu Komputer, Teknik, Ekonomi dan Bisnis, Ilmu Komunikasi, etc.) with real-time debounced search and URL-synchronized filters.
- **Notification Center**: Real-time notifications for team invitations, application status updates, and faculty broadcasts.
- **Admin Moderation & System Links**: Centralized console for administrators to manage users, broadcast faculty-targeted or campus-wide announcements, and dynamically configure university support endpoints and documentation links without redeployment.

## Tech Stack

| Layer                  | Technologies                                                                                                                                         |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime & Tooling**  | [Bun](https://bun.sh) (Package manager, test runner, server execution)                                                                               |
| **Backend API**        | [Hono v4](https://hono.dev) running natively on Bun                                                                                                  |
| **Database & ORM**     | [PostgreSQL 16](https://www.postgresql.org) with [Drizzle ORM](https://orm.drizzle.team) & [drizzle-kit](https://orm.drizzle.team/kit-docs/overview) |
| **Frontend Framework** | [React 19](https://react.dev) + [Vite](https://vite.dev) + [TypeScript](https://www.typescriptlang.org)                                              |
| **UI & Styling**       | [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives), [Lucide Icons](https://lucide.dev)             |
| **State & Navigation** | [React Router v7](https://reactrouter.com), [nuqs](https://nuqs.47ng.com) (URL query state manager)                                                  |
| **Containerization**   | Docker & Docker Compose (Alpine-based PostgreSQL and production multi-stage app container)                                                           |

## Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **[Bun](https://bun.sh)** (v1.2.0 or later):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **[Docker](https://docs.docker.com/get-docker/)** and **Docker Compose**:
   ```bash
   docker --version && docker compose version
   ```

## Local Development Setup

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/your-username/umbc.git
cd umbc
```

Create your server environment file (optional; sensible defaults are built-in):

```bash
cat << 'EOF' > .env
PORT=3000
DATABASE_URL=postgresql://umbc_user:postgres@127.0.0.1:5433/umbc_dev
NODE_ENV=development
EOF
```

### 2. Start PostgreSQL Container

The project includes a lightweight Alpine-based PostgreSQL 16 container configured to run on host port `5433` (to avoid conflicting with default local PostgreSQL instances on `5432`):

```bash
docker compose up -d
```

Check that the container is healthy:

```bash
docker compose ps
```

### 3. Install Dependencies

Install root backend dependencies and client dependencies:

```bash
# Install root backend dependencies
bun install

# Install frontend dependencies
cd src/client && bun install && cd ../..
```

### 4. Run Database Migrations

Apply the latest Drizzle migrations to your local PostgreSQL database:

```bash
bun run db:migrate
```

### 5. Start Development Servers

Run the backend and frontend development servers concurrently:

**Terminal 1 (Backend API - Port 3000):**

```bash
bun run dev
```

**Terminal 2 (Frontend Vite - Port 5173):**

```bash
bun run dev:client
```

Open your browser at:

- **Client Application**: [http://localhost:5173](http://localhost:5173) (Vite proxies `/api` calls directly to port 3000)
- **Backend API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Database & Admin Management

### Promoting a User to Administrator

To grant a student account administrative privileges (access to `/admin`, broadcast announcements, and system settings), use the student's NIM (Nomor Induk Mahasiswa):

#### Via Docker Compose (Recommended)

```bash
docker compose exec umbc-db psql -U umbc_user -d umbc_dev -c "UPDATE users SET role = 'ADMIN' WHERE nim = '41524010014';"
```

#### Via Docker Container Directly

```bash
docker exec -it umbc-db-dev psql -U umbc_user -d umbc_dev -c "UPDATE users SET role = 'ADMIN' WHERE nim = '41524010014';"
```

#### Via Bun One-Liner Script

```bash
bun -e "import { db, sql } from './src/server/db/client'; import { users } from './src/server/db/schema'; import { eq } from 'drizzle-orm'; await db.update(users).set({ role: 'ADMIN' }).where(eq(users.nim, '41524010014')); await sql.end();"
```

### Interactive Drizzle Studio

To visually explore tables, inspect join requests, and modify records using a browser GUI:

```bash
bun run db:studio
```

This opens Drizzle Studio locally at `https://local.drizzle.team`.

## Foundational Scripts

All scripts can be executed via `bun run <script>`:

| Command                | Description                                                                         |
| :--------------------- | :---------------------------------------------------------------------------------- |
| `bun run dev`          | Starts Hono backend server with file watch mode (`bun --watch src/server/index.ts`) |
| `bun run dev:client`   | Starts Vite development server for React frontend on port 5173                      |
| `bun run build:client` | Compiles and optimizes React frontend into production assets (`src/client/dist`)    |
| `bun test`             | Runs the automated backend and client test suites                                   |
| `bun run db:generate`  | Generates new SQL migration snapshots from changes in `src/server/db/schema.ts`     |
| `bun run db:migrate`   | Applies pending migrations located in `drizzle/` to the database                    |
| `bun run db:studio`    | Launches interactive local Drizzle Studio database explorer                         |
| `bunx tsc --noEmit`    | Runs TypeScript static type analysis across the server codebase                     |

## Production Deployment

### Option A: Complete Docker Compose (App + Database)

For containerized deployment behind a reverse proxy (e.g. Caddy, Nginx):

```bash
# 1. Set environment variables
export DB_PASSWORD="your-strong-db-password"

# 2. Build and launch production containers
docker compose -f docker-compose.prod.yml up -d --build
```

The production container builds the React application, runs migrations on startup, and uses Bun to serve both the Hono API and static client bundles on port `3000`.

### Option B: Bare-Metal / VPS Systemd Service

```bash
# 1. Install dependencies & build client assets
bun install --frozen-lockfile
cd src/client && bun install --frozen-lockfile && cd ../..
bun run build:client

# 2. Run migrations
bun run db:migrate

# 3. Serve via Bun in production mode
NODE_ENV=production bun src/server/index.ts
```

### Automated Database Backups (Cloudflare R2 + Cron)

UMBC includes a non-blocking PostgreSQL snapshot backup script located at [`scripts/backup.sh`](scripts/backup.sh). It dumps the production database via MVCC snapshot, compresses it with gzip, uploads it to Cloudflare R2 using `rclone`, and cleans up temporary files.

#### 1. Configure Rclone for Cloudflare R2

On your production VPS/server, create an `rclone` remote named `r2`:

```bash
rclone config
# 1. Choose: n (New remote)
# 2. Name: r2
# 3. Storage Type: s3
# 4. Provider: Cloudflare
# 5. Access Key ID & Secret Access Key: (from your Cloudflare R2 Dashboard)
# 6. Endpoint: https://<your-cloudflare-account-id>.r2.cloudflarestorage.com
```

> **Note**: The script defaults to uploading to the dedicated bucket `r2:umbc-backups`. If your remote or bucket name is different, customize `TARGET_BUCKET` inside [`scripts/backup.sh`](scripts/backup.sh) or export it as an environment variable (e.g. `TARGET_BUCKET="my-remote:my-bucket"`).

#### 2. Make Script Executable

Ensure the backup script has execution permissions:

```bash
chmod +x scripts/backup.sh
```

#### 3. Schedule via Crontab

Open your user crontab editor:

```bash
crontab -e
```

Add the scheduled job at the bottom. Use the **absolute path** to where the repository lives on your server (e.g. `/home/ubuntu/umbc/scripts/backup.sh`):

```cron
PATH=/usr/local/bin:/usr/bin:/bin
0 3 1,20 * * /path/to/your/umbc/scripts/backup.sh >> /var/log/umbc_backup.log 2>&1
```

- **`0 3 1,20 * *`**: Runs automatically every ~20 days (on the 1st and 20th of every month at 3:00 AM UTC).
- **Dedicated Bucket & Auto-Pruning**: Uses the dedicated Cloudflare R2 bucket `umbc-backups` and automatically prunes snapshots older than 45 days (`rclone delete ... --min-age 45d`), keeping at most 2–3 compressed snapshots and isolating retention rules from your other projects.
- **`PATH=...`**: Ensures the cron process can discover the `docker` and `rclone` binaries.
- **`>> /var/log/umbc_backup.log 2>&1`**: Captures all output and warnings into a log file for easy monitoring.
- **Fail-safe**: The script runs out-of-band and uses non-blocking PostgreSQL MVCC reads. Live traffic and student users will never experience downtime or write locks, even during backup execution or if an upload fails.

## Architecture & Design Details

For a detailed technical blueprint, anti-bloat rationale, Mermaid system diagrams, and subsystem breakdowns, see the comprehensive [Architecture Documentation](docs/architecture.md).
