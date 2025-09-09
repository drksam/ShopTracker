import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Bell, 
  Mail, 
  Shield, 
  Database,
  Code,
  Activity,
  RefreshCcw,
  Palette,
  Clock,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm as useHookForm } from "react-hook-form";
import { zodResolver as zodApiResolver } from "@hookform/resolvers/zod";
import { SyncStatus } from "@/components/api/sync-status";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";

const systemSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogoUrl: z.string().optional().default(""),
  timeZone: z.string().min(1, "Time zone is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  autoRefreshInterval: z.number().min(5, "Must be at least 5 seconds"),
});

const notificationSettingsSchema = z.object({
  enableEmailNotifications: z.boolean(),
  enablePushNotifications: z.boolean(),
  orderCompletedNotifications: z.boolean(),
  helpRequestNotifications: z.boolean(),
  lowStockNotifications: z.boolean(),
});

const securitySettingsSchema = z.object({
  requireTwoFactor: z.boolean(),
  sessionTimeout: z.number().min(5, "Must be at least 5 minutes"),
  passwordMinLength: z.number().min(6, "Must be at least 6 characters"),
  requirePasswordComplexity: z.boolean(),
});

type SystemSettingsValues = z.infer<typeof systemSettingsSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;
type SecuritySettingsValues = z.infer<typeof securitySettingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  
  // API Config form schema and setup (moved from API Config page)
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
  type ApiConfigValues = z.infer<typeof apiConfigSchema>;

  // Fetch current settings
  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const settings = settingsResponse || {};

  // Keep forms in sync when settings load
  useEffect(() => {
    if (!settingsResponse) return;
    systemForm.reset({
      companyName: settingsResponse.companyName || "ShopTracker Manufacturing",
  companyLogoUrl: settingsResponse.companyLogoUrl || "",
      timeZone: settingsResponse.timeZone || "America/New_York",
      dateFormat: settingsResponse.dateFormat || "MM/dd/yyyy",
      autoRefreshInterval: settingsResponse.autoRefreshInterval || 30,
    });
    notificationForm.reset({
      enableEmailNotifications: !!settingsResponse.enableEmailNotifications,
      enablePushNotifications: !!settingsResponse.enablePushNotifications,
      orderCompletedNotifications: settingsResponse.orderCompletedNotifications ?? true,
      helpRequestNotifications: settingsResponse.helpRequestNotifications ?? true,
      lowStockNotifications: !!settingsResponse.lowStockNotifications,
    });
    securityForm.reset({
      requireTwoFactor: !!settingsResponse.requireTwoFactor,
      sessionTimeout: settingsResponse.sessionTimeout || 60,
      passwordMinLength: settingsResponse.passwordMinLength || 8,
      requirePasswordComplexity: settingsResponse.requirePasswordComplexity ?? true,
    });
  }, [settingsResponse]);

  // DB Diagnostics (for Database tab)
  const { data: dbInfo } = useQuery({
    queryKey: ["/api/db-info"],
    queryFn: async () => {
      const res = await fetch("/api/db-info");
      if (!res.ok) throw new Error("Failed to fetch DB info");
      return res.json();
    },
  });

  // Load API config
  const { data: apiConfig } = useQuery<ApiConfigValues>({
    queryKey: ["/api/api-config"],
  });

  const apiForm = useHookForm<ApiConfigValues>({
    resolver: zodApiResolver(apiConfigSchema),
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

  useEffect(() => {
    if (apiConfig) apiForm.reset(apiConfig);
  }, [apiConfig]);

  const updateApiConfigMutation = useMutation({
    mutationFn: async (data: ApiConfigValues) => {
      const response = await apiRequest("POST", "/api/api-config", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-config"] });
      toast({ title: "API settings saved", description: "Configuration updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testApiConnection = async () => {
    try {
      const response = await apiRequest("POST", "/api/api-config/test", apiForm.getValues());
      const result = await response.json();
      toast({ title: result.success ? "Connection OK" : "Connection failed", description: result.message, variant: result.success ? "default" : "destructive" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    }
  };

  // System settings form
  const systemForm = useForm<SystemSettingsValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      companyName: settings.companyName || "ShopTracker Manufacturing",
  companyLogoUrl: settings.companyLogoUrl || "",
      timeZone: settings.timeZone || "America/New_York",
      dateFormat: settings.dateFormat || "MM/dd/yyyy",
      autoRefreshInterval: settings.autoRefreshInterval || 30,
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enableEmailNotifications: settings.enableEmailNotifications || false,
      enablePushNotifications: settings.enablePushNotifications || false,
      orderCompletedNotifications: settings.orderCompletedNotifications || true,
      helpRequestNotifications: settings.helpRequestNotifications || true,
      lowStockNotifications: settings.lowStockNotifications || false,
    },
  });

  // Security settings form
  const securityForm = useForm<SecuritySettingsValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      requireTwoFactor: settings.requireTwoFactor || false,
      sessionTimeout: settings.sessionTimeout || 60,
      passwordMinLength: settings.passwordMinLength || 8,
      requirePasswordComplexity: settings.requirePasswordComplexity || true,
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSystemSubmit = (data: SystemSettingsValues) => {
    updateSettingsMutation.mutate({ type: "system", ...data });
  };

  const onNotificationSubmit = (data: NotificationSettingsValues) => {
    updateSettingsMutation.mutate({ type: "notifications", ...data });
  };

  const onSecuritySubmit = (data: SecuritySettingsValues) => {
    updateSettingsMutation.mutate({ type: "security", ...data });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure general system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...systemForm}>
                <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-6">
                  {/* Logo upload and preview */}
                  <FormField
                    control={systemForm.control}
                    name="companyLogoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Logo</FormLabel>
                        <div className="flex items-center gap-4">
                          {field.value ? (
                            <img src={field.value} alt="Company Logo" className="h-10 w-auto border rounded bg-white" />
                          ) : (
                            <div className="h-10 w-10 border rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">No Logo</div>
                          )}
                          <Input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            // Quick client-side size check (3MB)
                            if (file.size > 3 * 1024 * 1024) {
                              toast({ title: 'File too large', description: 'Max size is 3MB', variant: 'destructive' });
                              return;
                            }
                            // Convert to data URI
                            const reader = new FileReader();
                            reader.onload = async () => {
                              try {
                                const dataUri = reader.result as string;
                                const resp = await fetch('/api/upload/logo-base64?save=1', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ dataUri, filename: file.name })
                                });
                                const text = await resp.text();
                                if (!resp.ok) {
                                  throw new Error(text || 'Upload failed');
                                }
                                const ct = resp.headers.get('content-type') || '';
                                let url = '';
                                if (ct.includes('application/json')) {
                                  const result = JSON.parse(text);
                                  url = result?.url || '';
                                } else {
                                  // Fallback: if server returns plain text URL, accept it
                                  try {
                                    const maybe = JSON.parse(text);
                                    url = maybe?.url || '';
                                  } catch {
                                    // Accept non-JSON only if it looks like a URL
                                    url = /^\/?uploads\//.test(text) || /^https?:\/\//.test(text) ? text.trim() : '';
                                  }
                                }
                                if (!url) {
                                  console.error('Upload response body:', text?.slice(0, 200));
                                  throw new Error('Unexpected response from server');
                                }
                                field.onChange(url);
                                // Also persist via settings for consistency
                                updateSettingsMutation.mutate({ type: 'system', companyLogoUrl: url });
                              } catch (err) {
                                console.error(err);
                                const message = err instanceof Error ? err.message : 'Upload failed';
                                toast({ title: 'Logo upload failed', description: message, variant: 'destructive' });
                              }
                            };
                            reader.readAsDataURL(file);
                          }} />
                        </div>
                        <FormDescription>
                          Upload a small PNG/JPG/WebP (max 2MB). This appears next to the app title.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={systemForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will appear in headers and reports
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Zone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time zone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern (EST/EDT)</SelectItem>
                            <SelectItem value="America/Chicago">Central (CST/CDT)</SelectItem>
                            <SelectItem value="America/Denver">Mountain (MST/MDT)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific (PST/PDT)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={systemForm.control}
                    name="dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                            <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={systemForm.control}
                    name="autoRefreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auto Refresh Interval (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormDescription>
                          How often the dashboard should refresh automatically
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save System Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>
                Configure notification preferences and delivery methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive notifications via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="enablePushNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Push Notifications</FormLabel>
                          <FormDescription>
                            Receive browser push notifications
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="orderCompletedNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Order Completed</FormLabel>
                          <FormDescription>
                            Notify when orders are completed
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="helpRequestNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Help Requests</FormLabel>
                          <FormDescription>
                            Notify when help is requested
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notification Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <FormField
                    control={securityForm.control}
                    name="requireTwoFactor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Two-Factor Authentication</FormLabel>
                          <FormDescription>
                            Require 2FA for all users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="sessionTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          />
                        </FormControl>
                        <FormDescription>
                          Automatically log out users after this period of inactivity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="passwordMinLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Password Length</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum number of characters required for passwords
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="requirePasswordComplexity"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Password Complexity</FormLabel>
                          <FormDescription>
                            Require uppercase, lowercase, numbers, and symbols
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Security Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Management</span>
              </CardTitle>
              <CardDescription>
                Database diagnostics and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* DB Diagnostics */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Connection</h3>
                {dbInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Host</span>
                      <div>{dbInfo.connection?.host || "-"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Database</span>
                      <div>{dbInfo.connection?.database || "-"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">User</span>
                      <div>{dbInfo.connection?.user || "-"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Search Path</span>
                      <div>{dbInfo.searchPath?.join?.(", ") || dbInfo.searchPath || "-"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Loading DB diagnostics…</div>
                )}
              </div>

              {/* Maintenance (placeholders) */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Database Backup</h3>
                    <p className="text-sm text-gray-500">Create a backup of your database</p>
                  </div>
                  <Button variant="outline">
                    Create Backup
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Optimize Database</h3>
                    <p className="text-sm text-gray-500">Optimize database performance</p>
                  </div>
                  <Button variant="outline">
                    Optimize
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Tabs defaultValue="api-config" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="api-config">Configuration</TabsTrigger>
              <TabsTrigger value="api-sync">Sync Status</TabsTrigger>
              <TabsTrigger value="api-docs">API Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="api-config">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>API Configuration</span>
                  </CardTitle>
                  <CardDescription>Configure ShopMonitor API integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...apiForm}>
                    <form onSubmit={apiForm.handleSubmit((data) => updateApiConfigMutation.mutate(data))} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField control={apiForm.control} name="shopMonitorApiKey" render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Enter API key" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={apiForm.control} name="shopMonitorApiUrl" render={({ field }) => (
                          <FormItem>
                            <FormLabel>API URL</FormLabel>
                            <FormControl><Input placeholder="https://api.shopmonitor.app" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField control={apiForm.control} name="syncEnabled" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Enable Sync</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={apiForm.control} name="syncInterval" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sync Interval (minutes)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 5)} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField control={apiForm.control} name="alertsEnabled" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Enable Alerts</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={apiForm.control} name="pullAccessLogs" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Pull Access Logs</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid gap-6 md:grid-cols-3">
                        <FormField control={apiForm.control} name="pushUserData" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Push User Data</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={apiForm.control} name="pushLocationData" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Push Location Data</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={apiForm.control} name="pushMachineData" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel className="text-base">Push Machine Data</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={testApiConnection}>Test Connection</Button>
                        <Button type="submit" disabled={updateApiConfigMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" /> Save API Settings
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-sync">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Synchronization Status</span>
                  </CardTitle>
                  <CardDescription>Monitor synchronization between ShopTracker and ShopMonitor</CardDescription>
                </CardHeader>
                <CardContent>
                  <SyncStatus />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-docs">
              <Card>
                <CardHeader>
                  <CardTitle>API Documentation</CardTitle>
                  <CardDescription>Details about the ShopMonitor integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Overview</h3>
                    <p className="text-muted-foreground mb-4">
                      ShopTracker integrates with ShopMonitor to enable bidirectional communication for machine alerts, access control, and data synchronization.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-2">Authentication</h3>
                    <p className="text-muted-foreground mb-4">
                      Include your API key in the X-API-Key header when calling ShopMonitor.
                    </p>
                    <div className="bg-muted p-4 rounded-md">
                      <code className="block whitespace-pre text-sm">{`// Example
fetch('https://api.shopmonitor.app/api/sync/status', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': 'your-api-key' }
})`}</code>
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
                                <TableCell>Authenticate RFID access for a machine</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono text-sm">/integration/api/node_status</TableCell>
                                <TableCell>GET</TableCell>
                                <TableCell>Get status for nodes and connected machines</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono text-sm">/integration/api/alerts</TableCell>
                                <TableCell>POST</TableCell>
                                <TableCell>Send alerts from ShopTracker to ShopMonitor</TableCell>
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
                                <TableCell>Push user data</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/locations`}</TableCell>
                                <TableCell>POST</TableCell>
                                <TableCell>Push location data</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono text-sm">{`{api_base_url}/api/sync/machines`}</TableCell>
                                <TableCell>POST</TableCell>
                                <TableCell>Push machine configuration</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-2">Real-time Communication</h3>
                    <div className="space-y-3 ml-2">
                      <div className="flex items-start gap-2">
                        <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <span className="font-medium">Authentication:</span> ShopTracker calls /integration/api/auth on ShopMonitor
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <span className="font-medium">Node Status:</span> ShopTracker calls /integration/api/node_status on ShopMonitor
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-2">Error Handling</h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-muted p-3 rounded-md">
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mb-2">200 OK</Badge>
                        <p className="text-sm">The request was successful</p>
                      </div>
                      <div className="bg-muted p-3 rounded-md">
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 mb-2">400 Bad Request</Badge>
                        <p className="text-sm">Invalid request or missing parameters</p>
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
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
