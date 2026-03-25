# Contributing to OpenArg Frontend

Thank you for your interest in contributing to OpenArg. This guide will help you get started.

## Related Repository

OpenArg has two repositories:
- **Frontend** (this repo): Next.js 16, React 19, TypeScript, SSE streaming UI
- **Backend**: [OpenArg Backend](https://github.com/colossus-lab/openarg_backend) — Python/FastAPI API, Celery workers, data pipeline

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/openarg_frontend.git
   cd openarg_frontend
   ```
3. Copy `.env.local.example` to `.env.local` and configure your environment variables (see [Environment Setup](#environment-setup) below)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`. You'll need the backend running for full functionality.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | How to get it |
|----------|--------------|
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | Create a project at [Google Cloud Console](https://console.cloud.google.com), go to **APIs & Services > Credentials > Create OAuth Client ID** (Web application). Add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI. |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client as above — copy the client secret. |
| `ALLOWED_EMAILS` | Comma-separated list of Google emails allowed to log in. Use your own email for dev: `you@gmail.com` |
| `ADMIN_EMAILS` | Comma-separated list of admin emails (can be the same as above for dev) |

### Backend Connection

| Variable | How to get it |
|----------|--------------|
| `OPENARG_BACKEND_URL` | `http://localhost:8081` if running the backend locally. See the [backend repo](https://github.com/colossus-lab/openarg_backend) for setup instructions. |
| `OPENARG_BACKEND_API_KEY` | Must match the `BACKEND_API_KEY` in the backend's `.env` file. If the backend has no key set, leave this empty. |

### Running the Backend Locally

The frontend proxies all API calls to the Python backend. Without it, the chat won't work. Quick start:

```bash
# In a separate terminal
git clone https://github.com/colossus-lab/openarg_backend.git
cd openarg_backend
cp .env.example .env          # Configure DB, Redis, AWS credentials
make install                   # Install Python dependencies
make db.up                     # Start PostgreSQL + Redis (Docker)
make db.migrate                # Run database migrations
make dev                       # Start the API server on port 8081
```

See the [backend README](https://github.com/colossus-lab/openarg_backend/blob/main/README.md) for full details.

### Minimal Dev Config (Quick Start)

If you just want to work on UI components without the full backend, you can run the frontend standalone. API calls will fail, but you can still develop and test static pages, styling, and component logic.

## Development Workflow

1. Create a feature branch from `staging`:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/my-feature
   ```
2. Make your changes
3. Run lint and type checks:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```
4. Commit with a clear, meaningful message
5. Push to your fork and open a Pull Request **against the `staging` branch** (not `master`)

> **Important**: All PRs must target `staging`. The `master` branch is reserved for production releases and is only updated via merges from `staging`.

## Code Style

- **TypeScript**: Strict mode enabled — no `any` types
- **Components**: Functional with hooks, explicit prop interfaces
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Styling**: Custom CSS with design system variables (see `globals.css`)
- **API routes**: Use `requireSession()` for auth, `checkRateLimit()` for rate limiting
- **Tests**: Required for new features (when test infrastructure is set up)

Run checks before committing:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript type check
npm run build       # Verify production build
```

## Project Structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
│   ├── api/          # Backend proxy routes (chat, conversations, etc.)
│   ├── chat/         # Main chat interface
│   ├── datasets/     # Dataset explorer
│   └── login/        # Google OAuth login
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks (useSSEStream, useConversationState)
└── lib/              # Shared utilities (auth, rateLimit, types)
```

## Commit Messages

- Use imperative mood: "Add feature" not "Added feature"
- Keep the subject line under 72 characters
- Reference issue numbers where applicable: "Fix chat scroll (#42)"

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include: steps to reproduce, expected vs. actual behavior, browser/OS details
- For security vulnerabilities, see [SECURITY.md](SECURITY.md) -- do NOT open a public issue

## Questions?

Open a Discussion on GitHub or reach out to the maintainers.
