import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncErrors: any[];
}

interface SyncLoadingIndicatorProps {
  variant?: "badge" | "icon" | "text" | "full";
  className?: string;
  showText?: boolean;
}

export function SyncLoadingIndicator({ 
  variant = "icon", 
  className = "",
  showText = true
}: SyncLoadingIndicatorProps) {
  // Fetch sync status with high refresh rate during active sync
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sync/status");
      if (!res.ok) throw new Error("Failed to fetch sync status");
      return await res.json();
    },
    refetchInterval: syncStatus => syncStatus?.isSyncing ? 2000 : 30000, // Refresh every 2 seconds during sync, otherwise 30 seconds
    refetchIntervalInBackground: true,
  });

  const isSyncing = syncStatus?.isSyncing || false;

  if (!isSyncing) {
    return null; // Don't render anything if not syncing
  }

  // Different visual representations based on the variant
  switch (variant) {
    case "badge":
      return (
        <Badge variant="outline" className={`bg-blue-100 text-blue-800 border-blue-200 animate-pulse ${className}`}>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          {showText && "Syncing..."}
        </Badge>
      );

    case "icon":
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          {showText && <span className="ml-1 text-xs text-blue-500">Syncing</span>}
        </div>
      );

    case "text":
      return (
        <span className={`text-blue-500 text-sm flex items-center ${className}`}>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing with external systems...
        </span>
      );

    case "full":
      return (
        <div className={`flex items-center bg-blue-50 border border-blue-200 rounded-md px-3 py-2 ${className}`}>
          <RefreshCw className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-700">Synchronization in Progress</p>
            <p className="text-xs text-blue-600">Data is being synchronized with external systems</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}