# FLOWMIND — AI-Powered Visual Workflow Automation Platform

**FLOWMIND** is a production-grade SaaS platform for creating, running, and monitoring AI-powered workflows — without writing code.

> Think n8n + Zapier + Vercel, with a built-in Ollama AI engine.

---

## ✨ Features

- **Visual Workflow Builder** — drag-and-drop node editor built on React Flow
- **AI Nodes** — classify, summarize, extract, and generate using Ollama (100% local, free)
- **Logic Nodes** — If/Else, Switch, Filter, Merge, Loop
- **Action Nodes** — HTTP requests, Webhooks, Email, Data Transformation
- **Real-Time Monitoring** — live execution updates via Server-Sent Events
- **Execution History** — full audit trail of every node's input/output
- **Workflow Templates** — 8 starter templates ready to use
- **Background Worker** — BullMQ + Redis for async execution (with inline fallback)
- **Security** — SSRF protection, JWT auth, password hashing, input validation
- **PostgreSQL + Prisma** — full relational database schema

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v20 LTS |
| PostgreSQL | 15+ or 17 |
| Redis | 7+ (optional — inline fallback available) |
| Ollama | Latest (optional — configure in Settings) |

---

### 1. Clone & Install

```bash
git clone <repo-url>
cd flowmind
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set these required server-side values in `.env` or your deployment environment:
```env
DATABASE_URL="your PostgreSQL connection string"
REDIS_URL="your Redis connection string"
JWT_SECRET="a randomly generated secret with at least 32 characters"
ENCRYPTION_KEY="a randomly generated 64-character hexadecimal key"
APP_URL="the public absolute URL of this FlowMind instance"
```

For a local `.env`, generate and append the encryption key once without printing it:

```powershell
node -e "require('fs').appendFileSync('.env', '\nENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex') + '\n')"
```

Keep this key stable; do not regenerate it after integrations have been saved, or their encrypted credentials will no longer be readable.

The application validates required configuration before serving requests. Configure AI provider/model/API credentials and SMTP settings in Integrations; they are encrypted and stored per workspace, not in environment variables. When using Docker Compose, set its documented container variables. When running `npm run seed`, also set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`; there is no built-in seed login. `.env.example` documents these conditional variables.

### 3. Create Database

```bash
# Create the database
createdb flowmind

# Push schema & generate Prisma client
npx prisma db push

# Seed default user, workspace, and templates
npm run seed
```

### 4. Start the Application

```bash
# Terminal 1: Start Next.js web app
npm run dev

# Terminal 2 (optional): Start background worker
npm run worker
```

Open the URL and port reported by Next.js. Create the first account through `/signup`; seed account credentials must be configured separately when running `npm run seed`.

---

## 🤖 AI Setup (Ollama — Free & Local)

Ollama lets you run powerful AI models on your own machine — no API keys, no costs.

```bash
# 1. Install Ollama
# Windows/Mac: https://ollama.com/download
# Linux:
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start Ollama service
ollama serve

# 3. Pull a model (choose one)
ollama run llama3          # Best overall (~4.7GB)
ollama run llama3.2        # Smaller, faster (~2GB)
ollama run mistral         # Great for classification
ollama run phi3            # Lightweight (<2GB)
```

Then configure in Flowmind: **Settings → AI Configuration**

---

## 🏗️ Architecture

```
flowmind/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Login, Signup pages
│   ├── (dashboard)/          # Protected app pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── workflows/        # Workflow CRUD + Editor
│   │   ├── executions/       # Execution history
│   │   ├── templates/        # Starter templates
│   │   ├── integrations/     # Integration config
│   │   └── settings/         # AI, Account settings
│   └── api/                  # Route handlers
│       ├── auth/             # Login, signup, logout
│       ├── dashboard/        # Stats & analytics
│       ├── workflows/        # CRUD + execute + publish
│       ├── executions/       # History + SSE stream
│       ├── templates/        # Template gallery
│       ├── integrations/     # Integration management
│       └── webhooks/         # Incoming webhook triggers
├── components/
│   ├── layout/               # Sidebar, Header
│   ├── workflow-editor/      # React Flow visual builder
│   ├── dashboard/            # Stat cards, charts
│   └── ui/                   # Reusable UI primitives
├── lib/
│   ├── ai/                   # Ollama/OpenAI AI client
│   ├── engine/               # Workflow execution engine
│   │   ├── dag.ts            # Graph validation + cycle detection
│   │   ├── context.ts        # Execution context + template interpolation
│   │   ├── runner.ts         # Main execution orchestrator
│   │   ├── ssrf.ts           # SSRF protection
│   │   └── handlers/         # Node-type execution handlers
│   ├── events/               # SSE execution event bus
│   ├── queue/                # BullMQ queue client
│   ├── auth.ts               # JWT + bcrypt auth
│   └── db.ts                 # Prisma client singleton
├── server/
│   └── worker.ts             # Standalone BullMQ worker process
├── store/
│   └── workflow-store.ts     # Zustand client state
├── prisma/
│   ├── schema.prisma         # Full database schema
│   └── seed.ts               # Database seeder
└── tests/
    └── engine.test.ts        # Unit tests
```

