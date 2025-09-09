import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Machine, Order, OrderLocation, type MachineAssignment } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pin, Clock, AlertTriangle, RefreshCw, UserCog } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface MachinePageProps {
  machineId: string | number;
}

type OrderWithLocationDetails = OrderLocation & { order: Order };

export default function MachinePage({ machineId }: MachinePageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("current");

  // Fetch machine details
  const { data: machine, isLoading: isLoadingMachine } = useQuery<Machine, Error>({
    queryKey: ["/api/machines", machineId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/machines/${machineId}`);
        if (!res.ok) {
          console.error(`Failed to fetch machine details for ID: ${machineId}`, res.status);
          return null;
        }
        return res.json();
      } catch (error) {
        console.error(`Error fetching machine with ID: ${machineId}`, error);
        return null;
      }
    },
  });

  // Fetch location details for this machine
  const { data: location, isLoading: isLoadingLocation } = useQuery<any, Error>({
    queryKey: ["/api/locations", machine?.locationId],
    queryFn: async () => {
      if (!machine?.locationId) return null;
      try {
        const res = await fetch(`/api/locations/${machine.locationId}`);
        if (!res.ok) {
          console.error(`Failed to fetch location details for locationId: ${machine.locationId}`, res.status);
          return null;
        }
        return res.json();
      } catch (error) {
        console.error(`Error fetching location with ID: ${machine.locationId}`, error);
        return null;
      }
    },
    enabled: !!machine?.locationId,
  });

  // Fetch orders for the location this machine is at
  const { data: orderLocations, isLoading: isLoadingOrders, refetch } = useQuery<OrderWithLocationDetails[], Error>({
    queryKey: ["/api/order-locations/location", machine?.locationId],
    queryFn: async () => {
      if (!machine?.locationId) return [];
      const res = await fetch(`/api/order-locations/location/${machine.locationId}`);
      if (!res.ok) throw new Error("Failed to fetch orders for this location");
      return res.json();
    },
    enabled: !!machine?.locationId,
  });
  // Fetch assignments for this machine
  const { data: assignments, refetch: refetchAssignments } = useQuery<(MachineAssignment & { order: Order; location: any; })[], Error>({
    queryKey: ["/api/assignments/machine", machineId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/machine/${machineId}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    }
  });

  // Check if user has permission for this machine
  const { data: userPermissions, isLoading: isLoadingPermissions } = useQuery<any[], Error>({
    queryKey: ["/api/machine-permissions/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/machine-permissions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user permissions");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refetch]);

  // Location action mutations (same as in LocationPage)
  const startOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number, locationId: number }) => {
      await apiRequest("POST", `/api/order-locations/${data.orderId}/${data.locationId}/start`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Order Started",
        description: "The order has been started at this location",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to start order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const finishOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number, locationId: number, completedQuantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${data.orderId}/${data.locationId}/finish`, {
        completedQuantity: data.completedQuantity,
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Order Completed",
        description: "The order has been marked as completed at this location",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to complete order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const pauseOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number, locationId: number }) => {
      await apiRequest("POST", `/api/order-locations/${data.orderId}/${data.locationId}/pause`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Order Paused",
        description: "The order has been paused at this location",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to pause order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async (data: { orderId: number, locationId: number, completedQuantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${data.orderId}/${data.locationId}/update-quantity`, {
        completedQuantity: data.completedQuantity,
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Quantity Updated",
        description: "The completed quantity has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update quantity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const helpRequestMutation = useMutation({
    mutationFn: async (data: { orderId: number, locationId: number, notes?: string }) => {
      await apiRequest("POST", `/api/help-requests`, {
        orderId: data.orderId,
        locationId: data.locationId,
        notes: data.notes,
      });
    },
    onSuccess: () => {
  // Ensure notification bell updates
  queryClient.invalidateQueries({ queryKey: ["/api/help-requests/active"] });
      toast({
        title: "Help Requested",
        description: "Your help request has been submitted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to request help: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter orders by status
  const getCurrentOrders = () => {
    if (!orderLocations) return [];
    return orderLocations.filter(ol => 
      ol.status === "in_progress" || ol.status === "paused"
    );
  };

  const getCompletedOrders = () => {
    if (!orderLocations) return [];
    return orderLocations.filter(ol => ol.status === "done");
  };

  // Check if user has permission for this machine
  const hasPermission = () => {
    if (user?.role === "admin") return true;
    if (!userPermissions) return false;
    return userPermissions.some(p => p.machineId === machineId);
  };

  // Handlers for order actions
  const handleStartOrder = (orderId: number, locationId: number) => {
    startOrderMutation.mutate({ orderId, locationId });
  };

  const handleFinishOrder = (orderId: number, locationId: number, totalQuantity: number) => {
    // totalQuantity provided should already be multiplier-adjusted by caller
    finishOrderMutation.mutate({ 
      orderId, 
      locationId,
      completedQuantity: totalQuantity 
    });
  };

  const handlePauseOrder = (orderId: number, locationId: number) => {
    pauseOrderMutation.mutate({ orderId, locationId });
  };

  const handleResumeOrder = (orderId: number, locationId: number) => {
    startOrderMutation.mutate({ orderId, locationId });
  };
  const [startSelection, setStartSelection] = useState<{ orderId: number; locationId: number } | null>(null);

  const handleUpdateCount = (orderId: number, locationId: number, count: number) => {
    updateQuantityMutation.mutate({ orderId, locationId, completedQuantity: count });
  };

  const handleRequestHelp = (orderId: number, locationId: number) => {
    helpRequestMutation.mutate({ orderId, locationId });
  };

  // --- Machine Alert popups ---
  type MachineAlert = {
    id: number;
    machineId: string;
    message: string;
    alertType: "help_request" | "notification" | "warning" | "error";
    status: "pending" | "acknowledged" | "resolved";
    createdAt: string | Date;
  };

  const { data: machineAlerts = [] } = useQuery<MachineAlert[]>({
    queryKey: ["/api/alerts/machine", machine?.machineId],
    enabled: !!machine?.machineId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/alerts/machine/${machine!.machineId}`);
      if (!res.ok) throw new Error("Failed to fetch machine alerts");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const [alertQueue, setAlertQueue] = useState<MachineAlert[]>([]);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [activeAlert, setActiveAlert] = useState<MachineAlert | null>(null);

  // Track seen alerts per machine in-memory to avoid repeat popups for same session
  const [seenAlerts, setSeenAlerts] = useState<Set<number>>(new Set());

  useEffect(() => {
    // On load and every poll, enqueue any pending alerts not seen or resolved
    const pending = (machineAlerts || []).filter(a => a.status === "pending");
    const newOnes = pending.filter(a => !seenAlerts.has(a.id));
    if (newOnes.length > 0) {
      setAlertQueue(prev => [...prev, ...newOnes]);
      // Mark as seen to avoid re-opening immediately on next tick
      setSeenAlerts(prev => new Set([...Array.from(prev), ...newOnes.map(a => a.id)]));
    }
  }, [machineAlerts, seenAlerts]);

  useEffect(() => {
    if (!activeAlert && alertQueue.length > 0) {
      setActiveAlert(alertQueue[0]);
      setAlertQueue(prev => prev.slice(1));
      setShowAlertDialog(true);
    }
  }, [alertQueue, activeAlert]);

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`);
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Alert acknowledged" });
    }
  });

  // Render loading state
  if (isLoadingMachine || isLoadingLocation) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>
        
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Orders</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="current">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full mb-4" />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Handle case where machine is not found
  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold mb-2">Machine Not Found</h2>
        <p className="text-gray-500 mb-4">The requested machine could not be found.</p>
        <Button onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  // Handle case where user doesn't have permission
  if (!hasPermission()) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-4 text-center">
          You don't have permission to access this machine.
          <br />
          Please contact an administrator for access.
        </p>
        <Button onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{machine.name}</h1>
        </div>
        
        <div className="flex items-center">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mr-2"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {user && ["admin","manager"].includes(user.role) && (
            <Button 
              onClick={() => setShowPermissionsDialog(true)}
              size="sm"
            >
              <UserCog className="h-4 w-4 mr-1" /> Permissions
            </Button>
          )}
        </div>
      </div>
      
      {/* Machine Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="text-lg">Machine Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Machine ID</p>
                <p className="font-medium">{machine.machineId}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium flex items-center">
                  <Pin className="h-4 w-4 mr-1 text-blue-500" />
                  {location ? location.name : "Not assigned"}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center">
                  {getCurrentOrders().length > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Idle
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Current Order Progress */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {getCurrentOrders().length > 0 ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-2">
                    <CircularProgressbar
                      value={(() => {
                        const ol = getCurrentOrders()[0];
                        const total = Math.ceil((ol.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                        const denom = total > 0 ? total : 1;
                        return Math.min(100, (ol.completedQuantity / denom) * 100);
                      })()}
                      text={(() => {
                        const ol = getCurrentOrders()[0];
                        const total = Math.ceil((ol.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                        return `${ol.completedQuantity}/${total}`;
                      })()}
                      styles={buildStyles({
                        textSize: '16px',
                        pathColor: '#3b82f6',
                        textColor: '#1f2937',
                        trailColor: '#e5e7eb'
                      })}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Current Order</p>
                  <p className="font-medium">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => navigate(`/orders/${getCurrentOrders()[0].order.id}`)}
                    >
                      {getCurrentOrders()[0].order.orderNumber}
                    </button>
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-2 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                    <Clock className="h-12 w-12 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">No Active Orders</p>
                  <p className="text-xs text-gray-400">Ready for next job</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">
            Current Orders {getCurrentOrders().length > 0 && `(${getCurrentOrders().length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {getCompletedOrders().length > 0 && `(${getCompletedOrders().length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {getCurrentOrders().length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-neutral-500 py-8">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-12 w-12 mb-2 text-gray-400"
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"></path>
                    <path d="M12 8v4"></path>
                    <path d="M12 16h.01"></path>
                  </svg>
                  <h3 className="text-lg font-medium mb-1">No Current Orders</h3>
                  <p className="text-sm text-center mb-4">
                    No orders in progress or paused at this location
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Start from assignment */}
              {assignments && assignments.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Select value={startSelection ? `${startSelection.orderId}|${startSelection.locationId}` : ""} onValueChange={(v) => {
                        const [oid, lid] = v.split('|').map(n => parseInt(n));
                        setStartSelection({ orderId: oid, locationId: lid });
                      }}>
                        <SelectTrigger className="w-80"><SelectValue placeholder="Select assigned order to start" /></SelectTrigger>
                        <SelectContent>
                          {[...assignments]
                            .sort((a, b) => {
                              if (a.order.rush && !b.order.rush) return -1;
                              if (!a.order.rush && b.order.rush) return 1;
                              if (a.order.rush && b.order.rush) {
                                const ar = a.order.rushSetAt ? new Date(a.order.rushSetAt as any).getTime() : 0;
                                const br = b.order.rushSetAt ? new Date(b.order.rushSetAt as any).getTime() : 0;
                                if (ar !== br) return ar - br;
                              }
                              return (a.order.globalQueuePosition || 0) - (b.order.globalQueuePosition || 0);
                            })
                            .map(a => (
                              <SelectItem key={`${a.orderId}-${a.locationId}`} value={`${a.orderId}|${a.locationId}`}>
                                #{a.order.orderNumber} — {a.location?.name || `Loc ${a.locationId}`} {a.order.rush && '• RUSH'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button disabled={!startSelection || startOrderMutation.isPending} onClick={() => startSelection && handleStartOrder(startSelection.orderId, startSelection.locationId)}>
                        Start Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {getCurrentOrders().map((orderLocation) => (
                <Card key={orderLocation.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-lg">
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => navigate(`/orders/${orderLocation.order.id}`)}
                            >
                              {orderLocation.order.orderNumber}
                            </button>
                          </h3>
                          <p className="text-sm text-gray-500">{orderLocation.order.client}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            orderLocation.status === "in_progress" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {orderLocation.status === "in_progress" ? "In Progress" : "Paused"}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            Due: {new Date(orderLocation.order.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Progress</span>
                          {location?.noCount ? null : (
                            <span className="text-sm font-medium">
                              {orderLocation.completedQuantity}/{Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${(() => {
                              const total = Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                              const denom = total > 0 ? total : 1;
                              return Math.min(100, (orderLocation.completedQuantity / denom) * 100);
                            })()}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {orderLocation.status === "in_progress" ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePauseOrder(orderLocation.order.id, orderLocation.locationId)}
                              disabled={pauseOrderMutation.isPending}
                            >
                              Pause
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                const total = Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                                handleFinishOrder(orderLocation.order.id, orderLocation.locationId, total);
                              }}
                              disabled={finishOrderMutation.isPending}
                            >
                              Complete
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleResumeOrder(orderLocation.order.id, orderLocation.locationId)}
                            disabled={startOrderMutation.isPending}
                          >
                            Resume
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-auto"
                          onClick={() => handleRequestHelp(orderLocation.order.id, orderLocation.locationId)}
                          disabled={helpRequestMutation.isPending}
                        >
                          Request Help
                        </Button>
                      </div>
                    </div>
                    
                    {/* Order details area */}
                    <div className="border-t p-4 bg-gray-50">
                      <h4 className="text-sm font-medium mb-2">Order Details</h4>
                      
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">TBFOS #:</span> {orderLocation.order.tbfosNumber}
                        </div>
                        {!location?.noCount && (
                          <div>
                            <span className="text-gray-500">Quantity:</span> {Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                            {location?.countMultiplier && location.countMultiplier !== 1 ? (
                              <span className="text-[10px] text-muted-foreground ml-1">({orderLocation.order.totalQuantity} x {location.countMultiplier})</span>
                            ) : null}
                          </div>
                        )}
                        {orderLocation.order.description && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Description:</span> {orderLocation.order.description}
                          </div>
                        )}
                        {orderLocation.order.notes && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Notes:</span> {orderLocation.order.notes}
                          </div>
                        )}
                      </div>
                      
                      {/* Update quantity controls */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Update Completed Quantity</h4>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const newCount = Math.max(0, orderLocation.completedQuantity - 1);
                              handleUpdateCount(orderLocation.order.id, orderLocation.locationId, newCount);
                            }}
                            disabled={updateQuantityMutation.isPending || orderLocation.completedQuantity <= 0}
                          >
                            -
                          </Button>
                          <span className="font-medium">{orderLocation.completedQuantity}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const maxTotal = Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                              const newCount = Math.min(maxTotal, orderLocation.completedQuantity + 1);
                              handleUpdateCount(orderLocation.order.id, orderLocation.locationId, newCount);
                            }}
                            disabled={(() => {
                              const maxTotal = Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1));
                              return updateQuantityMutation.isPending || orderLocation.completedQuantity >= maxTotal;
                            })()}
                          >
                            +
                          </Button>
                          
                          <div className="ml-auto">
                            <Button 
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateCount(orderLocation.order.id, orderLocation.locationId, orderLocation.completedQuantity)}
                              disabled={updateQuantityMutation.isPending}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {getCompletedOrders().length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-neutral-500 py-8">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-12 w-12 mb-2 text-gray-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <h3 className="text-lg font-medium mb-1">No Completed Orders</h3>
                  <p className="text-sm text-center">
                    No completed orders at this location yet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getCompletedOrders().map((orderLocation) => (
                <Card key={orderLocation.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-medium">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => navigate(`/orders/${orderLocation.order.id}`)}
                          >
                            {orderLocation.order.orderNumber}
                          </button>
                        </h3>
                        <p className="text-sm text-gray-500">{orderLocation.order.client}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(orderLocation.completedAt || "").toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {!location?.noCount && (
                      <div className="text-sm mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Quantity:</span>
                          <span>
                            {orderLocation.completedQuantity}/{Math.ceil((orderLocation.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Incoming Alert Popup */}
      <Dialog open={showAlertDialog} onOpenChange={(open) => {
        setShowAlertDialog(open);
        if (!open) {
          setActiveAlert(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Alert</DialogTitle>
            <DialogDescription>
              {activeAlert ? new Date(activeAlert.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {activeAlert && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">Machine: {activeAlert.machineId}</div>
              <div className="text-base">{activeAlert.message}</div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => {
                  if (activeAlert) acknowledgeAlertMutation.mutate(activeAlert.id);
                  setShowAlertDialog(false);
                }}>Acknowledge</Button>
                <Button onClick={() => setShowAlertDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Machine Access Permissions</DialogTitle>
            <DialogDescription>
              Users who have permissions to use this machine
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingPermissions ? (
            <div className="py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full mb-2" />
              ))}
            </div>
          ) : userPermissions && userPermissions.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {userPermissions.map((permission) => (
                <div 
                  key={permission.userId} 
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div className="font-medium">{permission.user?.username || `User ${permission.userId}`}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No permissions configured for this machine
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}