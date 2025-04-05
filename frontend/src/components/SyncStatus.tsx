"use client";

import { useEffect, useState, useRef } from 'react';
import { getSyncStatus } from '@/lib/db';
import { forceSync } from '@/lib/sync';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  compact?: boolean;
}

export default function SyncStatus({ compact = false }: SyncStatusProps) {
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSyncDone, setShowSyncDone] = useState(false);
  const [notificationClass, setNotificationClass] = useState('');
  const syncDoneTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear any existing timers on unmount
  useEffect(() => {
    return () => {
      if (syncDoneTimerRef.current) {
        clearTimeout(syncDoneTimerRef.current);
      }
    };
  }, []);
  
  // Run only on the client-side after mounting
  useEffect(() => {
    setMounted(true);
    
    // Set initial online status
    setIsOnline(navigator.onLine);
    
    // Setup online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Poll for changes to sync status
  useEffect(() => {
    if (!mounted) return;
    
    let isActive = true;
    
    const checkStatus = async () => {
      try {
        const status = await getSyncStatus();
        if (isActive) {
          // If syncing was true and now we have 0 pending changes, show notification
          if (isSyncing && pendingChanges > 0 && status.pendingChanges === 0) {
            showSyncCompletedNotification();
          }
          
          setPendingChanges(status.pendingChanges);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to get sync status:', err);
        if (isActive) {
          setError('Could not check sync status');
        }
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Then check periodically
    const intervalId = setInterval(checkStatus, 5000);
    
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [mounted, isSyncing, pendingChanges]);
  
  const showSyncCompletedNotification = () => {
    // Clear any existing timer
    if (syncDoneTimerRef.current) {
      clearTimeout(syncDoneTimerRef.current);
    }
    
    // Set animation class based on compact mode (mobile vs desktop)
    const animClass = compact ? 'sync-notification-mobile-enter' : 'sync-notification-enter';
    setNotificationClass(animClass);
    
    // Show notification
    setShowSyncDone(true);
    
    // Auto hide after 3 seconds
    syncDoneTimerRef.current = setTimeout(() => {
      // First change the animation class to exit animation
      const exitClass = compact ? 'sync-notification-mobile-exit' : 'sync-notification-exit';
      setNotificationClass(exitClass);
      
      // After animation completes, hide the notification
      setTimeout(() => {
        setShowSyncDone(false);
      }, 300); // Same duration as the animation
      
    }, 3000);
  };
  
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      await forceSync();
      setLastSynced(new Date());
      
      // Update pending changes count
      const status = await getSyncStatus();
      setPendingChanges(status.pendingChanges);
      
      // Show completion notification
      if (status.pendingChanges === 0) {
        showSyncCompletedNotification();
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setError('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };
  
  // If not mounted yet, render nothing to avoid hydration mismatch
  if (!mounted) {
    return null;
  }
  
  // Don't show anything if offline and no pending changes
  if (!isOnline && pendingChanges === 0) {
    return null;
  }
  
  // Compact version for mobile
  if (compact) {
    return (
      <div className="flex items-center relative">
        <div className={`w-2 h-2 rounded-full mr-1 ${pendingChanges > 0 ? 'bg-secondary' : 'bg-success'}`} />
        {pendingChanges > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="text-primary hover:underline text-xs"
            aria-label={isSyncing ? 'Syncing...' : 'Sync now'}
          >
            {isSyncing ? '...' : pendingChanges}
          </button>
        )}
        
        {/* Sync done notification for compact view */}
        {showSyncDone && (
          <div 
            className={cn(
              "absolute top-full right-0 mt-2 bg-success/90 text-success-foreground text-xs px-2 py-1 rounded shadow z-50", 
              notificationClass
            )}
          >
            <div className="flex items-center gap-1">
              <CheckIcon className="w-3 h-3" />
              <span>Sync complete</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Full version
  return (
    <div className="flex items-center gap-2 text-sm relative">
      {error ? (
        <div className="text-destructive flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <>
          <div className={`w-2 h-2 rounded-full ${pendingChanges > 0 ? 'bg-secondary' : 'bg-success'}`} />
          
          <span>
            {!isOnline && pendingChanges > 0 && 'Offline, '}
            {pendingChanges > 0 
              ? `${pendingChanges} change${pendingChanges !== 1 ? 's' : ''} pending`
              : 'All changes synced'
            }
          </span>
          
          {pendingChanges > 0 && isOnline && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-primary hover:underline text-xs"
            >
              {isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
          )}
          
          {lastSynced && (
            <span className="text-xs text-muted-foreground">
              Last synced: {lastSynced.toLocaleTimeString()}
            </span>
          )}
          
          {/* Sync done notification for full view */}
          {showSyncDone && (
            <div 
              className={cn(
                "absolute -top-10 right-0 bg-success/90 text-success-foreground text-xs px-2 py-1 rounded shadow z-50", 
                notificationClass
              )}
            >
              <div className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                <span>Sync complete</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}