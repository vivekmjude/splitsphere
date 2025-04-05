"use client";

import { useEffect, useState } from 'react';
import { setupAutomaticSync } from '@/lib/sync';
import { useExpenseStore } from '@/store/expense-store';
import { useGroupsStore } from '@/store/groups-store';
import { useFriendsStore } from '@/store/friends-store';
import { db } from '@/lib/db';

// Set this to true if you want to reset the database on startup (for development/testing)
const RESET_DB_ON_START = false;

export default function DbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loadExpenses } = useExpenseStore();
  const { loadGroups } = useGroupsStore();
  const { loadFriends } = useFriendsStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Avoid re-initializing on every render
    if (isInitialized) return;

    let cleanupSync: (() => void) | undefined;

    const initializeDb = async () => {
      try {
        // Ensure database is open
        await db.open();
        
        // Optionally reset the database (for development/testing)
        if (RESET_DB_ON_START) {
          console.log('Resetting IndexedDB...');
          await Promise.all([
            db.expenses.clear(),
            db.groups.clear(),
            db.friends.clear(),
            db.syncQueue.clear(),
            db.user.clear()
          ]);
        }
        
        // Load initial data from IndexedDB
        await Promise.all([
          loadExpenses(),
          loadGroups(),
          loadFriends()
        ]);
        
        // Setup automatic sync
        cleanupSync = setupAutomaticSync();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        
        // Handle known errors
        if (error instanceof Error) {
          if (error.name === 'VersionError') {
            console.error('Database version mismatch. Try clearing your browser data and reloading.');
          } else if (error.name === 'ConstraintError') {
            console.error('Key constraint error. Try setting RESET_DB_ON_START to true and reloading.');
          }
        }
      }
    };

    initializeDb();
    
    // Only close the database when the application is unmounted
    return () => {
      if (cleanupSync) cleanupSync();
      // We intentionally do NOT close the database here, as it needs to remain open for access during tab navigation
      // The database will be automatically closed when the browser tab/window is closed
    };
  }, [loadExpenses, loadGroups, loadFriends, isInitialized]);

  // We could show a loading spinner here if needed
  return <>{children}</>;
} 