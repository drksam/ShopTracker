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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Info,
  UserCircle,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MachineAlertsProps {
  machineId?: string;
  showHeader?: boolean;
  showCreateButton?: boolean;
  maxAlerts?: number;
}

interface MachineAlert {
  id: number;
  machineId: string;
  senderId: number | null;
  message: string;
  alertType: "help_request" | "notification" | "warning" | "error";
  status: "pending" | "acknowledged" | "resolved";
  origin: "machine" | "system";
  resolvedById: number | null;
  resolvedAt: Date | null;
  createdAt: Date;
  sender?: {
    id: number;
    username: string;
    fullName: string;
  };
}

export function MachineAlerts({ 
  machineId, 
  showHeader = true, 
  showCreateButton = true,
  maxAlerts
}: MachineAlertsProps) {
  const { toast } = useToast();
  const [newAlertOpen, setNewAlertOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    machineId: "",
    message: "",
    alertType: "notification" as const,
  });
  
  // Fetch machines for dropdown
  const { data: machines = [] } = useQuery({
    queryKey: ["/api/machines"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/machines");
      return await res.json();
    },
  });
  
  // Fetch alerts
  const alertsEndpoint = machineId 
    ? `/api/alerts/machine/${machineId}`
    : "/api/alerts";
    
  const { data: alerts = [], isLoading } = useQuery<MachineAlert[]>({
    queryKey: [alertsEndpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", alertsEndpoint);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return await res.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  const displayAlerts = maxAlerts ? alerts.slice(0, maxAlerts) : alerts;
  
  // Filter alerts by status
  const pendingAlerts = displayAlerts.filter(alert => alert.status === "pending");
  const acknowledgedAlerts = displayAlerts.filter(alert => alert.status === "acknowledged");
  const resolvedAlerts = displayAlerts.filter(alert => alert.status === "resolved");
  
  // Create new alert
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof newAlert) => {
      const res = await apiRequest("POST", "/api/alerts", alertData);
      if (!res.ok) throw new Error("Failed to create alert");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [alertsEndpoint] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/pending/count"] });
      toast({
        title: "Alert sent",
        description: "Your alert has been sent to the machine.",
      });
      setNewAlertOpen(false);
      setNewAlert({
        machineId: "",
        message: "",
        alertType: "notification",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Acknowledge alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`);
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [alertsEndpoint] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/pending/count"] });
      toast({
        title: "Alert acknowledged",
        description: "The alert has been acknowledged.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to acknowledge alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Resolve alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest("POST", `/api/alerts/${alertId}/resolve`);
      if (!res.ok) throw new Error("Failed to resolve alert");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [alertsEndpoint] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/pending/count"] });
      toast({
        title: "Alert resolved",
        description: "The alert has been marked as resolved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "help_request":
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case "notification":
        return <Bell className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case "acknowledged":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Acknowledged</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Resolved</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };
  
  const handleCreateAlert = () => {
    if (!newAlert.machineId) {
      toast({
        title: "Machine required",
        description: "Please select a machine to send the alert to.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newAlert.message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message for the alert.",
        variant: "destructive",
      });
      return;
    }
    
    createAlertMutation.mutate(newAlert);
  };
  
  // Render alert card
  const renderAlertCard = (alert: MachineAlert) => (
    <Card key={alert.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {getAlertTypeIcon(alert.alertType)}
            <CardTitle className="ml-2 text-base">
              {alert.origin === "machine" ? "Machine Alert" : "System Alert"}
            </CardTitle>
          </div>
          {getStatusBadge(alert.status)}
        </div>
        <CardDescription className="flex items-center mt-1">
          <span className="font-semibold text-sm mr-2">
            Machine: {alert.machineId}
          </span>
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">{formatDate(alert.createdAt)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 pt-0">
        <p className="text-sm">{alert.message}</p>
        
        {alert.sender && (
          <div className="flex items-center mt-2 text-xs text-muted-foreground">
            <UserCircle className="h-3.5 w-3.5 mr-1" />
            <span>Sent by: {alert.sender.fullName}</span>
          </div>
        )}
        
        {alert.resolvedById && alert.resolvedAt && (
          <div className="flex items-center mt-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            <span>Resolved at: {formatDate(alert.resolvedAt)}</span>
          </div>
        )}
      </CardContent>
      
      {alert.status !== "resolved" && (
        <CardFooter className="pt-0">
          <div className="flex space-x-2 mt-2 w-full justify-end">
            {alert.status === "pending" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                disabled={acknowledgeAlertMutation.isPending}
              >
                Acknowledge
              </Button>
            )}
            
            <Button 
              variant="default" 
              size="sm"
              onClick={() => resolveAlertMutation.mutate(alert.id)}
              disabled={resolveAlertMutation.isPending}
            >
              Resolve
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
  
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2">Loading alerts...</p>
      </div>
    );
  }
  
  return (
    <div>
      {showHeader && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Machine Alerts</h2>
          
          {showCreateButton && (
            <Dialog open={newAlertOpen} onOpenChange={setNewAlertOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Alert to Machine</DialogTitle>
                  <DialogDescription>
                    Create a new alert to send to a machine or operator.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="machine">Machine</Label>
                    <Select
                      value={newAlert.machineId}
                      onValueChange={(value) => setNewAlert({...newAlert, machineId: value})}
                    >
                      <SelectTrigger id="machine">
                        <SelectValue placeholder="Select a machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.map((machine: any) => (
                          <SelectItem key={machine.machineId} value={machine.machineId}>
                            {machine.name} ({machine.machineId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="alertType">Alert Type</Label>
                    <Select
                      value={newAlert.alertType}
                      onValueChange={(value: any) => setNewAlert({...newAlert, alertType: value})}
                    >
                      <SelectTrigger id="alertType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your message here"
                      value={newAlert.message}
                      onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                      rows={4}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setNewAlertOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAlert}
                    disabled={createAlertMutation.isPending}
                  >
                    {createAlertMutation.isPending ? "Sending..." : "Send Alert"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      
      {machineId ? (
        <div className="space-y-4">
          {displayAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-center text-muted-foreground">No alerts for this machine</p>
              </CardContent>
            </Card>
          ) : (
            displayAlerts.map(renderAlertCard)
          )}
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending
              {pendingAlerts.length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {pendingAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="acknowledged">
              Acknowledged
              {acknowledgedAlerts.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                  {acknowledgedAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            {pendingAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-center text-muted-foreground">No pending alerts</p>
                </CardContent>
              </Card>
            ) : (
              pendingAlerts.map(renderAlertCard)
            )}
          </TabsContent>
          
          <TabsContent value="acknowledged" className="mt-4">
            {acknowledgedAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-center text-muted-foreground">No acknowledged alerts</p>
                </CardContent>
              </Card>
            ) : (
              acknowledgedAlerts.map(renderAlertCard)
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="mt-4">
            {resolvedAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-center text-muted-foreground">No resolved alerts</p>
                </CardContent>
              </Card>
            ) : (
              resolvedAlerts.map(renderAlertCard)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}