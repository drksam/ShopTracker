import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Location, OrderLocation, Order } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, RefreshCw, Clock, AlertCircle, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface LocationDisplayPageProps {
  locationId: number;
}

type OrderWithLocationDetails = OrderLocation & { order: Order };

export default function LocationDisplayPage({ locationId }: LocationDisplayPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("current");
  const [showQueueDialog, setShowQueueDialog] = useState(false);

  // Fetch location details
  const { data: location, isLoading: isLoadingLocation } = useQuery<Location, Error>({
    queryKey: ["/api/locations", locationId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/locations/${locationId}`);
        if (!res.ok) {
          console.error(`Failed to fetch location details for ID: ${locationId}`, res.status);
          return null;
        }
        return res.json();
      } catch (error) {
        console.error(`Error fetching location with ID: ${locationId}`, error);
        return null;
      }
    },
  });
  
  // Fetch primary location needed orders
  const { data: neededOrders = [], isLoading: isLoadingNeededOrders, refetch: refetchNeededOrders } = useQuery<Order[], Error>({
    queryKey: ["/api/primary-location-orders", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/primary-location-orders/${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch orders that need this primary location");
      return res.json();
    },
    enabled: location?.isPrimary === true, // Only fetch for primary locations
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
  
  // Set active tab when location loads
  useEffect(() => {
    if (location?.isPrimary) {
      setActiveTab("needed_v2");
    }
  }, [location?.isPrimary]);

  // Location action mutations
  const startOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      // First ensure the order-location relationship exists
      try {
        // Check if the order-location already exists
        const checkResponse = await fetch(`/api/order-locations/order/${orderId}`);
        const existingLocations = await checkResponse.json();
        
        // If no relationship exists for this location, create one
        const hasRelationshipWithThisLocation = existingLocations.some(
          (ol: any) => ol.locationId === Number(locationId)
        );
        
        if (!hasRelationshipWithThisLocation) {
          console.log(`Creating new order-location for order ${orderId} at location ${locationId}`);
          // Create the order-location relationship first
          await apiRequest("POST", `/api/order-locations`, {
            orderId,
            locationId: Number(locationId),
            status: "not_started"
          });
        }
      } catch (err) {
        console.error("Error checking/creating order-location:", err);
      }
      
      // Now start the order
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/start`, {});
    },
    onSuccess: () => {
      refetch();
      refetchQueue();
      if (location?.isPrimary) {
        refetchNeededOrders();
      }
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

  const handleRequestHelp = (orderId: number) => {
    helpRequestMutation.mutate({ orderId });
  };

  // Render loading state
  if (isLoadingLocation || isLoadingOrders) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
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

  // Handle case where location is not found
  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold mb-2">Location Not Found</h2>
        <p className="text-gray-500 mb-4">The requested location could not be found.</p>
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
      
      {/* Location Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Location Type</p>
                <p className="font-medium">
                  {location.isPrimary ? "Primary Location" : "Standard Location"}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Count Multiplier</p>
                <p className="font-medium">{location.countMultiplier}x</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Auto-Queue Settings</p>
                <p className="font-medium">
                  {location.skipAutoQueue ? "Auto-Queue Disabled" : "Auto-Queue Enabled"}
                </p>
              </div>
            </div>
            
            {/* Current Order Progress */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {getCurrentOrders().length > 0 ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-2">
                    <CircularProgressbar
                      value={(getCurrentOrders()[0].completedQuantity / getCurrentOrders()[0].order.totalQuantity) * 100}
                      text={`${getCurrentOrders()[0].completedQuantity}/${getCurrentOrders()[0].order.totalQuantity}`}
                      styles={buildStyles({
                        textSize: '16px',
                        pathColor: '#3b82f6',
                        textColor: '#1f2937',
                        trailColor: '#e5e7eb'
                      })}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Current Order</p>
                  <Link to={`/orders/${getCurrentOrders()[0].order.id}`}>
                    <p className="font-medium text-primary hover:underline cursor-pointer">{getCurrentOrders()[0].order.orderNumber}</p>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-2 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                    <Clock className="h-12 w-12 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">No Active Orders</p>
                  <p className="text-xs text-gray-400">Station is available</p>
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
          {location.isPrimary && (
            <TabsTrigger value="needed_v2">
              Needed Orders {neededOrders?.length > 0 && `(${neededOrders.length})`}
            </TabsTrigger>
          )}
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
                  <Button 
                    onClick={() => setShowQueueDialog(true)} 
                    className="mt-2"
                  >
                    View Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getCurrentOrders().map((orderLocation) => (
                <Card key={orderLocation.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Link to={`/orders/${orderLocation.order.id}`}>
                            <h3 className="font-medium text-lg text-primary hover:underline cursor-pointer">{orderLocation.order.orderNumber}</h3>
                          </Link>
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
                          <span className="text-sm font-medium">{orderLocation.completedQuantity}/{orderLocation.order.totalQuantity}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${(orderLocation.completedQuantity / orderLocation.order.totalQuantity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {orderLocation.status === "in_progress" ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePauseOrder(orderLocation.order.id)}
                              disabled={pauseOrderMutation.isPending}
                            >
                              Pause
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleFinishOrder(orderLocation.order.id)}
                              disabled={finishOrderMutation.isPending}
                            >
                              Complete
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleResumeOrder(orderLocation.order.id)}
                            disabled={startOrderMutation.isPending}
                          >
                            Resume
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-auto"
                          onClick={() => handleRequestHelp(orderLocation.order.id)}
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
                        <div>
                          <span className="text-gray-500">Quantity:</span> {orderLocation.order.totalQuantity}
                        </div>
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
                              handleUpdateCount(orderLocation.order.id, newCount);
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
                              const newCount = Math.min(orderLocation.order.totalQuantity, orderLocation.completedQuantity + 1);
                              handleUpdateCount(orderLocation.order.id, newCount);
                            }}
                            disabled={updateQuantityMutation.isPending || orderLocation.completedQuantity >= orderLocation.order.totalQuantity}
                          >
                            +
                          </Button>
                          
                          <div className="ml-auto">
                            <Button 
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateCount(orderLocation.order.id, orderLocation.completedQuantity)}
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

        {location.isPrimary && (
          <TabsContent value="needed_v2">
            {isLoadingNeededOrders ? (
              <div className="py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full mb-2" />
                ))}
              </div>
            ) : neededOrders && neededOrders.length > 0 ? (
              <div className="grid gap-4">
                {neededOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <a 
                              href={`/orders/${order.id}`} 
                              className="text-blue-600 hover:underline font-medium"
                            >
                              Order #{order.orderNumber}
                            </a>
                            <span className="ml-2 text-sm text-gray-600">
                              ({order.tbfosNumber})
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mt-1">
                            {order.client}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className="bg-blue-100 text-blue-800 inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium">
                            Needs processing
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            Due: {new Date(order.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap text-sm text-gray-500 gap-x-4">
                        <div>
                          Quantity: <span className="text-gray-700 font-medium">{order.totalQuantity}</span>
                        </div>
                        {order.description && (
                          <div className="mt-1 w-full">
                            <span className="text-gray-500">Description: </span>
                            <span className="text-gray-700">{order.description}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex space-x-2 justify-end bg-white">
                      <Button
                        onClick={() => startOrderMutation.mutate(order.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        <Clock className="mr-1.5 h-4 w-4" /> 
                        Start Now
                      </Button>
                        
                      <Button
                        onClick={() => {
                          toast({
                            title: "Adding to queue...",
                            description: "Please wait"
                          });
                          
                          apiRequest("POST", `/api/queue/location/${locationId}`, {
                            orderId: order.id
                          })
                          .then(() => {
                            toast({
                              title: "Success",
                              description: "Order added to queue"
                            });
                            refetchQueue();
                            refetchNeededOrders();
                          })
                          .catch(error => {
                            toast({
                              title: "Error",
                              description: "Failed to add order to queue",
                              variant: "destructive"
                            });
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add to Queue
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <h3 className="text-lg font-medium mb-1">No Orders Needed</h3>
                    <p className="text-sm text-center">
                      No orders currently need processing at this primary location
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
        
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
                        <Link to={`/orders/${orderLocation.order.id}`}>
                          <h3 className="font-medium text-primary hover:underline cursor-pointer">{orderLocation.order.orderNumber}</h3>
                        </Link>
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
                    
                    <div className="text-sm mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span>{orderLocation.completedQuantity}/{orderLocation.order.totalQuantity}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Queue Dialog */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue for {location.name}</DialogTitle>
            <DialogDescription>
              Orders in queue for this location
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingQueue ? (
            <div className="py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full mb-2" />
              ))}
            </div>
          ) : queueItems && queueItems.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {queueItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      <span className="text-sm">Queue #{item.queuePosition}:</span>{" "}
                      <Link to={`/orders/${item.order.id}`}>
                        <span className="text-primary hover:underline cursor-pointer">{item.order.orderNumber}</span>
                      </Link>
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.order.client} • {item.order.totalQuantity} units
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      handleStartOrder(item.order.id);
                      setShowQueueDialog(false);
                    }}
                    disabled={startOrderMutation.isPending}
                    size="sm"
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium mb-1">Queue Empty</h3>
              <p className="text-sm text-center text-gray-500">
                There are no orders in the queue for this location
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}