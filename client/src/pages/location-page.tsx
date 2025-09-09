import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Location as LocationType, OrderLocation, Order, Machine, type MachineAssignment } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile"; // Add this import
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrderCard from "@/components/orders/order-card";

interface LocationPageProps {
  locationId: number;
}

type OrderWithLocationDetails = OrderLocation & { order: Order };

export default function LocationPage({ locationId }: LocationPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("current");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const isMobile = useMobile(); // Add this hook
  const [selectedAssignOrderId, setSelectedAssignOrderId] = useState<number | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<number[]>([]);
  const [assignedQty, setAssignedQty] = useState<number | "">("");

  // Fetch location details
  const { data: location, isLoading: isLoadingLocation } = useQuery<LocationType, Error>({
    queryKey: ["/api/locations", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/locations/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch location details");
      return res.json();
    },
  });

  // Fetch orders for this location
  const { data: orderLocations, isLoading: isLoadingOrders, refetch } = useQuery<OrderWithLocationDetails[], Error>({
    queryKey: ["/api/order-locations/location", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/order-locations/location/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch orders for this location");
      return res.json();
    },
  });

  // Fetch all locations to determine usedOrder precedence for eligibility checks
  const { data: allLocations } = useQuery<LocationType[], Error>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch(`/api/locations`);
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // For eligibility checks, fetch all order-locations per order (batch via Promise.all)
  const { data: orderLocsByOrder } = useQuery<Record<number, OrderLocation[]>, Error>({
    queryKey: ["/api/order-locations/order", locationId, (orderLocations || []).map(o => o.orderId).join(",")],
    enabled: !!orderLocations && orderLocations.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set((orderLocations || []).map(o => o.orderId)));
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/order-locations/order/${id}`);
          if (!res.ok) throw new Error("Failed to fetch order-locations for order");
          const data: OrderLocation[] = await res.json();
          return [id, data] as const;
        })
      );
      return Object.fromEntries(results);
    }
  });

  // Fetch queue for this location
  const { data: queueItems, isLoading: isLoadingQueue, refetch: refetchQueue } = useQuery<OrderWithLocationDetails[], Error>({
    queryKey: ["/api/queue/location", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/queue/location/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch queue for this location");
      return res.json();
    },
  });
  // Fetch machines at this location
  const { data: machines, isLoading: isLoadingMachines } = useQuery<Machine[], Error>({
    queryKey: ["/api/machines/location", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/machines/location/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch machines for this location");
      return res.json();
    },
  });
  // Fetch current assignments at this location
  const { data: assignments, refetch: refetchAssignments } = useQuery<(MachineAssignment & { order: Order; machine: Machine; })[], Error>({
    queryKey: ["/api/assignments/location", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/location/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    }
  });
  
  // Fetch orders that need this location (if this is a primary location)
  const { data: ordersNeedingLocation, isLoading: isLoadingNeededOrders, refetch: refetchNeededOrders } = useQuery<Order[], Error>({
    queryKey: ["/api/primary-location-orders", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/primary-location-orders/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch orders needing this location");
      return res.json();
    },
    // Only run this query if the location is primary
    enabled: !!location?.isPrimary,
  });

  // Refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
      refetchQueue();
      if (location?.isPrimary) {
        refetchNeededOrders();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refetch, refetchQueue, refetchNeededOrders, location?.isPrimary]);
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchAssignments();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [refetchAssignments]);

  // Location action mutations
  const startOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/start`, {});
    },
    onSuccess: () => {
      refetch();
      refetchQueue();
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
    mutationFn: async ({ orderId, completedQuantity }: { orderId: number; completedQuantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/finish`, {
        completedQuantity,
      });
    },
    onSuccess: () => {
      refetch();
      refetchQueue();
      toast({
        title: "Order Completed",
        description: "The order has been marked as completed at this location",
      });
      // Close expanded view
      setExpandedOrderId(null);
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
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/pause`, {});
    },
    onSuccess: () => {
      refetch();
      refetchQueue();
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
    mutationFn: async ({ orderId, completedQuantity }: { orderId: number; completedQuantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/update-quantity`, {
        completedQuantity,
      });
    },
    onSuccess: () => {
      refetch();
      refetchQueue();
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
    mutationFn: async ({ orderId, notes }: { orderId: number; notes?: string }) => {
      await apiRequest("POST", `/api/help-requests`, {
        orderId,
        locationId,
        notes,
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

  // Compute Upcoming: assigned here but cannot start yet per gating rules
  const getUpcomingOrders = () => {
    if (!orderLocations || !location || !allLocations || !orderLocsByOrder) return [] as OrderWithLocationDetails[];
    const usedOrderMap = new Map(allLocations.map(l => [l.id, l.usedOrder] as const));
    const currentUsedOrder = usedOrderMap.get(location.id) ?? location.usedOrder;
    return orderLocations.filter(ol => {
      if (ol.order.isShipped) return false;
      if (ol.status !== "not_started") return false;
      const orderAllLocs = orderLocsByOrder[ol.orderId] || [];
      // Use 1: can't start until globally queued
      if (currentUsedOrder <= 1) {
        return !(ol.order.globalQueuePosition && ol.order.globalQueuePosition > 0);
      }
      // For use > 1: check prior locations started
      const priorLocs = orderAllLocs.filter(x => (usedOrderMap.get(x.locationId) ?? Infinity) < currentUsedOrder);
      if (priorLocs.length === 0) {
        // If order doesn't use any prior locations, it's eligible; not upcoming
        return false;
      }
      const anyPriorNotStarted = priorLocs.some(x => x.status === "not_started");
      // If any prior not started, this is upcoming (cannot start yet)
      return anyPriorNotStarted;
    });
  };

  // Handlers for order actions
  const handleOrderClick = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleStartOrder = (orderId: number) => {
    startOrderMutation.mutate(orderId);
  };

  const handleFinishOrder = (orderId: number) => {
    const orderLocation = orderLocations?.find(ol => ol.order.id === orderId);
    if (!orderLocation) return;
    // Use effective total considering multiplier when finishing
    const multiplier = location?.countMultiplier ?? 1;
    const effectiveTotal = Math.ceil((orderLocation.order.totalQuantity || 0) * multiplier);
    finishOrderMutation.mutate({ 
      orderId, 
      completedQuantity: effectiveTotal 
    });
  };

  const handlePauseOrder = (orderId: number) => {
    pauseOrderMutation.mutate(orderId);
  };

  const handleResumeOrder = (orderId: number) => {
    startOrderMutation.mutate(orderId);
  };

  const handleUpdateCount = (orderId: number, count: number) => {
    updateQuantityMutation.mutate({ orderId, completedQuantity: count });
  };

  const handleRequestHelp = (orderId: number, notes: string) => {
    helpRequestMutation.mutate({ orderId, notes });
  };

  // Reorder location queue
  const reorderQueueMutation = useMutation({
    mutationFn: async (data: { orderId: number; position: number }) => {
      await apiRequest("POST", `/api/queue/location/${locationId}/reorder`, data);
    },
    onSuccess: () => {
      refetchQueue();
      toast({ title: "Queue updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Assign orders to machines
  const assignMutation = useMutation({
    mutationFn: async (payload: { orderId: number; machineIds: number[]; qty?: number }) => {
      for (const mId of payload.machineIds) {
        await apiRequest("POST", "/api/assignments", { orderId: payload.orderId, locationId, machineId: mId, assignedQuantity: payload.qty ?? 0 });
      }
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Assigned to machines" });
      setSelectedAssignOrderId(null);
      setSelectedMachineIds([]);
      setAssignedQty("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update existing assignment quantity
  const updateAssignmentQtyMutation = useMutation({
    mutationFn: async (payload: { orderId: number; machineId: number; qty: number }) => {
      await apiRequest("PUT", "/api/assignments", { orderId: payload.orderId, locationId, machineId: payload.machineId, assignedQuantity: payload.qty });
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Assignment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const toggleMachineSelect = (id: number) => {
    setSelectedMachineIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Location Alert popups ---
  type MachineAlert = {
    id: number;
    machineId: string;
    message: string;
    alertType: "help_request" | "notification" | "warning" | "error";
    status: "pending" | "acknowledged" | "resolved";
    createdAt: string | Date;
  };

  const { data: allPendingAlerts = [] } = useQuery<MachineAlert[]>({
    queryKey: ["/api/alerts", "location", locationId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const [alertQueue, setAlertQueue] = useState<MachineAlert[]>([]);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [activeAlert, setActiveAlert] = useState<MachineAlert | null>(null);
  const [seenAlerts, setSeenAlerts] = useState<Set<number>>(new Set());

  // Enqueue pending alerts for machines at this location, unseen only
  useEffect(() => {
    if (!machines || machines.length === 0) return;
    const machineIdSet = new Set(machines.map(m => m.machineId));
    const relevant = (allPendingAlerts || []).filter(a => a.status === "pending" && machineIdSet.has(a.machineId));
    const newOnes = relevant.filter(a => !seenAlerts.has(a.id));
    if (newOnes.length > 0) {
      setAlertQueue(prev => [...prev, ...newOnes]);
      setSeenAlerts(prev => new Set([...Array.from(prev), ...newOnes.map(a => a.id)]));
    }
  }, [allPendingAlerts, machines, seenAlerts]);

  // Dequeue into active dialog
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
  if (isLoadingLocation || isLoadingOrders) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Tabs defaultValue="current">
          <TabsList className="mb-4 w-full overflow-x-auto">
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

  // Handle case where location is not found
  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold mb-2">Location Not Found</h2>
        <p className="text-gray-500 mb-4">The requested location could not be found.</p>
        <Button onClick={() => navigate("/locations")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Locations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Made responsive */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-6`}>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "icon"} 
            onClick={() => navigate("/locations")}
            className="mr-2"
          >
            <ArrowLeft className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          </Button>
          <h1 className={`${isMobile ? "text-xl" : "text-2xl"} font-bold`}>{location.name}</h1>
        </div>
        
        <div className="flex items-center">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mr-2"
            size={"sm"}
          >
            <RefreshCw className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} mr-1`} /> 
            {!isMobile && "Refresh"}
          </Button>
          <Button 
            onClick={() => setShowQueueDialog(true)}
            size={"sm"}
          >
            {isMobile ? <Plus className="h-3 w-3" /> : "View Queue"}
          </Button>
        </div>
      </div>
      
      {/* Orders Tabs - Made responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full overflow-x-auto flex">
          {/* Upcoming tab to the left of In Queue */}
          <TabsTrigger value="upcoming" className={isMobile ? "text-xs py-1 px-2" : ""}>
            Upcoming {getUpcomingOrders().length > 0 && `(${getUpcomingOrders().length})`}
          </TabsTrigger>
          {/* In Queue tab moved to the left of Current */}
          <TabsTrigger value="queue" className={isMobile ? "text-xs py-1 px-2" : ""}>
            In Queue {queueItems && queueItems.length > 0 && `(${queueItems.length})`}
          </TabsTrigger>
          <TabsTrigger value="current" className={isMobile ? "text-xs py-1 px-2" : ""}>
            Current {getCurrentOrders().length > 0 && `(${getCurrentOrders().length})`}
          </TabsTrigger>
          <TabsTrigger value="completed" className={isMobile ? "text-xs py-1 px-2" : ""}>
            Completed {getCompletedOrders().length > 0 && `(${getCompletedOrders().length})`}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming tab content (read-only heads-up list) */}
        <TabsContent value="upcoming">
          {getUpcomingOrders().length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No upcoming orders blocked from starting.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {getUpcomingOrders()
                .slice() // avoid mutating
                .sort((a, b) => {
                  // Rush first, then global queue position, then createdAt
                  if (a.order.rush && !b.order.rush) return -1;
                  if (!a.order.rush && b.order.rush) return 1;
                  const ag = a.order.globalQueuePosition ?? Number.POSITIVE_INFINITY;
                  const bg = b.order.globalQueuePosition ?? Number.POSITIVE_INFINITY;
                  if (ag !== bg) return ag - bg;
                  const ac = new Date(a.order.createdAt as any).getTime();
                  const bc = new Date(b.order.createdAt as any).getTime();
                  return ac - bc;
                })
                .map(item => {
                  const usedOrderMap = new Map((allLocations || []).map(l => [l.id, l.usedOrder] as const));
                  const currentUsedOrder = usedOrderMap.get(location.id) ?? location.usedOrder;
                  const orderAllLocs = orderLocsByOrder?.[item.orderId] || [];
                  const priorLocs = orderAllLocs.filter(x => (usedOrderMap.get(x.locationId) ?? Infinity) < currentUsedOrder);
                  const blockedByGlobal = currentUsedOrder <= 1 && !(item.order.globalQueuePosition && item.order.globalQueuePosition > 0);
                  const blockedByPrior = priorLocs.some(x => x.status === "not_started");
                  const reason = blockedByGlobal
                    ? "Waiting for Global Queue"
                    : (blockedByPrior ? "Waiting for prior location to start" : "");
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-2 px-3 border rounded-md bg-muted/30">
                      <div className="min-w-0">
                        <div className="font-medium truncate">#
                          <button type="button" className="text-primary hover:underline" onClick={() => navigate(`/orders/${item.order.id}`)}>
                            {item.order.orderNumber}
                          </button>
                           — {item.order.client}
                        </div>
                        {!location?.noCount && (
                          <div className="text-xs text-gray-500">
                            Qty {Math.ceil((item.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                            {location?.countMultiplier && location.countMultiplier !== 1 ? (
                              <span className="text-[10px] text-muted-foreground ml-1">({item.order.totalQuantity} x {location.countMultiplier})</span>
                            ) : null}
                          </div>
                        )}
                        {item.order.rush && <span className="text-xs font-semibold text-red-600">RUSH</span>}
                        {reason && <div className="text-xs text-muted-foreground mt-1">{reason}</div>}
                      </div>
                      {/* Read-only: no actions */}
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* In Queue tab content (replaces prior "Needed" tab) */}
        <TabsContent value="queue">
          {(() => {
            // Fallback: derive queue from orderLocations if queue endpoint empty
            const fallback = (orderLocations || []).filter(ol => ol.status === "in_queue");
            const effectiveQueue = (queueItems && queueItems.length > 0) ? queueItems : fallback;
            if (!effectiveQueue || effectiveQueue.length === 0) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No orders currently in queue at this location.</p>
                  </CardContent>
                </Card>
              );
            }
            return (
              <div className="space-y-2">
              {[...effectiveQueue]
                .sort((a, b) => {
                  // Rush items first
                  if (a.order.rush && !b.order.rush) return -1;
                  if (!a.order.rush && b.order.rush) return 1;
                  if (a.order.rush && b.order.rush) {
                    const ar = a.order.rushSetAt ? new Date(a.order.rushSetAt as any).getTime() : 0;
                    const br = b.order.rushSetAt ? new Date(b.order.rushSetAt as any).getTime() : 0;
                    if (ar !== br) return ar - br;
                  }
                  return (a.queuePosition || 0) - (b.queuePosition || 0);
                })
                .map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 px-3 border rounded-md">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#
                      <button type="button" className="text-primary hover:underline" onClick={() => navigate(`/orders/${item.order.id}`)}>
                        {item.order.orderNumber}
                      </button>
                       — {item.order.client}
                    </div>
                    {!location?.noCount && (
                      <div className="text-xs text-gray-500">
                        Qty {Math.ceil((item.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                        {location?.countMultiplier && location.countMultiplier !== 1 ? (
                          <span className="text-[10px] text-muted-foreground ml-1">({item.order.totalQuantity} x {location.countMultiplier})</span>
                        ) : null}
                      </div>
                    )}
                    {item.order.rush && <span className="text-xs font-semibold text-red-600">RUSH</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Pos</span>
                    <Select
                      value={String(item.queuePosition || idx + 1)}
                      onValueChange={(v) => reorderQueueMutation.mutate({ orderId: item.orderId, position: parseInt(v) })}
                    >
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: effectiveQueue.length }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleStartOrder(item.order.id)}>
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="current">
          {getCurrentOrders().length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No orders currently assigned to this location.</p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-2 gap-4'}`}>
        {getCurrentOrders().map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrderId === order.id}
                  onExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  isCompleted={false}
          hideQuantity={!!location?.noCount}
          totalOverride={Math.ceil((order.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {getCompletedOrders().length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No completed orders at this location.</p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-2 gap-4'}`}>
        {getCompletedOrders().map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrderId === order.id}
                  onExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  isCompleted={true}
                  className={isMobile ? "opacity-90" : ""}
          hideQuantity={!!location?.noCount}
          totalOverride={Math.ceil((order.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                />
              ))}
            </div>
          )}
        </TabsContent>

  {/* Removed legacy "Needed" tab per request */}
      </Tabs>

      {/* Queue Dialog - Made mobile responsive */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent className={isMobile ? "max-w-[90vw] p-4" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-lg" : "text-xl"}>Location Queue</DialogTitle>
          </DialogHeader>
          
          {isLoadingQueue ? (
            <div className="py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full mb-2" />
              ))}
            </div>
          ) : queueItems && queueItems.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {[...queueItems]
                .sort((a, b) => {
                  if (a.order.rush && !b.order.rush) return -1;
                  if (!a.order.rush && b.order.rush) return 1;
                  if (a.order.rush && b.order.rush) {
                    const ar = a.order.rushSetAt ? new Date(a.order.rushSetAt as any).getTime() : 0;
                    const br = b.order.rushSetAt ? new Date(b.order.rushSetAt as any).getTime() : 0;
                    if (ar !== br) return ar - br;
                  }
                  return (a.queuePosition || 0) - (b.queuePosition || 0);
                })
                .map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#
                      <button type="button" className="text-primary hover:underline" onClick={() => { setShowQueueDialog(false); navigate(`/orders/${item.order.id}`); }}>
                        {item.order.orderNumber}
                      </button>
                       — {item.order.client}
                    </div>
                    {!location?.noCount && (
                      <div className="text-xs text-gray-500">
                        Qty {Math.ceil((item.order.totalQuantity || 0) * (location?.countMultiplier ?? 1))}
                        {location?.countMultiplier && location.countMultiplier !== 1 ? (
                          <span className="text-[10px] text-muted-foreground ml-1">({item.order.totalQuantity} x {location.countMultiplier})</span>
                        ) : null}
                      </div>
                    )}
                    {item.order.rush && <span className="text-xs font-semibold text-red-600">RUSH</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Pos</span>
                    <Select
                      value={String(item.queuePosition || idx + 1)}
                      onValueChange={(v) => reorderQueueMutation.mutate({ orderId: item.orderId, position: parseInt(v) })}
                    >
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: queueItems.length }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => { handleStartOrder(item.order.id); setShowQueueDialog(false); }}>
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Queue Empty</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment panel */}
      {machines && machines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Orders to Machines</CardTitle>
            <CardDescription>Select an order in queue and assign to one or more machines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-sm mb-1 block">Order</label>
                {(() => {
                  // Merge queue items with any orders at this location that are not started or in queue
                  const map = new Map<number, OrderWithLocationDetails>();
                  (queueItems || []).forEach(item => map.set(item.orderId, item));
                  (orderLocations || [])
                    .filter(ol => ol.status === "in_queue" || ol.status === "not_started")
                    .forEach(ol => {
                      if (!map.has(ol.orderId)) map.set(ol.orderId, ol as OrderWithLocationDetails);
                    });
                  const assignable = Array.from(map.values());
                  // Sort: queued first by queuePosition, then by created date newest last
                  assignable.sort((a, b) => {
                    const aq = a.queuePosition ?? Number.POSITIVE_INFINITY;
                    const bq = b.queuePosition ?? Number.POSITIVE_INFINITY;
                    if (aq !== bq) return aq - bq;
                    const ac = new Date(a.order.createdAt as any).getTime();
                    const bc = new Date(b.order.createdAt as any).getTime();
                    return ac - bc;
                  });
                  return (
                    <Select value={selectedAssignOrderId ? String(selectedAssignOrderId) : ""} onValueChange={(v) => setSelectedAssignOrderId(parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                      <SelectContent>
                        {assignable.map(q => (
                          <SelectItem key={q.orderId} value={String(q.orderId)}>
                            #{q.order.orderNumber} — {q.order.client}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
              <div>
                <label className="text-sm mb-1 block">Machines</label>
                <div className="flex flex-wrap gap-2">
                  {machines.map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleMachineSelect(m.id)}
                      className={`px-3 py-1 rounded border text-sm ${selectedMachineIds.includes(m.id) ? 'bg-primary text-white' : 'bg-white'}`}
                    >{m.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm mb-1 block">Assign Qty (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={assignedQty}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssignedQty(v === '' ? '' : Math.max(0, Math.floor(Number(v))));
                  }}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="e.g. 20"
                />
                {location?.countMultiplier && location.countMultiplier !== 1 && (
                  <div className="text-[10px] text-muted-foreground mt-1">Effective totals use multiplier x{location.countMultiplier}</div>
                )}
              </div>
              <div>
                <Button
                  disabled={!selectedAssignOrderId || selectedMachineIds.length === 0 || assignMutation.isPending}
                  onClick={() => selectedAssignOrderId && assignMutation.mutate({ orderId: selectedAssignOrderId, machineIds: selectedMachineIds, qty: assignedQty === '' ? undefined : Number(assignedQty) })}
                >Assign</Button>
              </div>
            </div>
            {assignments && assignments.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="font-medium text-foreground">Current assignments</div>
                <div className="space-y-1">
                  {assignments.map(a => (
                    <div key={`${a.orderId}-${a.machineId}`} className="flex items-center gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">#{a.order.orderNumber}</span>
                        <span className="mx-1">→</span>
                        <span>{a.machine.name}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        defaultValue={(a as any).assignedQuantity || 0}
                        onChange={(e) => {
                          const v = Math.max(0, Math.floor(Number(e.target.value || '0')));
                          (e.currentTarget as any)._pendingVal = v;
                        }}
                        className="w-20 border rounded px-2 py-1 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        const qty = (input as any)._pendingVal ?? Number(input.value) ?? 0;
                        updateAssignmentQtyMutation.mutate({ orderId: a.orderId, machineId: a.machineId, qty });
                      }} disabled={updateAssignmentQtyMutation.isPending}>Save</Button>
                      {(a as any).assignedQuantity ? (
                        <span className="text-xs text-muted-foreground">Assigned: {(a as any).assignedQuantity}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
