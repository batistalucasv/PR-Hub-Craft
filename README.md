# PR-Hub Craft 🚀

> **Modern, whitelabel, and lightning-fast dashboard to organize, prioritize, and triage GitHub Pull Requests via the local `gh` CLI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-purple.svg)](https://vitejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com/)

---

## 📖 Overview

**PR-Hub Craft** is a developer productivity hub designed to tame pull request overload (`involves:@me`). Whether you are maintaining dozens of open-source repositories or contributing across active enterprise teams, PR-Hub Craft transforms scattered notifications into a unified, actionable Kanban workflow with intelligent health checks, local Git worktree automation, and zero-token credential security.

---

## 🔒 Whitelabel & Zero-Secret Philosophy

- **Zero Secret & Zero Token Storage**: Never prompts for, reads, or stores Personal Access Tokens (PAT), passwords, or API keys. All communication with GitHub's GraphQL API is delegated directly to your authenticated local GitHub CLI (`gh api graphql`).
- **100% Whitelabel & Repository-Agnostic**: Contains zero project-specific hardcoding, arbitrary thematic filters, or opinionated organization bias. Works instantly with any public or private GitHub repository worldwide.
- **Privacy-First Local Persistence**: All personal metadata (priorities, custom tags, daily focus flags, snooze timestamps, checklists, and notes) is stored strictly on your local machine (`data/user-state.json`). Nothing is transmitted to external servers or committed to version control.
- **Bilingual Interface (i18n)**: First-class internationalization with instant switching between English (EN) and Brazilian Portuguese (PT-BR).

---

## ✨ Key Features

### 1. Smart Kanban Flow
Automated classification and manual drag-and-drop override across 6 distinct lifecycle columns:
- 🔴 **Issues (`problema`)**: PRs blocked by merge conflicts, failing CI checks, or explicit review rejections.
- 🔵 **To Review (`revisar`)**: Incoming PRs waiting for your review, or your authored PRs with unaddressed feedback.
- 🟢 **Finalized (`finalizado`)**: Feedback resolved, draft PRs ready for publishing, or ready for re-review.
- ⚪ **Review Pending (`revisado`)**: Awaiting response from upstream maintainers or designated reviewers.
- ⭐ **Approved (`aprovado`)**: Formally approved PRs ready to merge.
- 📦 **Deferred (`arquivado`)**: Snoozed or low-priority PRs tucked away to keep your primary board focused.

### 2. SLA & Health Radar
- Automatic waiting-time tracking with color-coded SLA badges: **7 days**, **14 days**, and **30+ days**.
- **Bot Noise Cancellation**: Ignores automated bot comments (e.g., Dependabot, Codecov, CI bots) to calculate response delays accurately based on real human interactions.

### 3. Quick-Wins (Rebase Only) Filter
- Instantly isolates PRs that have merge conflicts but already pass CI checks and have no pending review blockers.
- Perfect for quickly clearing backlog items in seconds.

### 4. Local Git Worktree Integration
- Automatically discovers local git repositories and active worktrees matching your PR branches.
- **One-Click Local Rebase**: Executes `git fetch` and `git rebase origin/main` directly in your local worktree from the web UI.
- Displays conflicted files upon rebase failures, with one-click options to **Abort** (`git rebase --abort`) or safely **Push** (`git push --force-with-lease`).

### 5. Daily Focus Queue & Notes
- Pin critical items to the **Focus Queue (Today)** to eliminate context switching and prioritize your daily deep-work sessions.
- Interactive checklists and per-PR markdown notes saved locally.

### 6. Discord & Standup Markdown Exporter
- Export cleanly formatted markdown links (`[#123 Title](url)`) filtered by preset scopes:
  - *Ready PRs*: Clean, conflict-free, CI-passing PRs.
  - *Focus / Finalize*: Your daily focus items and approved PRs.
  - *All Authored*: Complete list of your open PRs.
- Includes a 1-click "Mark as Sent" toggle to track what has already been reported.

### 7. Compact Table View & Batch Operations
- Toggle between Kanban, Table, and Focus Queue views.
- Select multiple PRs to perform bulk status updates, priority assignments, or archiving.

### 8. Custom Tag Manager & Visual Themes
- Create and organize colored tags (`rose`, `amber`, `emerald`, `sky`, `violet`, `cyan`, `zinc`).
- Built-in theme selector with high-contrast Dark and Light modes (*Neutral Graphite*, *Modern Light*, *Pastel Sage*, *Pastel Lavender*, *Ocean Blue*, *Emerald*, *Soft Dark*).

---

## 🏗️ Architecture

```
PR-Hub-Craft/
├── server/                 # Lightweight Node.js server (Native node:http, zero runtime dependencies)
│   ├── index.js            # HTTP routing, REST API endpoints, static file server
│   ├── github.js           # GitHub GraphQL queries executed via 'gh api graphql'
│   ├── store.js            # Atomic local JSON storage engine for user state & PR cache
│   └── worktrees.js        # Git worktree scanner and automated rebase executor
├── src/                    # Frontend React 18 SPA (Vite + Tailwind CSS + Lucide Icons)
│   ├── components/         # Modular UI components (Kanban, Table, Detail Drawer, Modals)
│   ├── utils/              # SLA algorithms, color helpers, and filtering logic
│   ├── i18n.jsx            # Dynamic internationalization provider (EN / PT-BR)
│   ├── api.js              # REST client for backend communication
│   ├── App.jsx             # Root application orchestrator
│   └── main.jsx            # React client entry point
├── dist/                   # Production build output (generated via npm run build)
├── data/                   # Local database directory (git-ignored)
│   ├── pr-cache.json       # Cached GitHub GraphQL responses
│   └── user-state.json     # User priorities, custom tags, notes, and checklists
├── .env.example            # Documented optional environment variables
└── package.json            # Project manifest and scripts
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: version `18.0.0` or higher (`node -v`).
2. **GitHub CLI (`gh`)**: installed and authenticated on your machine:
   ```bash
   gh auth status
   ```
   *If you are not yet authenticated, run `gh auth login` and complete the browser or token flow.*

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/batistalucasv/PR-Hub-Craft.git
cd PR-Hub-Craft
npm install
```

### Optional Configuration (`.env`)

Copy the sample environment file if you wish to customize port or scan paths:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4321` | HTTP server port. |
| `WORKTREE_SCAN_DIRS` | `../` | Comma-separated list of root directories to scan for local git worktrees. |
| `MAINTAINER_LOGINS` | *(Empty)* | Comma-separated list of GitHub logins to treat as maintainers. If omitted, any non-bot reviewer is accepted. |

### Running in Production (Recommended)

Build the client bundle and start the unified server:

```bash
npm run build
npm start
```

Open your browser at **[http://localhost:4321](http://localhost:4321)**.

### Running in Development Mode

To run with Hot Module Replacement (HMR):

```bash
# Terminal 1: Start backend server
npm start

# Terminal 2: Start Vite development server
npm run dev
```

---

## 📡 REST API Reference

The local server exposes the following endpoints under `http://localhost:4321/api`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/prs` | Retrieves consolidated PR list from local cache or fetches upstream if expired (`?refresh=true`). |
| `GET` | `/api/prs/:key/details` | Fetches extended PR metadata (reviews, comment threads, CI check runs). |
| `PATCH` | `/api/prs/:key/state` | Updates local PR state (`manualStage`, `priority`, `workStatus`, `notes`, `tags`, etc.). |
| `POST` | `/api/prs/batch` | Applies state mutations to multiple PRs in a single batch request. |
| `GET` | `/api/tags` | Lists all user-created custom tags. |
| `POST` | `/api/tags` | Creates or updates a custom tag (`id`, `label`, `color`). |
| `DELETE` | `/api/tags/:id` | Deletes a custom tag and unbinds it from all associated PRs. |
| `POST` | `/api/worktrees/rebase` | Triggers automated local git rebase in the corresponding worktree directory. |
| `POST` | `/api/worktrees/abort-rebase` | Aborts an active rebase (`git rebase --abort`). |
| `POST` | `/api/worktrees/push-rebase` | Pushes rebased branch with `--force-with-lease`. |
| `POST` | `/api/prs/gh-action` | Executes quick actions via GitHub CLI (`ready_for_review`, `re_request_review`). |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus search bar immediately. |
| `Escape` | Clear search query or close active drawer / modal. |
| `1` | Switch to Kanban Board view. |
| `2` | Switch to Table view. |
| `3` | Switch to Focus Queue view. |
| `4` | Switch to Discord Export view. |
| `R` | Trigger manual PR refresh from GitHub. |

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork the project.
2. Create your feature branch: `git checkout -b feature/my-enhancement`.
3. Commit your changes: `git commit -m 'feat: add enhancement'`.
4. Push to the branch: `git push origin feature/my-enhancement`.
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.
