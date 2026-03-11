/**
 * Offline Indicator Component
 * Prominently displays when the app is offline
 */

'use client';

import { WifiOff, Download } from 'lucide-react';
import { useSyncStatus } from '@/lib/db/hooks';

export function OfflineIndicator() {
  const { isOnline } = useSyncStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
              <WifiOff className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                You're offline
              </p>
              <p className="text-xs text-amber-700">
                Your work is being saved locally and will sync when you're back online.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Download className="w-4 h-4" />
            <span>Working locally</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfflineBanner({ message }: { message?: string }) {
  const { isOnline } = useSyncStatus();

  if (isOnline) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-900">
            Offline Mode
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            {message ||
              "You're currently offline. All changes are saved locally and will sync automatically when you reconnect."}
          </p>
        </div>
      </div>
    </div>
  );
}
