import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { OrderWithDetails, AuditTrail, Location } from "@shared/schema";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderStatusIndicator from "@/components/orders/order-status-indicator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useResponsive } from "@/hooks/use-mobile";
import { QuantityUpdateDialog } from "@/components/orders/quantity-update-dialog";
import { HelpRequestDialog } from "@/components/orders/help-request-dialog";
import {
  ArrowLeft,
  Edit,
  Truck,
  FileCheck,
  CalendarIcon,
  Clock,
  User,
  Edit3,
  CheckCircle,
  PauseCircle,
  RefreshCw,
  HelpCircle,
  Plus,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import OrderForm from "@/components/orders/order-form";

interface OrderDetailPageProps {
  orderId: number;
}

export default function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const isMobile = useResponsive();
  const [expandedLocationId, setExpandedLocationId] = useState<number | null>(null);
  
  // State for dialogs
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [quantityDialogPurpose, setQuantityDialogPurpose] = useState<'update' | 'complete' | 'ship'>('update');

  // Fetch order details
  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery<OrderWithDetails, Error>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      return res.json();
    },
  });

  // Remove from all queues mutation
  const removeFromQueuesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/queue/global/${orderId}/remove`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      refetch();
      toast({ title: "Removed from queues", description: "Order removed from global and location queues." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to remove from queues: ${error.message}`, variant: "destructive" });
    },
  });

  // Fetch locations for easier reference
  const { data: locations } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
  });

  // Ship order mutation
  const shipMutation = useMutation({
    mutationFn: async (quantity: number) => {
      await apiRequest("POST", `/api/orders/${orderId}/ship`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      refetch();
      toast({
        title: "Order Shipped",
        description: "The order has been successfully marked as shipped.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ship order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle shipping
  const handleShip = async () => {
    if (!order) return;
    
    setQuantityDialogPurpose('ship');
    setIsShipDialogOpen(true);
  };
  
  // Handle ship quantity submission from dialog
  const handleShipSubmit = (quantity: number) => {
    if (!order) return;
    
    // Check if trying to ship more than available
    if (quantity + order.shippedQuantity > order.totalQuantity) {
      toast({
        title: "Quantity Exceeds Total",
        description: `You can ship at most ${order.totalQuantity - order.shippedQuantity} more units`,
        variant: "destructive",
      });
      return;
    }
    
    shipMutation.mutate(order.shippedQuantity + quantity);
  };

  // Location start/finish/pause mutations
  const startLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/start`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Location Started",
        description: "This location has been set to In Progress",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to start location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const finishLocationMutation = useMutation({
    mutationFn: async ({ locationId, quantity }: { locationId: number; quantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/finish`, {
        completedQuantity: quantity,
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Location Completed",
        description: "This location has been marked as completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to complete location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const pauseLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/pause`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Location Paused",
        description: "This location has been set to Paused",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to pause location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ locationId, quantity }: { locationId: number; quantity: number }) => {
      await apiRequest("POST", `/api/order-locations/${orderId}/${locationId}/update-quantity`, {
        completedQuantity: quantity,
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
    mutationFn: async ({ locationId, notes }: { locationId: number; notes?: string }) => {
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

  // Get location name by ID
  const getLocationName = (locationId: number): string => {
    const location = locations?.find(loc => loc.id === locationId);
    return location ? location.name : `Location ${locationId}`;
  };

  // Get formatted date
  const formatDate = (timestamp: number | Date | null): string => {
    if (!timestamp) return '-';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  };

  // Order form success handler
  const handleOrderFormSuccess = () => {
    setIsOrderFormOpen(false);
    refetch();
  };

  // Format username for audit trail
  const formatUsername = (audit: AuditTrail): string => {
    if (!order) return "Unknown";
    
    if (audit.userId && order.createdByUser && audit.userId === order.createdByUser.id) {
      return order.createdByUser.fullName || order.createdByUser.username;
    }
    
    return `User ${audit.userId}`;
  };

  // Check if order is overdue
  const isOrderOverdue = (): boolean => {
    if (!order) return false;
    const dueDate = new Date(order.dueDate);
    const today = new Date();
    return dueDate < today && !order.isShipped;
  };

  // Calculate completion percentage
  const calculateCompletion = (): number => {
    if (!order) return 0;
    
    // Get the sum of completed quantities across all locations
    const completedCount = order.locations.reduce((sum, loc) => sum + loc.completedQuantity, 0);
    
    // Get the total count needed for all locations
    const totalLocationsCount = order.locations.length;
    
    // Calculate the percentage
    return totalLocationsCount > 0
      ? Math.min(100, Math.round((completedCount / (order.totalQuantity * totalLocationsCount)) * 100))
      : 0;
  };

  // Generate PDF link
  const generatePdfLink = (): string => {
    if (!order) return "#";
    
    const pdfPrefix = order.pdfPrefix || "";
    return `${pdfPrefix}${order.tbfosNumber}.pdf`;
  };

  // Handle location actions
  const handleStartLocation = (locationId: number) => {
    startLocationMutation.mutate(locationId);
  };

  const handleFinishLocation = (locationId: number) => {
    if (!order) return;
    
    setSelectedLocationId(locationId);
    setQuantityDialogPurpose('complete');
    setIsQuantityDialogOpen(true);
  };
  
  // Handle finish quantity submission from dialog
  const handleFinishQuantitySubmit = (quantity: number) => {
    if (!selectedLocationId) return;
    
    finishLocationMutation.mutate({ locationId: selectedLocationId, quantity });
  };

  const handlePauseLocation = (locationId: number) => {
    pauseLocationMutation.mutate(locationId);
  };

  const handleUpdateQuantity = (locationId: number) => {
    if (!order) return;
    
    setSelectedLocationId(locationId);
    setQuantityDialogPurpose('update');
    setIsQuantityDialogOpen(true);
  };
  
  // Handle update quantity submission from dialog
  const handleUpdateQuantitySubmit = (quantity: number) => {
    if (!selectedLocationId) return;
    
    updateQuantityMutation.mutate({ locationId: selectedLocationId, quantity });
  };

  const handleRequestHelp = (locationId: number) => {
    setSelectedLocationId(locationId);
    setIsHelpDialogOpen(true);
  };
  
  // Handle help request submission from dialog
  const handleHelpRequestSubmit = (notes: string) => {
    if (!selectedLocationId) return;
    
    helpRequestMutation.mutate({ 
      locationId: selectedLocationId, 
      notes: notes || undefined 
    });
  };

  // Toggle expanded location for mobile view
  const toggleExpandLocation = (locationId: number) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  // Get the current quantity for the selected location
  const getCurrentQuantity = (): number => {
    if (!order || !selectedLocationId) return 0;
    
    const orderLocation = order.locations.find(loc => loc.locationId === selectedLocationId);
    return orderLocation ? orderLocation.completedQuantity : 0;
  };

  // Get the location name for the selected location
  const getSelectedLocationName = (): string => {
    if (!selectedLocationId || !locations) return "Location";
    
    const location = locations.find(loc => loc.id === selectedLocationId);
    return location ? location.name : `Location ${selectedLocationId}`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Handle case where order is not found
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested order could not be found or you don't have permission to view it.</p>
        <Button onClick={() => navigate("/orders")} className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back button and header - now more mobile friendly with better spacing */}
      <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-6`}>
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "icon"} 
            onClick={() => navigate("/orders")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
            {isMobile && <span className="ml-1">Back</span>}
          </Button>
          <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Order #{order.orderNumber} ({order.tbfosNumber})
          </h1>
        </div>
        
        {/* Action buttons - stacked on mobile */}
        <div className={`flex ${isMobile ? 'flex-col w-full gap-2 mt-2' : 'items-center gap-2'}`}>
          <Button 
            onClick={() => setIsOrderFormOpen(true)} 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            className={isMobile ? "w-full justify-center" : ""}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Order
          </Button>
          
          {!order.isShipped && (
            <Button 
              onClick={handleShip} 
              variant="default" 
              size={isMobile ? "sm" : "default"}
              className={isMobile ? "w-full justify-center" : ""}
            >
              <Truck className="h-4 w-4 mr-2" />
              Mark as Shipped
            </Button>
          )}

          <Button
            onClick={() => removeFromQueuesMutation.mutate()}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className={isMobile ? "w-full justify-center" : ""}
            disabled={removeFromQueuesMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {removeFromQueuesMutation.isPending ? "Removing…" : "Remove from queues"}
          </Button>
          
          <a
            href={generatePdfLink()}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center ${
              isMobile ? 'w-full text-center px-3 py-1.5 text-sm' : 'px-4 py-2'
            } bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition`}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            View PDF
          </a>
        </div>
      </div>

      {/* Edit Order Dialog */}
      <Dialog
        open={isOrderFormOpen}
        onOpenChange={(open) => {
          setIsOrderFormOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>Update the order details</DialogDescription>
          </DialogHeader>
          <OrderForm
            onSuccess={async () => {
              setIsOrderFormOpen(false);
              await refetch();
              toast({ title: "Order updated", description: "The order was updated successfully." });
            }}
            onCancel={() => setIsOrderFormOpen(false)}
            initialData={{
              orderNumber: order.orderNumber,
              tbfosNumber: order.tbfosNumber,
              client: order.client,
              dueDate: order.dueDate as any,
              totalQuantity: order.totalQuantity,
              description: order.description || "",
              notes: order.notes || "",
              pdfPrefix: (order as any).pdfPrefix || "",
            }}
            isEdit={true}
            orderId={order.id}
          />
        </DialogContent>
      </Dialog>
      
      {/* Order status section - improved for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <OrderStatusIndicator 
                status={order.isShipped ? "shipped" : "in_progress"} 
                showLabel={true} 
                size="lg"
              />
              {isOrderOverdue() && (
                <Badge variant="destructive" className="ml-2">
                  Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 items-center gap-4">
            <div className="h-16 w-16">
              <CircularProgressbar 
                value={calculateCompletion()} 
                text={`${calculateCompletion()}%`}
                styles={buildStyles({
                  pathColor: order.isShipped ? "#10b981" : "#2563eb",
                  textColor: order.isShipped ? "#10b981" : "#2563eb",
                  trailColor: "#e5e7eb"
                })}
              />
            </div>
            <div className="col-span-2">
              <p className="text-sm">Locations completed: 
                <span className="font-medium ml-1">
                  {order.locations.filter(loc => loc.status === "done").length}/{order.locations.length}
                </span>
              </p>
              <p className="text-sm">Units produced: 
                <span className="font-medium ml-1">
                  {order.locations.reduce((sum, loc) => sum + loc.completedQuantity, 0)}/{order.totalQuantity}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 text-sm gap-y-1">
              <p className="font-medium flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1 opacity-70" /> Due Date:
              </p>
              <p className="text-right">{formatDate(order.dueDate)}</p>
              
              <p className="font-medium flex items-center">
                <Clock className="h-3 w-3 mr-1 opacity-70" /> Created:
              </p>
              <p className="text-right">{formatDate(order.createdAt)}</p>
              
              <p className="font-medium flex items-center">
                <User className="h-3 w-3 mr-1 opacity-70" /> Created by:
              </p>
              <p className="text-right">{order.createdByUser?.username || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Production Locations - improved for mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Production Locations
            <span className="text-sm font-normal text-muted-foreground">
              Total Quantity: {order.totalQuantity}
            </span>
          </CardTitle>
          <CardDescription>Track production progress across all locations</CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            // Mobile view uses cards for each location
            <div className="space-y-4">
              {order.locations.map((orderLocation) => (
                <Card key={orderLocation.locationId} className={`overflow-hidden ${
                  expandedLocationId === orderLocation.locationId ? 'border-primary' : ''
                }`}>
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50"
                    onClick={() => toggleExpandLocation(orderLocation.locationId)}
                  >
                    <div className="flex items-center">
                      <OrderStatusIndicator 
                        status={orderLocation.status as any} 
                        queuePosition={orderLocation.queuePosition ?? undefined} 
                        showLabel={false} 
                        size="sm" 
                      />
                      <span className="ml-2 font-medium">{getLocationName(orderLocation.locationId)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm mr-3">{orderLocation.completedQuantity}/{order.totalQuantity}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className={`h-4 w-4 transition-transform ${
                          expandedLocationId === orderLocation.locationId ? 'transform rotate-180' : ''
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  
                  {expandedLocationId === orderLocation.locationId && (
                    <div className="px-4 pb-4 pt-2 border-t">
                      <div className="mb-2">
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <div className="flex items-center">
                          <OrderStatusIndicator 
                            status={orderLocation.status as any} 
                            queuePosition={orderLocation.queuePosition ?? undefined} 
                            showLabel={true} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between my-3 text-sm">
                        <span>Started: {formatDate(orderLocation.startedAt)}</span>
                        <span>Completed: {formatDate(orderLocation.completedAt)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {orderLocation.status === "in_queue" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartLocation(orderLocation.locationId)}
                            className="w-full"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        
                        {orderLocation.status === "in_progress" && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handlePauseLocation(orderLocation.locationId)}
                              className="w-full"
                            >
                              <PauseCircle className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default" 
                              onClick={() => handleFinishLocation(orderLocation.locationId)}
                              className="w-full"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}
                        
                        {orderLocation.status === "paused" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartLocation(orderLocation.locationId)}
                            className="w-full"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        
                        {(orderLocation.status === "in_progress" || orderLocation.status === "paused") && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleUpdateQuantity(orderLocation.locationId)}
                            className="w-full col-span-2"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Update Quantity
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRequestHelp(orderLocation.locationId)}
                          className="w-full col-span-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                        >
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Get Help
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            // Desktop view keeps the table layout
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.locations.map((orderLocation) => (
                    <TableRow key={orderLocation.locationId}>
                      <TableCell className="font-medium">{getLocationName(orderLocation.locationId)}</TableCell>
                      <TableCell>
                        <OrderStatusIndicator 
                          status={orderLocation.status as any} 
                          queuePosition={orderLocation.queuePosition ?? undefined} 
                        />
                      </TableCell>
                      <TableCell>{orderLocation.completedQuantity}/{order.totalQuantity}</TableCell>
                      <TableCell>{formatDate(orderLocation.startedAt)}</TableCell>
                      <TableCell>{formatDate(orderLocation.completedAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {orderLocation.status === "in_queue" && (
                              <DropdownMenuItem onClick={() => handleStartLocation(orderLocation.locationId)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Start
                              </DropdownMenuItem>
                            )}
                            
                            {orderLocation.status === "in_progress" && (
                              <>
                                <DropdownMenuItem onClick={() => handlePauseLocation(orderLocation.locationId)}>
                                  <PauseCircle className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFinishLocation(orderLocation.locationId)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {orderLocation.status === "paused" && (
                              <DropdownMenuItem onClick={() => handleStartLocation(orderLocation.locationId)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            
                            {(orderLocation.status === "in_progress" || orderLocation.status === "paused") && (
                              <DropdownMenuItem onClick={() => handleUpdateQuantity(orderLocation.locationId)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Update Quantity
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem onClick={() => handleRequestHelp(orderLocation.locationId)}>
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Request Help
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Shipping Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Shipping Information</CardTitle>
          <CardDescription>Current shipping status and history</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Shipping Status</h3>
              <div className="flex items-center">
                {order.isShipped ? (
                  <Badge className="text-sm sm:text-base py-1 px-2 sm:px-3 bg-green-500 text-white">Fully Shipped</Badge>
                ) : order.partiallyShipped ? (
                  <Badge variant="secondary" className="text-sm sm:text-base py-1 px-2 sm:px-3">Partially Shipped</Badge>
                ) : order.isFinished ? (
                  <Badge variant="default" className="text-sm sm:text-base py-1 px-2 sm:px-3">Ready to Ship</Badge>
                ) : (
                  <Badge variant="outline" className="text-sm sm:text-base py-1 px-2 sm:px-3">Not Ready</Badge>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Shipped Quantity</h3>
              <p className="text-base sm:text-lg font-medium">{order.shippedQuantity}/{order.totalQuantity}</p>
              {!order.isShipped && (
                <Button 
                  onClick={handleShip} 
                  className="mt-2 text-xs sm:text-sm"
                  size={isMobile ? "sm" : "default"}
                  disabled={shipMutation.isPending}
                  variant={order.isFinished ? "default" : "outline"}
                >
                  <Truck className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
                  {shipMutation.isPending ? "Processing..." : order.shippedQuantity > 0 ? "Ship More" : "Ship"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Trail */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Audit Trail</CardTitle>
          <CardDescription>History of actions performed on this order</CardDescription>
          {isMobile && order.auditTrail && order.auditTrail.length > 5 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => navigate(`/audit-trail-page?orderId=${orderId}`)}
            >
              View Full History
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {order.auditTrail && order.auditTrail.length > 0 ? (
              (isMobile ? order.auditTrail.slice(0, 5) : order.auditTrail).map((audit) => (
                <div key={audit.id} className="flex items-start pb-3 sm:pb-4 border-b border-gray-100 last:border-0">
                  <div className="bg-gray-100 rounded-full p-1.5 sm:p-2 mr-2 sm:mr-3 flex-shrink-0">
                    {audit.action === "created" && <Plus className="h-4 w-4" />}
                    {audit.action === "updated" && <Edit3 className="h-4 w-4" />}
                    {audit.action === "started" && <Clock className="h-4 w-4" />}
                    {audit.action === "finished" && <CheckCircle className="h-4 w-4" />}
                    {audit.action === "paused" && <PauseCircle className="h-4 w-4" />}
                    {audit.action === "updated_quantity" && <Edit3 className="h-4 w-4" />}
                    {audit.action === "shipped" && <Truck className="h-4 w-4" />}
                    {audit.action === "help_requested" && <HelpCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {audit.action === "created" && "Order created"}
                      {audit.action === "updated" && "Order updated"}
                      {audit.action === "started" && `${getLocationName(audit.locationId || 0)} started`}
                      {audit.action === "finished" && `${getLocationName(audit.locationId || 0)} completed`}
                      {audit.action === "paused" && `${getLocationName(audit.locationId || 0)} paused`}
                      {audit.action === "updated_quantity" && `Quantity updated at ${getLocationName(audit.locationId || 0)}`}
                      {audit.action === "shipped" && "Order shipped"}
                      {audit.action === "help_requested" && `Help requested at ${getLocationName(audit.locationId || 0)}`}
                      {audit.userId && ` by ${formatUsername(audit)}`}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formatDate(audit.createdAt)}</span>
                    </div>
                    {audit.details && <p className="text-sm mt-1 break-words">{audit.details}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No audit trail available</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Quantity Update Dialog */}
      <QuantityUpdateDialog
        isOpen={isQuantityDialogOpen}
        onClose={() => setIsQuantityDialogOpen(false)}
        onSubmit={
          quantityDialogPurpose === 'update' 
            ? handleUpdateQuantitySubmit 
            : handleFinishQuantitySubmit
        }
        currentQuantity={getCurrentQuantity()}
        maxQuantity={order?.totalQuantity || 0}
        title={
          quantityDialogPurpose === 'update' 
            ? "Update Completed Quantity" 
            : "Complete Location"
        }
        description={
          quantityDialogPurpose === 'update'
            ? "Enter the new completed quantity for this location"
            : "Enter the final completed quantity for this location"
        }
        confirmText={
          quantityDialogPurpose === 'update' ? "Update" : "Complete"
        }
      />
      
      {/* Ship Dialog */}
      <QuantityUpdateDialog
        isOpen={isShipDialogOpen}
        onClose={() => setIsShipDialogOpen(false)}
        onSubmit={handleShipSubmit}
        currentQuantity={0}
        maxQuantity={(order?.totalQuantity || 0) - (order?.shippedQuantity || 0)}
        title="Ship Order"
        description="Enter the quantity to ship"
        confirmText="Ship"
      />
      
      {/* Help Request Dialog */}
      <HelpRequestDialog
        isOpen={isHelpDialogOpen}
        onClose={() => setIsHelpDialogOpen(false)}
        onSubmit={handleHelpRequestSubmit}
        location={getSelectedLocationName()}
        orderNumber={order?.orderNumber || ""}
      />
    </div>
  );
}
