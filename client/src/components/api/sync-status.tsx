import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  Check,
  Clock, 
  RefreshCw,
  ServerCrash,
  Settings,
  Loader2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface SyncError {
  timestamp: Date;
  message: string;
  endpoint: string;
  statusCode?: number;
  responseBody?: string;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncErrors: SyncError[];
}

interface ApiConfig {
  id: number;
  shopMonitorApiKey: string;
  shopMonitorApiUrl: string;
  syncEnabled: boolean;
  syncInterval: number;
  alertsEnabled: boolean;
  pushUserData: boolean;
  pushLocationData: boolean;
  pushMachineData: boolean;
  pullAccessLogs: boolean;
  updatedAt: Date;
}

export function SyncStatus() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  
  // Fetch sync status with increased refresh rate during active sync
  const { data: syncStatus, isLoading: isLoadingSyncStatus, isRefetching: isRefetchingSyncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sync/status");
      if (!res.ok) throw new Error("Failed to fetch sync status");
      return await res.json();
    },
    refetchInterval: (data) => data?.isSyncing ? 2000 : 30000, // Refresh every 2 seconds during sync, otherwise 30 seconds
    refetchIntervalInBackground: true,
  });
  
  // Fetch API configuration
  const { data: apiConfig, isLoading: isLoadingConfig } = useQuery<ApiConfig>({
    queryKey: ["/api/api-config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/api-config");
      if (!res.ok) throw new Error("Failed to fetch API configuration");
      return await res.json();
    },
  });
  
  // Update API configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<ApiConfig>) => {
      const res = await apiRequest("POST", "/api/api-config", updatedConfig);
      if (!res.ok) throw new Error("Failed to update API configuration");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-config"] });
      setEditMode(false);
      toast({
        title: "Configuration updated",
        description: "API configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Trigger manual sync
  const syncNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync/now");
      if (!res.ok) throw new Error("Failed to trigger sync");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({
        title: "Sync triggered",
        description: "Manual synchronization has been triggered.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to trigger sync",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Test API connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync/test");
      if (!res.ok) throw new Error("Failed to test connection");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection test successful",
        description: "Successfully connected to the external API.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const [formState, setFormState] = useState<Partial<ApiConfig>>({});
  
  const handleEditClick = () => {
    if (apiConfig) {
      setFormState({
        shopMonitorApiKey: apiConfig.shopMonitorApiKey,
        shopMonitorApiUrl: apiConfig.shopMonitorApiUrl,
        syncEnabled: apiConfig.syncEnabled,
        syncInterval: apiConfig.syncInterval,
        alertsEnabled: apiConfig.alertsEnabled,
        pushUserData: apiConfig.pushUserData,
        pushLocationData: apiConfig.pushLocationData,
        pushMachineData: apiConfig.pushMachineData,
        pullAccessLogs: apiConfig.pullAccessLogs,
      });
    }
    setEditMode(true);
  };
  
  const handleSaveClick = () => {
    updateConfigMutation.mutate(formState);
  };
  
  const handleCancelClick = () => {
    setEditMode(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      setFormState({
        ...formState,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else if (type === "number") {
      setFormState({
        ...formState,
        [name]: parseInt(value),
      });
    } else {
      setFormState({
        ...formState,
        [name]: value,
      });
    }
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState({
      ...formState,
      [name]: checked,
    });
  };
  
  const formatDatetime = (datetime: string | Date | null) => {
    if (!datetime) return "Never";
    return new Date(datetime).toLocaleString();
  };
  
  const isSyncing = syncStatus?.isSyncing || syncNowMutation.isPending;
  const isLoading = isLoadingSyncStatus || isLoadingConfig;
  
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2">Loading sync status...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">Synchronization Status</h3>
          <p className="text-muted-foreground text-sm">
            Status of the synchronization between ShopTracker and ShopMonitor
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending || isSyncing}
            className="relative"
          >
            {testConnectionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button 
            variant={isSyncing ? "outline" : "default"}
            size="sm" 
            onClick={() => syncNowMutation.mutate()}
            disabled={syncNowMutation.isPending || !apiConfig?.syncEnabled || syncStatus?.isSyncing}
            className={isSyncing ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" : ""}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Show a prominent loading state during sync */}
      {isSyncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center shadow-sm mb-6 animate-pulse">
          <RefreshCw className="h-5 w-5 text-blue-500 mr-3 animate-spin" />
          <div>
            <h3 className="text-blue-700 font-medium">Synchronization in Progress</h3>
            <p className="text-blue-600 text-sm">Data is being synchronized between ShopTracker and ShopMonitor</p>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Current Status</CardTitle>
            <Badge 
              variant={apiConfig?.syncEnabled ? "outline" : "destructive"}
              className={apiConfig?.syncEnabled ? 
                "bg-green-100 text-green-800 border-green-300" : 
                "bg-red-100 text-red-800 border-red-300"
              }
            >
              {apiConfig?.syncEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            Last Synced: {formatDatetime(syncStatus?.lastSyncTime)}
            {isRefetchingSyncStatus && !isLoading && (
              <span className="ml-2 text-xs text-blue-500 flex items-center inline-flex">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">Sync Status:</span>
                <div className="ml-2 flex items-center">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 text-blue-500 animate-spin" />
                      <span className="text-blue-500">Syncing...</span>
                    </>
                  ) : apiConfig?.syncEnabled ? (
                    <>
                      <Clock className="h-4 w-4 mr-1 text-green-500" />
                      <span className="text-green-500">Waiting for next sync</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1 text-red-500" />
                      <span className="text-red-500">Sync disabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">Sync Interval:</span>
                <span className="ml-2">{apiConfig?.syncInterval} minutes</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">API Endpoint:</span>
                <span className="ml-2 text-sm truncate max-w-xs">
                  {apiConfig?.shopMonitorApiUrl || "Not set"}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">API Key:</span>
                <span className="ml-2">
                  {apiConfig?.shopMonitorApiKey ? 
                    "••••••••" + apiConfig.shopMonitorApiKey.slice(-4) : 
                    "Not set"
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {!editMode ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Sync Configuration</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEditClick}
                  disabled={isSyncing}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${apiConfig?.alertsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Alerts System</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${apiConfig?.pushUserData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Push User Data</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${apiConfig?.pushLocationData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Push Location Data</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${apiConfig?.pushMachineData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Push Machine Data</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${apiConfig?.pullAccessLogs ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Pull Access Logs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Sync Configuration</CardTitle>
            <CardDescription>
              Configure how data should be synchronized between systems
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopMonitorApiUrl">API URL</Label>
                <Input
                  id="shopMonitorApiUrl"
                  name="shopMonitorApiUrl"
                  placeholder="https://api.example.com"
                  value={formState.shopMonitorApiUrl || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopMonitorApiKey">API Key</Label>
                <Input
                  id="shopMonitorApiKey"
                  name="shopMonitorApiKey"
                  placeholder="Enter API key"
                  value={formState.shopMonitorApiKey || ""}
                  onChange={handleInputChange}
                  type="password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                <Input
                  id="syncInterval"
                  name="syncInterval"
                  type="number"
                  min="1"
                  max="60"
                  value={formState.syncInterval || 5}
                  onChange={handleInputChange}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="syncEnabled" className="flex-1">
                    Enable Synchronization
                  </Label>
                  <Switch
                    id="syncEnabled"
                    name="syncEnabled"
                    checked={formState.syncEnabled ?? false}
                    onCheckedChange={(checked) => handleSwitchChange("syncEnabled", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alertsEnabled" className="flex-1">
                    Enable Alerts System
                  </Label>
                  <Switch
                    id="alertsEnabled"
                    name="alertsEnabled"
                    checked={formState.alertsEnabled ?? false}
                    onCheckedChange={(checked) => handleSwitchChange("alertsEnabled", checked)}
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushUserData" className="flex-1">
                      Push User Data
                    </Label>
                    <Switch
                      id="pushUserData"
                      name="pushUserData"
                      checked={formState.pushUserData ?? false}
                      onCheckedChange={(checked) => handleSwitchChange("pushUserData", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushLocationData" className="flex-1">
                      Push Location Data
                    </Label>
                    <Switch
                      id="pushLocationData"
                      name="pushLocationData"
                      checked={formState.pushLocationData ?? false}
                      onCheckedChange={(checked) => handleSwitchChange("pushLocationData", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushMachineData" className="flex-1">
                      Push Machine Data
                    </Label>
                    <Switch
                      id="pushMachineData"
                      name="pushMachineData"
                      checked={formState.pushMachineData ?? false}
                      onCheckedChange={(checked) => handleSwitchChange("pushMachineData", checked)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pullAccessLogs" className="flex-1">
                      Pull Access Logs
                    </Label>
                    <Switch
                      id="pullAccessLogs"
                      name="pullAccessLogs"
                      checked={formState.pullAccessLogs ?? false}
                      onCheckedChange={(checked) => handleSwitchChange("pullAccessLogs", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCancelClick}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveClick}
              disabled={updateConfigMutation.isPending}
            >
              {updateConfigMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Sync errors */}
      {syncStatus?.syncErrors && syncStatus.syncErrors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <CardTitle>Sync Errors</CardTitle>
            </div>
            <CardDescription>
              Recent errors encountered during synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {syncStatus.syncErrors.map((error, index) => (
                <AccordionItem key={index} value={`error-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center">
                      <ServerCrash className="h-4 w-4 text-red-500 mr-2" />
                      <span className="font-medium">
                        {error.endpoint} - {error.statusCode || "Error"}
                      </span>
                      <span className="ml-4 text-muted-foreground text-xs">
                        {formatDatetime(error.timestamp)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 p-2 bg-slate-50 rounded-md">
                      <p className="font-medium">Message:</p>
                      <p className="text-sm text-red-600">{error.message}</p>
                      
                      {error.responseBody && (
                        <>
                          <p className="font-medium mt-2">Response:</p>
                          <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                            {error.responseBody}
                          </pre>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}