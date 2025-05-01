import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Location as LocationType, OrderLocation, Order } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
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

  // Fetch queue for this location
  const { data: queueItems, isLoading: isLoadingQueue, refetch: refetchQueue } = useQuery<OrderWithLocationDetails[], Error>({
    queryKey: ["/api/queue/location", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/queue/location/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch queue for this location");
      return res.json();
    },
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
    
    finishOrderMutation.mutate({ 
      orderId, 
      completedQuantity: orderLocation.order.totalQuantity 
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

  // Render loading state
  if (isLoadingLocation || isLoadingOrders) {
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/locations")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{location.name}</h1>
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
          <Button 
            onClick={() => setShowQueueDialog(true)}
            size="sm"
          >
            View Queue
          </Button>
        </div>
      </div>
      
      {/* Orders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">
            Current Orders {getCurrentOrders().length > 0 && `(${getCurrentOrders().length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {getCompletedOrders().length > 0 && `(${getCompletedOrders().length})`}
          </TabsTrigger>
          {/* Always show the tab for primary locations */}
          {location.isPrimary && (
            <TabsTrigger value="needed">
              Needed Orders {ordersNeedingLocation && ordersNeedingLocation.length > 0 && `(${ordersNeedingLocation.length})`}
            </TabsTrigger>
          )}
          {/* Fix LSP type error by removing console.log */}
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
                    You don't have any orders in progress or paused at this location
                  </p>
                  <Button 
                    onClick={() => setShowQueueDialog(true)} 
                    className="mt-2"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Start New Order from Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              {getCurrentOrders().map((orderLocation) => (
                <OrderCard
                  key={orderLocation.id}
                  orderLocation={orderLocation}
                  onClick={() => handleOrderClick(orderLocation.order.id)}
                  onStart={() => handleStartOrder(orderLocation.order.id)}
                  onFinish={() => handleFinishOrder(orderLocation.order.id)}
                  onPause={() => handlePauseOrder(orderLocation.order.id)}
                  onResume={() => handleResumeOrder(orderLocation.order.id)}
                  onUpdateCount={(count) => handleUpdateCount(orderLocation.order.id, count)}
                  onRequestHelp={(notes) => handleRequestHelp(orderLocation.order.id, notes)}
                  expanded={expandedOrderId === orderLocation.order.id}
                />
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
                    You don't have any completed orders at this location yet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              {getCompletedOrders().map((orderLocation) => (
                <OrderCard
                  key={orderLocation.id}
                  orderLocation={orderLocation}
                  onClick={() => handleOrderClick(orderLocation.order.id)}
                  expanded={expandedOrderId === orderLocation.order.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {location.isPrimary && (
          <TabsContent value="needed">
            {isLoadingNeededOrders ? (
              <div className="py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full mb-4" />
                ))}
              </div>
            ) : !ordersNeedingLocation || ordersNeedingLocation.length === 0 ? (
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3 className="text-lg font-medium mb-1">No Orders Need This Location</h3>
                    <p className="text-sm text-center">
                      There are no orders that require processing at this primary location
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div>
                {ordersNeedingLocation.map((order) => (
                  <Card key={order.id} className="mb-4 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-accent/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center">
                              <span className="text-lg font-medium text-primary">{order.orderNumber}</span>
                              <span className="ml-2 text-sm text-muted-foreground">({order.tbfosNumber})</span>
                            </div>
                            <div className="text-sm text-gray-700">{order.client}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm"
                              onClick={() => {
                                // Create a new order location for this primary location
                                apiRequest("POST", "/api/order-locations", {
                                  orderId: order.id,
                                  locationId: locationId,
                                  queuePosition: 9999 // Will be reordered by the backend
                                }).then(() => {
                                  refetchNeededOrders();
                                  refetchQueue();
                                  toast({
                                    title: "Order Added",
                                    description: "Order added to this location's queue",
                                  });
                                }).catch(() => {
                                  toast({
                                    title: "Error",
                                    description: "Failed to add order to this location",
                                    variant: "destructive",
                                  });
                                });
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add to Queue
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 text-sm">
                          <div className="flex space-x-3 text-muted-foreground">
                            <div>Due: {new Date(order.dueDate).toLocaleDateString()}</div>
                            <div>Qty: {order.totalQuantity}</div>
                          </div>
                        </div>
                        {order.description && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Description:</span> {order.description}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
      
      {/* Queue Dialog */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue for {location.name}</DialogTitle>
          </DialogHeader>
          
          {isLoadingQueue ? (
            <div className="py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full mb-2" />
              ))}
            </div>
          ) : queueItems && queueItems.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {queueItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="border-b pb-3 mb-3 last:border-0 last:mb-0 last:pb-0"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Queue #{item.queuePosition}:</span>{" "}
                      <span className="text-primary">{item.order.orderNumber} ({item.order.client})</span>
                      <div className="text-sm text-gray-500">
                        Due: {new Date(item.order.dueDate).toLocaleDateString()}
                        {" • "}Qty: {item.order.totalQuantity}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        handleStartOrder(item.order.id);
                        setShowQueueDialog(false);
                      }}
                      disabled={startOrderMutation.isPending}
                    >
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
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
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <path d="M2 10h20"></path>
                <path d="M9 16h6"></path>
              </svg>
              <h3 className="text-lg font-medium mb-1">Queue is Empty</h3>
              <p className="text-sm text-center">
                There are no orders in the queue for this location
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
