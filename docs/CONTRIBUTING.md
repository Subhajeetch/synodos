# Contributing to Synodos

Thank you for your interest in contributing to Synodos! Community contributions help make Synodos a better, faster, and more reliable collaborative editor for everyone.

Whether you are fixing a typo, resolving a bug, or building a new feature, your help is appreciated.

---

## Before You Start

To keep development organized and smooth:

1. **Search existing issues and pull requests**: Check if someone else has already reported the bug or is working on the same feature.
2. **Read the usage guide**: Familiarize yourself with how to run Synodos locally by reading the [Usage Guide](USAGE.md).
3. **Be kind and respectful**: We are committed to providing a friendly and welcoming environment for everyone.
4. **Open an issue first for big changes**: If you plan to add a large feature or make major architectural changes, please open an issue first so we can discuss the approach together.

---

## Development Setup

### System Requirements

Make sure you have installed:

- **Node.js 24 or newer**
- **pnpm 11 or newer**
- **Git**
- **Docker and Docker Compose** (recommended for running PostgreSQL and Redis)

### 1. Fork and Clone

Fork the repository on GitHub, then clone your fork to your computer:

```bash
git clone https://github.com/YOUR_USERNAME/synodos.git
```

Move into the project directory:

```bash
cd synodos
```

### 2. Install Dependencies

Install all dependencies across all workspace packages:

```bash
pnpm install
```

### 3. Create a Branch

Create a new branch for your work. Use a descriptive prefix to show what kind of change you are making:

- `feature/` for new features (example: `feature/table-resizing`)
- `fix/` for bug fixes (example: `fix/cursor-position-sync`)
- `docs/` for documentation updates (example: `docs/clarify-env-setup`)
- `refactor/` for code restructuring without changing behavior (example: `refactor/auth-helpers`)
- `chore/` for tool configurations or dependency updates (example: `chore/update-fastify`)

Create and switch to your new branch:

```bash
git checkout -b feature/your-feature-name
```

### 4. Set Up the Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Start the local PostgreSQL database and Redis server using Docker Compose:

```bash
docker compose up -d
```

Apply database migrations to create the required tables:

```bash
pnpm --filter @synodos/db db:migrate
```

_(If you do not want to use Docker, see Option B in the [Usage Guide](USAGE.md) to connect an existing database)._

---

## Project Structure

Synodos is organized as a monorepo. Here is the structure of the repository:

```text
synodos/
├── apps/
│   ├── api/                 # Fastify REST API server and Better Auth authentication
│   ├── collab/              # Hocuspocus WebSocket server for real-time syncing
│   └── web/                 # React 19 + Vite frontend web application
├── docs/                    # Project documentation guides
│   ├── CONTRIBUTING.md      # Contribution guide and developer workflow
│   └── USAGE.md             # Local setup and deployment instructions
├── functions/               # Cloudflare Pages Functions
│   └── api/                 # Reverse proxy that forwards /api requests to backend
├── packages/
│   ├── db/                  # Drizzle ORM schema, queries, and migrations
│   ├── shared/              # Shared TypeScript types, Zod schemas, and helpers
│   └── typescript-config/   # Shared TypeScript configuration files
├── docker-compose.yml       # Local PostgreSQL and Redis Docker services
├── package.json             # Root monorepo configuration and Turbo scripts
├── pnpm-workspace.yaml      # Monorepo workspace definitions
└── turbo.json               # Turborepo task pipeline configuration
```

---

## Making Changes

### Running the Apps

Start all apps at the same time:

```bash
pnpm dev
```

To run a single app:

```bash
pnpm --filter web dev
```

```bash
pnpm --filter @synodos/api dev
```

```bash
pnpm --filter @synodos/collab dev
```

### Required Quality Checks

Before committing and opening a pull request, run all checks to make sure everything passes:

1. **Verify TypeScript types**:

   ```bash
   pnpm check-types
   ```

   Ensures there are no type errors across the entire codebase.

2. **Format your code**:

   ```bash
   pnpm format
   ```

   Formats TypeScript, CSS, and Markdown files using Prettier.

3. **Check for lint errors**:

   ```bash
   pnpm lint
   ```

   Runs ESLint to find common code problems.

4. **Test the production build**:

   ```bash
   pnpm build
   ```

   Verifies that all apps compile cleanly for production.

5. **Run test suites**:
   ```bash
   pnpm --filter web test
   ```
   ```bash
   pnpm --filter @synodos/collab test
   ```
   Runs unit tests for the frontend and collaboration logic.

---

## Commit Messages

We follow the **Conventional Commits** specification. Conventional Commits is a standard format for writing clear, readable commit messages.

### Format

```text
<type>(<scope>): <short description>
```

Common types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring without bug fixes or new features
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance, config changes, or dependency upgrades

Use our real app or package names for the scope: `web`, `api`, `collab`, `db`, `shared`, or `docs`.

### Examples

```text
feat(web): add slash command menu in document editor
fix(collab): prevent duplicate version snapshot on user disconnect
fix(api): validate document title before saving
perf(db): add index on document_id in versions table
docs(usage): clarify docker compose commands
chore(deps): upgrade fastify to latest version
```

---

## Submitting a Pull Request

When you are ready to submit your work:

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Navigate to [https://github.com/Subhajeetch/synodos](https://github.com/Subhajeetch/synodos) in your browser.
3. Click **Compare & pull request**.
4. Fill in the pull request template:
   - Provide a clear, descriptive title.
   - Describe what changed and why.
   - List the steps required to test your changes.
   - Include screenshots or short video clips for any UI changes.
5. Submit the pull request. A maintainer will review your code soon!

---

## Code Style

- **Strict TypeScript**: Write fully typed code. Avoid using `any`.
- **Consistent formatting**: Always run `pnpm format` before opening a pull request.
- **Short, clear functions**: Keep functions focused on doing one thing well.
- **Helpful comments**: Code should be self-explanatory. Add comments only where the reasoning is not immediately obvious.

---

Thank you again for contributing to Synodos! For complete setup and configuration details, refer to the [Usage Guide](USAGE.md).
