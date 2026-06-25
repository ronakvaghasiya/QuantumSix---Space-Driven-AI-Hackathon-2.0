# AI-Powered Autonomous SDLC Platform

Production-ready AI Engineering Platform that automates requirement analysis, repository understanding, impact analysis, test generation, code generation, validation, QA verification, and GitHub pull request creation.

**AI Engineering Copilot for Large Legacy Repositories**

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│   NestJS    │────▶│ PostgreSQL  │
│  Dashboard  │     │   API       │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │     n8n     │
                    │  Workflows  │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌─────────┐  ┌────────┐
         │ OpenAI │  │ Qdrant  │  │ GitHub │
         │ Claude │  │ Vectors │  │  API   │
         └────────┘  └─────────┘  └────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, MUI (Minimals-style) |
| Backend | NestJS, PostgreSQL, TypeORM |
| Orchestration | n8n |
| AI | OpenAI, Claude |
| Vector DB | Qdrant |
| Testing | Playwright |
| VCS | GitHub API |
| Infra | Docker |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- GitHub Personal Access Token (optional, for repo cloning)

### 1. Start Infrastructure

```bash
cp .env.example .env
docker compose up -d
```

This starts PostgreSQL, Qdrant, and n8n.

### 2. Start Backend

```bash
cd backend
npm install
cp ../.env.example .env
npm run start:dev
```

API: http://localhost:3001  
Swagger: http://localhost:3001/docs

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:3100

### 4. Import n8n Workflows

1. Open http://localhost:5678 (admin / admin123)
2. Import workflows from `n8n/workflows/`
3. Configure OpenAI/Anthropic credentials in n8n

## Product Flow

```
Project Creation → GitHub Connection → Repository Indexing
    → Task Upload (CSV) → Requirement Analysis → Repository Intelligence
    → Impact Analysis → Test Generation → Human Approval
    → Code Generation → Human Approval → Validation
    → QA Verification → GitHub PR → Final Report
```

## Modules

### Dashboard
KPI cards (Projects, Tasks, Completed, PRs, Success Rate, Agent Runs), recent tasks, recent PRs.

### Projects
Connect GitHub repositories, index files, build dependency graphs, store embeddings in Qdrant.

### Tasks
CSV upload, task tracking with statuses (Pending → Analyzing → Approval → Code Gen → Testing → PR → Completed).

### Task Details
Progress timeline, tabs: Overview, Analysis, Tests, Code Diff, Validation, Pull Request. Human approval gates.

### Reports
Analytics charts, agent performance, success rate trends.

### Settings
GitHub token, OpenAI/Anthropic keys, n8n URL, Qdrant URL.

## Agent Architecture

Agents run inside n8n. Users interact only with Projects, Tasks, and Reports.

| Agent | Input | Output |
|-------|-------|--------|
| Requirement Analysis | Task requirement | Acceptance criteria, user stories, risk, keywords |
| Repository Intelligence | Requirement + KB | Relevant files, dependencies, confidence scores |
| Impact Analysis | Impacted files | Regression areas, API dependencies |
| Test Generation | Analysis results | Functional tests, Playwright specs |
| Code Generation | Approved analysis | Implementation plan, diff, patch |
| Validation | Generated code | Lint, build, Playwright results |
| QA | Validation results | QA report |
| GitHub | Approved code | Branch, commit, PR |

## Development Phases

- **Phase 1**: Projects, GitHub Integration, Repository Indexing
- **Phase 2**: CSV Upload, Requirement Analysis, Repository Intelligence
- **Phase 3**: Impact Analysis, Test Generation
- **Phase 4**: Code Generation, Validation, QA Automation
- **Phase 5**: GitHub PR Creation, Reports, Analytics

## Demo Repository

BannerBuzz is the first demo repository. The platform works with any GitHub repository.

```csv
task_id,requirement
BB-14342,Upload artwork preview issue
BB-14343,Canvas synchronization issue
BB-14219,Save design regression in cart edit
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| POST | `/api/v1/projects/:id/connect` | Connect & index repo |
| GET | `/api/v1/tasks` | List tasks |
| POST | `/api/v1/tasks/upload` | Upload CSV tasks |
| GET | `/api/v1/tasks/:id` | Task details |
| POST | `/api/v1/tasks/:id/approve-analysis` | Approve analysis |
| POST | `/api/v1/tasks/:id/approve-code` | Approve code |
| GET | `/api/v1/reports/dashboard` | Dashboard KPIs |
| GET | `/api/v1/reports/analytics` | Analytics data |

## License

MIT
