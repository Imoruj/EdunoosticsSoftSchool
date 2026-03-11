/**
 * Sync Status Indicator Component
 * Shows current sync state and last sync time
 */

'use client';

import { CheckCircle, Loader2, Cloud, WifiOff, Zap } from 'lucide-react';
import { useSyncStatus } from '@/lib/db/hooks';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatus() {
  const { syncState, lastSyncAt, isOnline } = useSyncStatus();

  const getStatusIcon = () => {
    switch (syncState) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'syncing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'p2p':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncState) {
      case 'synced':
        return 'All changes saved';
      case 'syncing':
        return 'Syncing...';
      case 'p2p':
        return 'Syncing with peers';
      case 'offline':
        return 'Offline - changes saved locally';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (syncState) {
      case 'synced':
        return 'text-green-700';
      case 'syncing':
      case 'p2p':
        return 'text-blue-700';
      case 'offline':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {getStatusIcon()}
      <span className={getStatusColor()}>{getStatusText()}</span>
      {lastSyncAt && isOnline && (
        <span className="text-xs text-gray-500">
          • {formatDistanceToNow(lastSyncAt, { addSuffix: true })}
        </span>
      )}
    </div>
  );
}

export function SyncStatusBadge() {
  const { syncState, isOnline } = useSyncStatus();

  if (syncState === 'synced') return null;

  return (
    <div
      className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${
        syncState === 'offline'
          ? 'bg-gray-100 text-gray-700'
          : 'bg-blue-100 text-blue-700'
      }
    `}
    >
      {syncState === 'offline' ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : syncState === 'syncing' ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <Zap className="w-3 h-3" />
          <span>P2P</span>
        </>
      )}
    </div>
  );
}