---

## 🛢️ Database Schema

| Table | Description |
|-------|-------------|
| `users` | Authentication + profile |
| `workspaces` | Multi-tenant workspace isolation |
| `workspace_members` | User ↔ workspace role mapping |
| `workflows` | Workflow definitions + status |
| `workflow_versions` | Versioned workflow snapshots |
| `workflow_executions` | Per-run execution records |
| `node_executions` | Per-node input/output/status |
| `execution_logs` | Structured log entries |
| `integrations` | AI, SMTP, API config |
| `credentials` | Encrypted credential storage |
| `workflow_templates` | Starter template library |
| `scheduled_triggers` | Cron schedule definitions |
| `webhook_endpoints` | Webhook URL tokens |

---

## 🔧 Available Node Types

### Triggers
| Node | Type | Description |
|------|------|-------------|
| Manual Trigger | `trigger-manual` | Start workflow manually with payload |
| Webhook Trigger | `trigger-webhook` | Receive external HTTP POST |
| Scheduled Trigger | `trigger-schedule` | Cron-based recurring trigger |

### AI Nodes (Powered by Ollama)
| Node | Type | Description |
|------|------|-------------|
| AI Text Generate | `ai-generate` | Free-form text generation |
| AI Classify | `ai-classify` | Categorize input into defined categories |
| AI Summarize | `ai-summarize` | Condense long text into summary |
| AI Extract | `ai-extract` | Extract structured JSON from unstructured text |

### Logic Nodes
| Node | Type | Description |
|------|------|-------------|
| If/Else Condition | `logic-condition` | Branch on true/false evaluation |
| Switch | `logic-switch` | Multi-case branching |
| Filter | `logic-filter` | Filter array elements |
| Merge | `logic-merge` | Combine upstream context |
| Loop | `logic-loop` | Iterate over array (max 100 items) |

### Action Nodes
| Node | Type | Description |
|------|------|-------------|
| HTTP Request | `action-http` | Fetch external API (SSRF protected) |
| Send Webhook | `action-webhook` | Dispatch outgoing webhook |
| Email Notification | `action-email` | Send via SMTP |
| Transform Data | `action-transform` | Reshape/map data |

### Utility Nodes
| Node | Type | Description |
|------|------|-------------|
| Set Variables | `utility-variables` | Store values in context |
| JSON Parser | `utility-json` | Parse JSON strings |
| Delay | `utility-delay` | Wait up to 30 seconds |
| Format Date | `utility-date` | Date formatting |
| Text Process | `utility-text` | String operations |

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Tests cover:
# - DAG validation + cycle detection
# - Execution context interpolation
# - SSRF protection
# - Condition evaluation logic
```

---

## 🔒 Security

- Passwords hashed with bcrypt (salt rounds: 10)
- JWT authentication (httpOnly cookies, 7-day expiry)
- SSRF protection on all HTTP/Webhook nodes (blocks private IPs, loopback, cloud metadata)
- SQL injection prevention via Prisma ORM parameterized queries
- Input validation on all API routes with Zod
- Workspace-scoped data isolation (never cross-workspace data access)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Credentials stored encrypted (IV + encrypted value, never plaintext)

---

## 🚦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run worker` | Start background execution worker |
| `npm run seed` | Seed database with templates and default user |
| `npm run test` | Run unit tests |

---

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string for BullMQ |
| `JWT_SECRET` | Yes | Random signing secret, at least 32 characters |
| `ENCRYPTION_KEY` | Yes | Random 64-character hex key used for integration secrets |
| `APP_URL` | Yes | Server-only public absolute URL for this app |
| `NODE_ENV` | No | Set by the Next.js runtime |
| `PORT` | No | Optional port consumed by `next start` |

---

## 📌 Known Limitations

1. **Redis required for scheduled cron triggers** — without Redis, only manual triggers work in background
2. **Ollama must be running** to use AI nodes — workflows with AI nodes will fail gracefully with an informative error if Ollama is unavailable
3. **Email requires SMTP configuration** — without SMTP, email nodes log preview only
4. **Loop node processes max 100 items** per execution for safety
5. **Max execution timeout is 2 minutes** — long AI completions may need timeout adjustment

---

## 🛣️ Recommended Next Steps

1. Add OAuth (Google, GitHub) via NextAuth.js
2. Add Playwright E2E tests for the builder flow  
3. Add workspace invitation + multi-user collaboration
4. Add more AI providers (Anthropic, Cohere, local LLM Studio)
5. Add conditional retry policies per node type
6. Build a webhook marketplace for pre-built integrations
7. Add workflow versioning diff viewer
8. Add execution analytics with Recharts breakdown by node type

---

## 📄 License

MIT
