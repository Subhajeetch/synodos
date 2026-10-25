# Synodos Usage Guide

Welcome to the Synodos usage guide. This document walks you through setting up, running, testing, and deploying Synodos on your machine.

---

## What is Synodos?

Synodos is a real-time collaborative document platform. Multiple teammates can open the same document, write notes, format rich text, and see each other's cursors move live.

Synodos is built as a **monorepo**. A monorepo is a single code repository that contains multiple apps and shared packages.

### Monorepo Apps

- **`apps/web`**: The browser frontend built with React 19, Vite, Tailwind CSS, and Tiptap. Read the [apps/web README](../apps/web/README.md).
- **`apps/api`**: The backend REST API server built with Fastify, Better Auth, and Drizzle ORM. (_Note: `apps/api` does not have its own README yet._)
- **`apps/collab`**: The WebSocket synchronization server built with Hocuspocus and Yjs. (_Note: `apps/collab` does not have its own README yet._)

---

## Prerequisites

Before starting, make sure you have installed:

1. **Node.js 24 or newer**: Node.js runs JavaScript on your computer. Download it from [nodejs.org](https://nodejs.org/).
2. **pnpm 11 or newer**: pnpm is the package manager used to install dependencies and run workspace scripts. Install it with:
   ```bash
   corepack enable && corepack prepare pnpm@latest --activate
   ```
3. **Git**: Git downloads and tracks the repository code. Download it from [git-scm.com](https://git-scm.com/).
4. **Docker and Docker Compose** (Recommended): Docker lets you start PostgreSQL and Redis quickly in isolated containers without manual database installation. Download it from [docker.com](https://www.docker.com/).

---

## Clone and Install

First, clone the repository to your computer:

```bash
git clone https://github.com/Subhajeetch/synodos.git
```

Move into the project folder:

```bash
cd synodos
```

Install all dependencies across all apps and packages:

```bash
pnpm install
```

---

## Set Up Environment Files

All apps in Synodos read environment variables from a single `.env` file at the root of the project.

Create your `.env` file by copying the example file:

```bash
cp .env.example .env
```

Open `.env` in your text editor. Here is what each variable does:

| Variable               | Description                                                  | Default / Example Value                    |
| :--------------------- | :----------------------------------------------------------- | :----------------------------------------- |
| `DATABASE_URL`         | Connection URL for PostgreSQL.                               | `postgres://app:app@localhost:5432/collab` |
| `REDIS_URL`            | Connection URL for Redis.                                    | `redis://localhost:6379`                   |
| `VITE_COLLAB_URL`      | WebSocket URL the web frontend connects to for live syncing. | `ws://localhost:1234`                      |
| `BETTER_AUTH_SECRET`   | Secret key used to encrypt session tokens.                   | Run `openssl rand -base64 32`              |
| `BETTER_AUTH_URL`      | Base URL of the API authentication service.                  | `http://localhost:4000`                    |
| `WEB_ORIGIN`           | URL of the frontend web application.                         | `http://localhost:5173`                    |
| `GOOGLE_CLIENT_ID`     | OAuth Client ID from Google Cloud Console.                   | `your-client-id`                           |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console.               | `your-client-secret`                       |
| `GITHUB_CLIENT_ID`     | OAuth Client ID from GitHub Developer Settings.              | `your-github-client-id`                    |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret from GitHub Developer Settings.          | `your-github-client-secret`                |

To generate a secure value for `BETTER_AUTH_SECRET`, run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the generated string and paste it into `BETTER_AUTH_SECRET` inside `.env`.

> **OAuth note**: When registering your GitHub OAuth app, set the authorization callback URL to `http://localhost:4000/api/auth/callback/github`.

---

## Start the Database and Redis

Synodos requires two background data services:

- **PostgreSQL**: A relational database that stores user accounts, documents, and version history.
- **Redis**: An in-memory data store that coordinates real-time edit locks and active rooms across server instances.

Choose one of the two options below:

### Option A: Using Docker (Recommended)

The repository provides a `docker-compose.yml` file with everything pre-configured.

Start PostgreSQL and Redis in the background:

```bash
docker compose up -d
```

This starts two services:

- `postgres`: PostgreSQL 16 listening on port `5432`. It mounts the `pgdata` volume to keep your data safe.
- `redis`: Redis 7 listening on port `6379`.

To stop the Docker containers when you are done working:

```bash
docker compose down
```

### Option B: Without Docker (Local or Cloud Database)

If you already have PostgreSQL and Redis installed on your computer, or prefer using cloud providers (such as Neon, Supabase, Upstash, or Aiven), you can use them directly.

Simply update the URLs in your root `.env` file to point to your instances:

```env
DATABASE_URL=postgres://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
REDIS_URL=redis://HOST:6379
```

### Apply Database Migrations

Once your PostgreSQL database is reachable, run the database migrations. Migrations create the required tables and columns:

```bash
pnpm --filter @synodos/db db:migrate
```

To test if your database connection is working properly, you can run:

```bash
pnpm --filter @synodos/db db:ping
```

---

## Run Locally

To start all three apps at the same time, run:

```bash
pnpm dev
```

Turborepo starts the processes together:

- **Web App**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **API Server**: Listening at [http://localhost:4000](http://localhost:4000) (health check at `http://localhost:4000/health`).
- **Collab Server**: Listening at `ws://localhost:1234`.

To stop all running servers, press `Ctrl + C` in your terminal.

---

## Run Just One App

If you are only working on a single part of the project, you can run each app individually using pnpm filters:

Run only the web frontend:

```bash
pnpm --filter web dev
```

Run only the API backend:

```bash
pnpm --filter @synodos/api dev
```

Run only the real-time collaboration server:

```bash
pnpm --filter @synodos/collab dev
```

---

## Build and Check the Project

Before committing changes, run these check commands to ensure code quality:

### Static Type Checking

Runs the TypeScript compiler across every app and package to verify type safety:

```bash
pnpm check-types
```

### Code Formatting

Checks and automatically formats all code and Markdown files using Prettier:

```bash
pnpm format
```

### Linting

Runs ESLint to detect common errors and style issues:

```bash
pnpm lint
```

### Production Build

Compiles TypeScript and bundles production-ready assets into each app's `dist/` folder:

```bash
pnpm build
```

### Automated Tests

Run the frontend test suite with Vitest:

```bash
pnpm --filter web test
```

Run the collaboration test suite with Node test runner:

```bash
pnpm --filter @synodos/collab test
```

---

## Deploying

### Deploying the Web Frontend (Cloudflare Pages)

The web app in `apps/web` is designed for deployment on Cloudflare Pages.

1. Create a new Cloudflare Pages project connected to your GitHub repository.
2. In build configuration:
   - **Framework preset**: `None`
   - **Root directory**: `/` (leave as root so Cloudflare discovers the `functions/` folder).
   - **Build command**: `pnpm --filter web build`
   - **Build output directory**: `apps/web/dist`
3. In environment variables:
   - **Build variable**: `NODE_VERSION=24`
   - **Runtime variable**: `BACKEND_URL` set to your hosted API address (e.g. `https://synodos-api.onrender.com`).
4. Requests sent to `/api/*` on Cloudflare Pages are automatically proxied to `BACKEND_URL` by `functions/api/[[path]].ts`.

### Deploying API and Collab (Node.js Host)

You can host `apps/api` and `apps/collab` on cloud platforms like Render, Railway, Fly.io, or an Ubuntu VPS.

1. Build command:
   ```bash
   pnpm --filter @synodos/api build
   ```
2. Start command:
   ```bash
   pnpm --filter @synodos/api start
   ```
3. Set production environment variables in your hosting dashboard:
   - `DATABASE_URL` (production PostgreSQL connection string)
   - `REDIS_URL` (production Redis connection string)
   - `BETTER_AUTH_SECRET` (generated secret key)
   - `BETTER_AUTH_URL` (production public URL of the web frontend or API proxy)
   - `WEB_ORIGIN` (production public URL of your Cloudflare Pages site)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

---

## App Documentation Links

- [apps/web README](../apps/web/README.md)
- `apps/api`: Currently does not have a separate README file.
- `apps/collab`: Currently does not have a separate README file.
