import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter
} from "@/components/ui/card";
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  Code, 
  Clock, 
  Settings, 
  Server,
  BarChart,
  RefreshCcw,
  Database,
  Activity
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SyncStatus } from "@/components/api/sync-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Form validation schema
const apiConfigSchema = z.object({
  shopMonitorApiKey: z.string().min(1, "API key is required"),
  shopMonitorApiUrl: z.string().url("Must be a valid URL"),
  syncEnabled: z.boolean().default(true),
  syncInterval: z.number().int().min(1, "Interval must be at least 1 minute"),
  alertsEnabled: z.boolean().default(true),
  pushUserData: z.boolean().default(true),
  pushLocationData: z.boolean().default(true),
  pushMachineData: z.boolean().default(true),
  pullAccessLogs: z.boolean().default(true),
});

type ApiConfig = z.infer<typeof apiConfigSchema>;

export default function ApiConfigPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  // DB diagnostics moved to Settings -> Database

  // Create form
  const form = useForm<ApiConfig>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      shopMonitorApiKey: "",
      shopMonitorApiUrl: "https://api.shopmonitor.app",
      syncEnabled: true,
      syncInterval: 5,
      alertsEnabled: true,
      pushUserData: true,
      pushLocationData: true,
      pushMachineData: true,
      pullAccessLogs: true,
    },
  });

  // Fetch API configuration
  const { data: apiConfig, error: apiConfigError } = useQuery<ApiConfig>({
    queryKey: ["/api/api-config"],
    enabled: !!user && user.role === "admin",
  });
  
  // Handle data loading and errors
  useEffect(() => {
    if (apiConfig) {
      form.reset(apiConfig);
      setIsLoading(false);
    }
  }, [apiConfig, form]);
  
  useEffect(() => {
    if (apiConfigError) {
      console.error("Error fetching API config:", apiConfigError);
      setIsLoading(false);
    }
  }, [apiConfigError]);
  
  // Add a fallback timeout to ensure we don't get stuck in loading state
  useEffect(() => {
    // If we're still loading after 2 seconds, initialize the form with defaults
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("Loading timeout, using default values");
        setIsLoading(false);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // DB Info no longer loaded here

  // Update API configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: ApiConfig) => {
      const response = await apiRequest("POST", "/api/api-config", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-config"] });
      toast({
        title: "Success",
        description: "API configuration updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update API configuration: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test API connection
  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/api-config/test", form.getValues());
      const result = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: result.message || "Connection successful",
        });
      } else {
        setTestResult({
          success: false,
          message: result.message || "Connection failed",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Submit handler
  const onSubmit = (data: ApiConfig) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const renderConfigurationTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure the connection to the ShopMonitor service.
            This will allow for synchronization of RFID cards and access logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="shopMonitorApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Input 
                            placeholder="Enter API key" 
                            {...field} 
                            type="password"
                            className="flex-grow"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        The API key for authenticating with the ShopMonitor service.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopMonitorApiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter API URL" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The base URL for the ShopMonitor API.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="syncEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Synchronization</FormLabel>
                        <FormDescription>
                          Automatically sync RFID cards and access logs from ShopMonitor.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="syncInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Interval (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                          disabled={!form.watch("syncEnabled")}
                        />
                      </FormControl>
                      <FormDescription>
                        How often to check for updates from ShopMonitor.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />
              
              <h3 className="text-lg font-medium mb-4">Sync Configuration Options</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="alertsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Alerts System</FormLabel>
                        <FormDescription>
                          Enable bidirectional alerts between ShopTracker and ShopMonitor.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pullAccessLogs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Pull Access Logs</FormLabel>
                        <FormDescription>
                          Pull access logs from ShopMonitor to track machine usage.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="pushUserData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Push User Data</FormLabel>
                        <FormDescription>
                          Send user data to ShopMonitor.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pushLocationData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Push Location Data</FormLabel>
                        <FormDescription>
                          Send location data to ShopMonitor.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pushMachineData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Push Machine Data</FormLabel>
                        <FormDescription>
                          Send machine configuration to ShopMonitor.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
                  <AlertTitle>
                    {testResult.success ? "Connection Successful" : "Connection Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={isTesting || updateConfigMutation.isPending}
                >
                  {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {!isTesting && <RefreshCw className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {!updateConfigMutation.isPending && (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderDatabaseTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Diagnostics Moved</CardTitle>
          <CardDescription>
            Database connection details now live under Settings → Database. This page focuses on API config only.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  const renderSyncStatus = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Status</CardTitle>
          <CardDescription>
            Monitor the synchronization status between ShopTracker and ShopMonitor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncStatus />
        </CardContent>
      </Card>
    </div>
  );

  const renderApiDocumentation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Detailed information about the integration with ShopMonitor API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Overview</h3>
            <p className="text-muted-foreground mb-4">
              ShopTracker integrates with ShopMonitor to enable bidirectional communication for machine alerts, 
              access control, and data synchronization. This integration allows machine operators to receive real-time notifications, 
              administrators to monitor machine access, and ensures data consistency across both systems.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Authentication</h3>
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using an API key. The API key should be included in the 
              <code className="bg-muted px-1 py-0.5 rounded text-sm mx-1">X-API-Key</code> 
              header for all requests to the ShopMonitor API.
            </p>
            
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// Example API request with authentication
fetch('https://api.shopmonitor.app/api/sync/status', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  }
})`}
              </code>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Available Endpoints</h3>
            
            <div className="relative overflow-x-auto mt-4">
              <Tabs defaultValue="inbound">
                <TabsList className="mb-4">
                  <TabsTrigger value="inbound">Endpoints ShopMonitor Provides</TabsTrigger>
                  <TabsTrigger value="outbound">Endpoints We Call</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inbound">
                  <Table>
                    <TableCaption>ShopMonitor Inbound API Endpoints</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/integration/api/auth</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Authenticate RFID card access for a specific machine</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/integration/api/node_status</TableCell>
                        <TableCell>GET</TableCell>
                        <TableCell>Get status information about all nodes and their connected machines</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/integration/api/alerts</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Send alerts from ShopTracker to ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/integration/api/alerts/:id/acknowledge</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Acknowledge an alert in ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/integration/api/alerts/:id/resolve</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Resolve an alert in ShopMonitor</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="outbound">
                  <Table>
                    <TableCaption>API Endpoints We Call on ShopMonitor</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/users`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Push user data to ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/locations`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Push location (zone) data to ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/machines`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Push machine configuration to ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/accesslogs`}</TableCell>
                        <TableCell>GET</TableCell>
                        <TableCell>Get access logs from ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/alerts`}</TableCell>
                        <TableCell>GET</TableCell>
                        <TableCell>Get pending alerts from ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/alerts`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Send an alert to ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/alerts/:id/acknowledge`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Acknowledge an alert in ShopMonitor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{`{api_base_url}/api/alerts/:id/resolve`}</TableCell>
                        <TableCell>POST</TableCell>
                        <TableCell>Resolve an alert in ShopMonitor</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Data Structures</h3>
            
            <h4 className="font-medium mt-4 mb-2">User</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor User Structure
{
  "id": 1,
  "rfid_tag": "0123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "active": true,
  "is_offline_access": false,
  "is_admin_override": false
}

// ShopTracker User Structure
{
  "id": 1,
  "username": "user123",
  "fullName": "John Doe",
  "role": "admin",
  "rfidNumber": "0123456789",
  "email": "john@example.com"
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Machine</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor Machine Structure
{
  "id": 1,
  "machine_id": "W1",
  "name": "Welding Machine 1",
  "description": "Primary welding station",
  "zone_id": 1,
  "zone_name": "Shop Floor",
  "status": "idle",
  "current_user_id": null,
  "node_id": 1,
  "node_port": 0
}

// ShopTracker Machine Structure
{
  "id": 1,
  "name": "Welding Machine 1",
  "machineId": "W1",
  "locationId": 1
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Location/Zone</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor Zone Structure
{
  "id": 1,
  "name": "Shop Floor",
  "description": "Main manufacturing area"
}

// ShopTracker Location Structure
{
  "id": 1,
  "name": "Shop Floor",
  "usedOrder": 1,
  "isPrimary": true,
  "skipAutoQueue": false,
  "countMultiplier": 1,
  "noCount": false
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Node</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor Node Structure
{
  "id": 1,
  "node_id": "esp32_001",
  "name": "Shop Floor Node 1",
  "description": "Primary ESP32 node for shop floor",
  "ip_address": "192.168.1.100",
  "node_type": "machine_monitor",
  "is_esp32": true,
  "last_seen": "2025-04-18T12:25:45Z",
  "firmware_version": "v1.2.0",
  "status": "online"
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Authentication Request</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// Request to /integration/api/auth
{
  "card_id": "0123456789",
  "machine_id": "W1"
}

// Response
{
  "success": true,
  "user": {
    "id": 1,
    "username": "0123456789",
    "fullName": "John Doe",
    "role": "operator"
  },
  "access_level": "operator",
  "machine_id": "W1",
  "timestamp": "2025-04-18T12:30:45Z"
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Node Status Response</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// Response from /integration/api/node_status
{
  "timestamp": "2025-04-18T12:30:45Z",
  "nodes": [
    {
      "id": 1, 
      "node_id": "esp32_001",
      "name": "Shop Floor Node 1",
      "ip_address": "192.168.1.100",
      "node_type": "machine_monitor",
      "status": "online",
      "last_seen": "2025-04-18T12:25:45Z",
      "machines": [
        {
          "id": 1,
          "machine_id": "W1",
          "name": "Welding Machine 1",
          "status": "active",
          "zone": "Shop Floor",
          "current_user": {
            "id": 1,
            "name": "John Doe",
            "rfid_tag": "0123456789"
          },
          "today_access_count": 5,
          "activity_count": 42,
          "last_activity": "2025-04-18T12:15:30Z"
        }
      ]
    }
  ]
}`}
              </code>
            </div>

            <h4 className="font-medium mt-4 mb-2">Alert Structure</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor Alert Structure
{
  "id": 1,
  "external_id": 42,
  "machine_id": 1,
  "machine_name": "Welding Machine 1",
  "node_id": 1,
  "node_name": "Shop Floor Node 1",
  "user_id": 1,
  "user_name": "John Doe",
  "message": "Machine requires maintenance",
  "alert_type": "warning",
  "status": "pending",
  "origin": "machine",
  "created_at": "2025-04-18T12:30:45Z",
  "acknowledged_at": null,
  "resolved_at": null
}

// ShopTracker Alert Structure
{
  "id": 1,
  "machineId": "W1",
  "senderId": 1,
  "message": "Machine requires maintenance",
  "alertType": "warning",
  "status": "pending",
  "origin": "machine",
  "createdAt": "2025-04-18T12:30:45Z"
}`}
              </code>
            </div>
            
            <h4 className="font-medium mt-4 mb-2">Access Log</h4>
            <div className="bg-muted p-4 rounded-md">
              <code className="block whitespace-pre text-sm">
{`// ShopMonitor Machine Log
{
  "id": 1,
  "machine_id": 1,
  "user_id": 1,
  "login_time": "2025-04-18T09:30:45Z",
  "logout_time": "2025-04-18T10:45:22Z",
  "total_time": 4477,
  "status": "completed"
}

// ShopTracker Access Log
{
  "id": 1,
  "userId": 1,
  "machineId": "W1",
  "cardId": "0123456789",
  "accessGranted": true,
  "reason": "Authorized access",
  "timestamp": "2025-04-18T09:30:45Z"
}`}
              </code>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Integration Workflow</h3>
            <p className="text-muted-foreground mb-4">
              ShopTracker and ShopMonitor communicate through standardized API endpoints. The synchronization process follows these steps:
            </p>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Data Synchronization (ShopTracker to ShopMonitor)</h4>
                <div className="space-y-3 ml-2">
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Step 1:</span> Push user data by calling <code className="bg-muted px-1 py-0.5 rounded text-sm">{`{api_base_url}/api/sync/users`}</code>
                      <div className="text-sm text-muted-foreground">
                        This endpoint sends user information including RFID tags and access levels
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Step 2:</span> Push location/zone data by calling <code className="bg-muted px-1 py-0.5 rounded text-sm">{`{api_base_url}/api/sync/locations`}</code>
                      <div className="text-sm text-muted-foreground">
                        This endpoint sends information about manufacturing zones/locations
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Step 3:</span> Push machine configuration by calling <code className="bg-muted px-1 py-0.5 rounded text-sm">{`{api_base_url}/api/sync/machines`}</code>
                      <div className="text-sm text-muted-foreground">
                        This endpoint sends information about machine IDs, names, and zone assignments
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Data Retrieval (ShopMonitor to ShopTracker)</h4>
                <div className="space-y-3 ml-2">
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Step 4:</span> Pull access logs by calling <code className="bg-muted px-1 py-0.5 rounded text-sm">{`{api_base_url}/api/sync/accesslogs?since={timestamp}`}</code>
                      <div className="text-sm text-muted-foreground">
                        This endpoint retrieves machine usage information including who accessed which machines and when
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Step 5:</span> Pull pending alerts by calling <code className="bg-muted px-1 py-0.5 rounded text-sm">{`{api_base_url}/api/sync/alerts?status=pending&since={timestamp}`}</code>
                      <div className="text-sm text-muted-foreground">
                        This endpoint retrieves any active alerts generated by ShopMonitor
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Real-time Communication</h4>
                <div className="space-y-3 ml-2">
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Authentication:</span> ShopTracker calls <code className="bg-muted px-1 py-0.5 rounded text-sm">/integration/api/auth</code> on ShopMonitor
                      <div className="text-sm text-muted-foreground">
                        This verifies RFID card access for specific machines
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Node Status:</span> ShopTracker calls <code className="bg-muted px-1 py-0.5 rounded text-sm">/integration/api/node_status</code> on ShopMonitor
                      <div className="text-sm text-muted-foreground">
                        This retrieves real-time status information about all nodes and their connected machines
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <span className="font-medium">Alerts:</span> Bidirectional alert communication
                      <div className="text-sm text-muted-foreground">
                        Both systems can send, acknowledge, and resolve alerts through their respective API endpoints
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Error Handling</h3>
            <p className="text-muted-foreground mb-2">
              The API uses standard HTTP status codes to indicate the success or failure of requests.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-muted p-3 rounded-md">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mb-2">200 OK</Badge>
                <p className="text-sm">The request was successful</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 mb-2">400 Bad Request</Badge>
                <p className="text-sm">The request was invalid or missing required parameters</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 mb-2">401 Unauthorized</Badge>
                <p className="text-sm">Missing or invalid API key</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 mb-2">500 Server Error</Badge>
                <p className="text-sm">An error occurred on the server</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Configuration</h1>
      </div>
      <Alert className="mb-6">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>
          API configuration, Sync Status, and Database diagnostics now live under Settings → API and Settings → Database. You can still review docs here.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="configuration">
        <TabsList className="mb-6">
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="sync-status">
            <Activity className="h-4 w-4 mr-2" />
            Sync Status
          </TabsTrigger>
          <TabsTrigger value="db">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="api-docs">
            <Code className="h-4 w-4 mr-2" />
            API Documentation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration">
          {renderConfigurationTab()}
        </TabsContent>
        
        <TabsContent value="sync-status">
          {renderSyncStatus()}
        </TabsContent>
        
        <TabsContent value="db">
          {renderDatabaseTab()}
        </TabsContent>
        
        <TabsContent value="api-docs">
          {renderApiDocumentation()}
        </TabsContent>
      </Tabs>
    </div>
  );
}