import { db } from './db';

// Configuration
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Check online status safely
 */
function isOnline(): boolean {
  return isBrowser ? navigator.onLine : false;
}

/**
 * Synchronizes all pending changes with the backend
 * @returns Promise<boolean> - Whether sync was successful
 */
export async function syncWithBackend(): Promise<boolean> {
  // Don't attempt sync if not in browser or offline
  if (!isBrowser || !isOnline()) return false;
  
  try {
    // Get pending items from queue
    const items = await db.syncQueue.toArray();
    if (items.length === 0) return true;
    
    // Process each item
    for (const item of items) {
      await processItem(item);
    }
    
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  }
}

/**
 * Process an individual sync queue item
 */
async function processItem(item: {
  id: string;
  table: string;
  action: 'add' | 'update' | 'delete';
  data: Record<string, unknown>;
}) {
  // TODO: Implement actual sync with backend
  // In a real implementation, this would make the actual API call using endpoint and method
  /* 
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const endpoint = `${API_BASE_URL}/${item.table}`;
  const method = item.action === 'add' ? 'POST' : item.action === 'update' ? 'PUT' : 'DELETE';
  
  // API call would go here
  */
  
  // For now just simulate successful sync
  
  // Mark record as synced
  const recordId = item.data.id as string;
  const table = item.table;
  
  try {
    if (table === 'expenses' && recordId) {
      await db.expenses.update(recordId, { 
        _synced: true,
        _lastModified: Date.now()
      });
    } else if (table === 'groups' && recordId) {
      await db.groups.update(recordId, { 
        _synced: true,
        _lastModified: Date.now()
      });
    } else if (table === 'friends' && recordId) {
      await db.friends.update(recordId, { 
        _synced: true,
        _lastModified: Date.now()
      });
    }
  
    // Remove from queue
    await db.syncQueue.delete(item.id);
  } catch (error) {
    console.error('Error processing sync item:', error);
    throw error;
  }
}

/**
 * Sets up automatic background synchronization
 */
export function setupAutomaticSync(): () => void {
  // Only run in browser environment
  if (!isBrowser) return () => {};
  
  let syncHandlerAdded = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  // Setup function to run after the component is mounted
  const setupSync = () => {
    // Perform initial sync
    syncWithBackend().catch(console.error);
    
    // Set up event listeners for online status
    const syncHandler = () => {
      syncWithBackend().catch(console.error);
    };
    
    if (!syncHandlerAdded) {
      window.addEventListener('online', syncHandler);
      syncHandlerAdded = true;
    }
    
    // Create interval for periodic sync
    if (!intervalId) {
      intervalId = setInterval(() => {
        if (isOnline()) {
          syncWithBackend().catch(console.error);
        }
      }, SYNC_INTERVAL);
    }
    
    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      if (syncHandlerAdded) {
        window.removeEventListener('online', syncHandler);
        syncHandlerAdded = false;
      }
    };
  };
  
  return setupSync();
}

/**
 * Forces an immediate sync with the backend
 */
export async function forceSync(): Promise<boolean> {
  if (!isBrowser) return false;
  
  return syncWithBackend();
} 