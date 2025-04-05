# SplitSphere Frontend

This is the Next.js frontend for SplitSphere, built with an offline-first architecture using IndexedDB.

## Tech Stack

- [Next.js 14](https://nextjs.org) with App Router
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com) for styling
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Dexie.js](https://dexie.org/) for IndexedDB management
- [Zustand](https://zustand-demo.pmnd.rs/) for state management

## Currently Supported Features

- Create and manage expenses with multiple participants
- Split bills evenly or with custom amounts
- Create and manage groups for shared expenses
- Add and manage friends
- Calculate settlements between users
- Record payments between users
- Offline-first operation with background sync
- Multi-currency support

## IndexedDB Implementation

SplitSphere uses an offline-first approach where:

- All data is stored in IndexedDB for local access
- Changes are made to local data first, then synced to the backend
- The app works fully offline with synchronization when online

Key components:
- `src/lib/db.ts` - IndexedDB database schema and helper functions
- `src/lib/sync.ts` - Backend synchronization utilities
- `src/store/*.ts` - State stores with IndexedDB integration
- `src/components/SyncStatus.tsx` - UI component showing sync status
- `src/components/providers/DbProvider.tsx` - Database initialization

## Getting Started

```bash
# Install dependencies
bun install

# Run the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

### Setting up for dev

During development, if you encounter database issues, you can reset the IndexedDB:

1. Open `src/components/providers/DbProvider.tsx`
2. Set `RESET_DB_ON_START` to `true` for a one-time database reset
3. Refresh the application

### State Management

All state is managed through Zustand stores that are backed by IndexedDB:

- `useExpenseStore` - Expense management
- `useGroupsStore` - Groups management
- `useFriendsStore` - Friends management

Each store follows the same pattern:
1. Load data from IndexedDB on initialization
2. Update IndexedDB first, then update UI state
3. Add changes to the sync queue for backend synchronization

### Testing Offline Mode

To test the offline capabilities:
1. Open the application normally
2. Use Chrome DevTools to toggle offline mode (Network tab → Offline)
3. Add expenses, create groups, etc.
4. Toggle back to online mode
5. Click "Sync now" in the status indicator to manually trigger sync

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Dexie.js Documentation](https://dexie.org/docs/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

## Future Features

- AI-powered voice transaction entry
- Receipt OCR for automatic expense extraction
- Bill splitting using image recognition
- Recurring expenses
- Activity timeline and notifications
- Export to CSV/PDF
