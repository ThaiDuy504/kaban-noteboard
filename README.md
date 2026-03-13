# Jottie — Smart Note Board

> A Kanban-style note board with AI-powered categorization and tagging

Jottie lets you organise your thoughts across customisable boards and columns. Type a note, hit the AI button, and Llama 3.2 (running locally via Ollama) will suggest the best column and relevant hashtags for you — all without sending your data to the cloud.

---

## Features

- **Kanban boards** — Create multiple boards, each with configurable columns
- **Drag-and-drop** — Move notes between columns with smooth visual feedback
- **Google Keep-style editor** — Inline tag input with `#` trigger and category selector
- **AI suggestions** — Local Llama 3.2 model categorises notes and generates hashtags automatically
- **User authentication** — Email/password registration and login backed by JWT + NextAuth.js v5
- **Real-time optimistic UI** — Drag-and-drop updates are applied instantly, then reconciled with the server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Drag & drop | @dnd-kit |
| Auth | NextAuth.js v5, JWT, bcryptjs |
| Data fetching | SWR |
| Backend | Express.js 5, TypeScript |
| Database | PostgreSQL 16, Drizzle ORM |
| AI | Ollama (Llama 3.2) |
| Runtime / package manager | Bun |
| Containers | Docker Compose |

---

## Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- [Docker](https://www.docker.com/) & Docker Compose

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/ThaiDuy504/kaban-noteboard.git
cd kaban-noteboard
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set `NEXTAUTH_SECRET` to a random string. The other defaults work out of the box with Docker Compose.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/jottie` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | *(set this)* | Secret used to sign NextAuth sessions |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public URL of the frontend |
| `BACKEND_URL` | `http://localhost:3001` | URL the frontend uses to reach the API |
| `PORT` | `3001` | Port the Express server listens on |
| `OLLAMA_URL` | `http://localhost:11434` | URL of the Ollama service |

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432`
- **Ollama** on port `11434` (the Llama 3.2 model is pulled automatically on the first AI request)

### 4. Install dependencies

```bash
cd backend && bun install
cd ../frontend && bun install
```

### 5. Apply the database schema

```bash
cd backend
bun run db:push
```

### 6. Start the backend

```bash
cd backend
bun run dev   # http://localhost:3001
```

### 7. Start the frontend

In a new terminal:

```bash
cd frontend
bun run dev   # http://localhost:3000
```

### 8. Open the app

Navigate to [http://localhost:3000](http://localhost:3000), register a new account, and create your first board.

---

## Project Structure

```
kaban-noteboard/
├── docker-compose.yml       # PostgreSQL + Ollama services
├── .env.example             # Environment variable template
│
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── db/              # Drizzle ORM schema & connection
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── routes/          # auth, boards, columns, notes, ai
│   │   └── services/        # Ollama integration
│   └── drizzle/             # Database migrations
│
└── frontend/                # Next.js 16 app
    └── src/
        ├── app/             # App Router pages (boards, notes, auth)
        ├── components/      # UI components (board, note-editor, layout)
        ├── hooks/           # SWR data-fetching hooks
        ├── lib/             # API client, NextAuth config, utilities
        └── types/           # TypeScript interfaces
```

---

## API Overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in and receive a JWT |
| `GET` | `/api/boards` | List all boards for the current user |
| `POST` | `/api/boards` | Create a board (auto-creates 3 default columns) |
| `GET` | `/api/boards/:id` | Get a board with its columns and notes |
| `PATCH` | `/api/boards/:id` | Rename or reorder a board |
| `DELETE` | `/api/boards/:id` | Delete a board |
| `POST` | `/api/columns` | Add a column to a board |
| `PATCH` | `/api/columns/:id` | Rename or reorder a column |
| `DELETE` | `/api/columns/:id` | Delete a column |
| `POST` | `/api/notes` | Create a note |
| `PATCH` | `/api/notes/:id` | Update note content, column, or tags |
| `DELETE` | `/api/notes/:id` | Delete a note |
| `POST` | `/api/notes/:id/move` | Move a note to a different column |
| `POST` | `/api/notes/reorder` | Bulk-reorder notes within a column |
| `POST` | `/api/ai/suggest` | Get AI category + hashtag suggestions |

---

## Database Schema

Six tables managed by Drizzle ORM:

- **users** — accounts with hashed passwords
- **boards** — user-owned boards
- **columns** — ordered columns within a board (`todo` / `idea` / `question` / `custom`)
- **notes** — note content, assigned column, and ordering
- **tags** — unique hashtags (user-created or AI-generated)
- **note_tags** — many-to-many junction between notes and tags

---

## License

This project is open source. See [LICENSE](LICENSE) for details.
