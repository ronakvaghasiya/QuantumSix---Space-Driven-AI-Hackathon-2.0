# RepoPilot AI — Demo Video Production Script
**Team:** QuantumSix | **Duration:** ~3 min 30 sec | **Language:** Indian English  
**App URL:** http://localhost:3100

---

## How to use this script (screen + voice sync)

1. **Record screen first** — follow the SCREEN column exactly, pause at each `[HOLD]` for 2–3 seconds.
2. **Record voice separately** — read the VOICE column slowly; Indian English pace ≈ 130 words/min.
3. **Import `subtitles.srt`** into CapCut / DaVinci / Premiere on the video timeline.
4. **Align audio** — drag voice track so the first spoken word matches subtitle `00:00:03,500`.
5. **Fine-tune** — nudge audio ±0.5 sec until lip-feel matches subtitle flashes.

---

## Scene 1 — Opening & Login (0:00 – 0:22)

| TIME | SCREEN | VOICE (Indian English) |
|------|--------|------------------------|
| 0:00 | Show browser → `localhost:3100/login` | Hello everyone. Welcome to **RepoPilot AI** — built by team **QuantumSix** for Hackathon 2.0. |
| 0:06 | `[HOLD]` Login page — QuantumSix branding visible | Our tagline is simple: **One Prompt. Complete Feature Delivery.** |
| 0:11 | Type email + password slowly | Let us sign in to the platform. Same login works on **Windows** and **Ubuntu** — no separate setup. |
| 0:17 | Click **Sign in** | [PAUSE — wait for dashboard load] |
| 0:20 | Dashboard appears | And we land directly on the main dashboard. |

---

## Scene 2 — Dashboard Overview (0:22 – 0:48)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 0:22 | `[HOLD]` Full dashboard — KPI cards visible | Here you can see project count, active tasks, merge requests, and indexing status — everything at one glance. |
| 0:28 | Slowly scroll down — recent tasks, projects | RepoPilot gives you a complete SDLC view: from repository indexing to AI-generated code and GitLab merge requests. |
| 0:35 | Point cursor to left sidebar (sticky nav) | Navigation is on the left — Dashboard, Projects, Tasks, Reports, and Integrations. |
| 0:40 | Click **Appearance** toggle → switch Dark mode | We also support **light and dark mode** — useful for long coding sessions. |
| 0:45 | Switch back to Light mode | [PAUSE 1 sec] |

---

## Scene 3 — Connect & Index Project (0:48 – 1:35)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 0:48 | Click **Projects** in sidebar | Now let us connect a real GitLab repository. |
| 0:52 | Click existing project OR **New Project** | I will open our project — for example, **DesigntoolReact** on the staging branch. |
| 0:58 | `[HOLD]` Project detail — repo info visible | RepoPilot clones the repository, parses all source files, and builds a **knowledge graph** of the codebase. |
| 1:05 | Show **Indexing Progress** bar (if indexing) OR click **Reindex Repository** | Indexing runs in the background. Files are parsed, embeddings are stored in **Qdrant**, and progress is shown live on screen. |
| 1:14 | `[HOLD]` at ~50%+ or Completed status | Once indexing completes, the AI fully understands your project structure — components, services, imports, and dependencies. |
| 1:22 | Scroll to **Intelligence** section — Knowledge Graph button | From here we can explore the **Knowledge Graph** — a visual map of how files connect to each other. |
| 1:28 | Optional: open Knowledge Graph page briefly | This helps the AI agent make smarter decisions during code generation. |

---

## Scene 4 — Create & Run a Task (1:35 – 2:25)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 1:35 | Click **Tasks** in sidebar | Next — let us create an AI task. |
| 1:39 | Click **Upload CSV** or create task | You can upload tasks in bulk via CSV, or create a single task with a natural-language requirement. |
| 1:46 | `[HOLD]` Task list — show one task row | Each task goes through an **autonomous pipeline**: Analysis → Code Generation → Validation → Merge Request. |
| 1:53 | Click a task — open task detail page | Let us open one task and see the full pipeline in action. |
| 1:58 | `[HOLD]` Task header — status, project name | At the top you see task ID, status, risk level, and linked project. |
| 2:03 | Click tab: **Analysis** or scroll to analysis section | First, the **Requirement Agent** analyses the task against indexed repository knowledge. |
| 2:09 | Show user stories / impact / affected files | It produces user stories, impacted files, and a risk assessment — all automatically. |
| 2:15 | Click tab: **Code** or Code Diff section | Then the **Code Generation Agent** writes the actual code changes — you can review the diff file by file. |
| 2:21 | Show Approve / Reject buttons briefly | Human approval is built in — you approve or reject before anything goes to production. |

---

## Scene 5 — Validation & Merge Request (2:25 – 2:55)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 2:25 | Scroll to **Validation** tab | After code generation, **Validation** runs — ESLint, TypeScript checks, Prettier, and build verification. |
| 2:31 | `[HOLD]` Validation results — pass/fail counts | Results are shown clearly — pass, fail, and skipped — so you know exactly what was verified. |
| 2:37 | Scroll to **QA Test Cases** if visible | The **QA Agent** also generates Playwright test cases aligned with the requirement. |
| 2:43 | Scroll to **Pull Request** section | Finally, RepoPilot creates a **GitLab Merge Request** — branch, commits, and MR link — ready for review. |
| 2:50 | `[HOLD]` MR URL / status chip | One prompt from the user. Complete feature delivery from the AI. |

---

## Scene 6 — Reports & Settings (2:55 – 3:20)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 2:55 | Click **Reports** in sidebar | The **Reports** page gives team-level analytics — task status breakdown, agent activity, and QA summary. |
| 3:02 | `[HOLD]` Charts and task detail table | Managers can track progress across all projects from a single screen. |
| 3:08 | Click **Integrations** / Settings | Under **Integrations**, we connect **GitLab**, and configure **OpenAI** or **Hugging Face** as the AI provider. |
| 3:14 | `[HOLD]` Settings — API keys masked, provider dropdown | API keys are stored securely. Each project can also have its own AI model settings. |

---

## Scene 7 — Closing (3:20 – 3:35)

| TIME | SCREEN | VOICE |
|------|--------|-------|
| 3:20 | Return to Dashboard OR show login branding | RepoPilot AI — **One Prompt. Complete Feature Delivery.** |
| 3:26 | `[HOLD]` QuantumSix logo / sidebar branding | Built by **QuantumSix** — autonomous SDLC for modern engineering teams. |
| 3:31 | Fade to black or end recording | Thank you for watching. |

---

## Recording checklist

- [ ] Resolution: 1920×1080, 30fps
- [ ] Zoom browser to 100%, hide bookmarks bar
- [ ] Close unrelated tabs and notifications
- [ ] Use demo account (not real API keys on screen)
- [ ] Speak clearly — slightly slower than normal conversation
- [ ] Match each `[HOLD]` with 2–3 sec silence in voice track

## Audio sync tip (CapCut / free tools)

1. Import screen recording + voice WAV/MP3
2. Import `subtitles.srt`
3. Align voice so "Hello everyone" starts at **00:00:03,500**
4. If voice is ahead → move audio track **right**
5. If voice is behind → move audio track **left**
6. Export with "burn subtitles" enabled
