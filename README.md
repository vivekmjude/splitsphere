# SplitSphere

A modern expense-splitting app that helps you track shared expenses with friends and groups, calculate who owes whom, and settle up.

## Current Status

The application is currently in early development with a functional frontend and a backend that is under development:
- Frontend: Fully operational with local storage using IndexedDB
- Backend: Currently a placeholder
- Data Sync: All data is currently stored locally, backend sync will be added in future releases

## Tech Stack
- **Frontend**: Next.js 14 (TypeScript), TailwindCSS, shadcn/ui, Bun
- **Client Storage**: IndexedDB (via Dexie.js) for offline-first operation
- **Backend** (planned): FastAPI, Python 3.13, Pydantic v2, Alembic, Poetry
- **Database** (planned): Supabase (PostgreSQL)
- **Containerization**: Docker + Docker Compose

## Architecture
SplitSphere uses an offline-first architecture:
- Data is stored locally in IndexedDB for immediate access and offline capability
- Operations happen on local data first, providing instant feedback and snappiness
- Changes are synced with the backend when:
  - The user manually triggers a sync
  - The device comes back online after being offline
  - Periodic automatic background syncing (every 5 minutes by default)
- The app works fully offline, with data synchronizing when connectivity is restored

This approach offers several advantages:
- Significantly improved app responsiveness and user experience
- Full functionality even without an internet connection
- Reduced server load by batching operations
- More resilient to poor network conditions

## Currently Supported Features
- Create and manage expenses with multiple participants
- Create and manage groups for shared expenses
- Add and manage friends
- Calculate settlements between users
- Record payments between users
- Offline operation with local storage
- Multi-currency support

## Prerequisites
- [Bun](https://bun.sh/) (irm https://bun.sh/install.ps1 | iex)
- [Docker](https://docs.docker.com/get-docker/) (for running the development environment)
- [Poetry](https://python-poetry.org/docs/#installation) ((Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -) (for backend development)
- Python 3.13 (via pyenv or system install) (for backend development)

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone <repo-url> splitsphere
   cd splitsphere
   ```
2. For frontend development (currently the only functional part):
   ```bash
   cd frontend
   bun install
   bun dev
   ```
3. To run the development environment with Docker:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

## Development
You have several options for development:

### Using Docker Compose
```bash
# Start all services with hot reloading
docker compose -f docker-compose.dev.yml up --build

# Start services with Docker watch (requires Docker Desktop >= 4.26)
docker compose -f docker-compose.dev.yml watch
```

### Running frontend individually (recommended for now)
```bash
cd frontend
bun install
bun dev
```

## Project Structure
- frontend/: Next.js frontend with shadcn/ui, TailwindCSS, and IndexedDB
  - src/lib/db.ts: IndexedDB configuration and database schema
  - src/lib/sync.ts: Backend synchronization utilities (placeholder)
  - src/store/: Zustand stores with IndexedDB integration
  - src/components/providers/DbProvider.tsx: Database initialization
- backend/: FastAPI backend (placeholder, in development)
- docker-compose.yml: Orchestrates frontend, backend, and database services

## Planned Upcoming Features
- Backend API implementation and data synchronization
- User authentication and accounts
- AI-powered voice transaction entry
- Recurring expenses
- Activity timeline and notifications
- Export to CSV/PDF
