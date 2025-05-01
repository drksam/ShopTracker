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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import OrderForm from "@/components/orders/order-form";

interface OrderDetailPageProps {
  orderId: number;
}

export default function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

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
    
    // Ask for quantity to ship
    const quantity = prompt(
      `Enter quantity to ship (max: ${order.totalQuantity}, current shipped: ${order.shippedQuantity}):`,
      (order.totalQuantity - order.shippedQuantity).toString()
    );
    
    if (quantity === null) return;
    
    const parsedQuantity = parseInt(quantity);
    
    // Validate quantity
    if (isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > order.totalQuantity) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    
    // Check if trying to ship more than available
    if (parsedQuantity + order.shippedQuantity > order.totalQuantity) {
      toast({
        title: "Quantity Exceeds Total",
        description: `You can ship at most ${order.totalQuantity - order.shippedQuantity} more units`,
        variant: "destructive",
      });
      return;
    }
    
    shipMutation.mutate(order.shippedQuantity + parsedQuantity);
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
    
    const orderLocation = order.locations.find(loc => loc.locationId === locationId);
    if (!orderLocation) return;
    
    // Ask for completed quantity if not already set
    const quantity = prompt(
      `Enter completed quantity (current: ${orderLocation.completedQuantity}, total: ${order.totalQuantity}):`,
      order.totalQuantity.toString()
    );
    
    if (quantity === null) return;
    
    const parsedQuantity = parseInt(quantity);
    
    // Validate quantity
    if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > order.totalQuantity) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    
    finishLocationMutation.mutate({ locationId, quantity: parsedQuantity });
  };

  const handlePauseLocation = (locationId: number) => {
    pauseLocationMutation.mutate(locationId);
  };

  const handleUpdateQuantity = (locationId: number) => {
    if (!order) return;
    
    const orderLocation = order.locations.find(loc => loc.locationId === locationId);
    if (!orderLocation) return;
    
    // Ask for new quantity
    const quantity = prompt(
      `Enter new completed quantity (current: ${orderLocation.completedQuantity}, total: ${order.totalQuantity}):`,
      orderLocation.completedQuantity.toString()
    );
    
    if (quantity === null) return;
    
    const parsedQuantity = parseInt(quantity);
    
    // Validate quantity
    if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > order.totalQuantity) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    
    updateQuantityMutation.mutate({ locationId, quantity: parsedQuantity });
  };

  const handleRequestHelp = (locationId: number) => {
    const notes = prompt("Enter details about the help needed:");
    helpRequestMutation.mutate({ locationId, notes: notes || undefined });
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
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-4">The requested order could not be found.</p>
        <Button onClick={() => navigate("/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/orders")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-500">Created on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Order</DialogTitle>
                <DialogDescription>
                  Update the order details in the workshop management system
                </DialogDescription>
              </DialogHeader>
              <OrderForm 
                onSuccess={handleOrderFormSuccess} 
                onCancel={() => setIsOrderFormOpen(false)} 
                initialData={order}
                isEdit={true}
                orderId={order.id}
              />
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={handleShip} 
            disabled={shipMutation.isPending}
            variant={order.isFinished ? "default" : "outline"}
            className={order.isFinished ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Truck className="mr-2 h-4 w-4" />
            {shipMutation.isPending ? "Processing..." : "Ship"}
          </Button>
        </div>
      </div>
      
      {/* Order details */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Client</h3>
              <p className="font-medium">{order.client}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">TBFOS #</h3>
              <p className="font-medium">{order.tbfosNumber}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
              <p className={`font-medium ${isOrderOverdue() ? "text-red-500" : ""}`}>
                {new Date(order.dueDate).toLocaleDateString()}
                {isOrderOverdue() && !order.isShipped && (
                  <Badge variant="destructive" className="ml-2">Overdue</Badge>
                )}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Quantity</h3>
              <div className="flex items-center">
                <div style={{ width: 60, height: 60 }}>
                  <CircularProgressbar
                    value={calculateCompletion()}
                    text={`${calculateCompletion()}%`}
                    styles={buildStyles({
                      pathColor: order.isShipped 
                        ? "#4caf50" 
                        : isOrderOverdue() 
                          ? "#f44336" 
                          : "#1976d2",
                      textSize: '32px',
                      textColor: order.isShipped 
                        ? "#4caf50" 
                        : isOrderOverdue() 
                          ? "#f44336" 
                          : "#1976d2",
                      trailColor: "#e0e0e0",
                    })}
                  />
                </div>
                <div className="ml-4">
                  <p className="font-medium">
                    {order.shippedQuantity > 0 ? `${order.shippedQuantity}/` : ""}
                    {order.totalQuantity} Units
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.isShipped 
                      ? "Fully Shipped" 
                      : order.partiallyShipped 
                        ? "Partially Shipped" 
                        : order.isFinished 
                          ? "Ready to Ship" 
                          : "In Progress"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Order Documentation</h3>
              <a
                href={generatePdfLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center hover:underline"
              >
                <FileCheck className="mr-2 h-4 w-4" />
                View {order.tbfosNumber}.pdf
              </a>
            </div>
          </div>
          
          {order.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p>{order.description}</p>
            </div>
          )}
          
          {order.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
              <p>{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Tracking</CardTitle>
          <CardDescription>Track the order's status at each location</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
                {order.locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No locations assigned to this order
                    </TableCell>
                  </TableRow>
                ) : (
                  // Sort locations by used order and filter out any invalid locations
                  [...order.locations]
                  .filter(loc => loc.locationId > 0) // Filter out any unused locations
                  .sort((a, b) => {
                    const locA = locations?.find(l => l.id === a.locationId);
                    const locB = locations?.find(l => l.id === b.locationId);
                    return (locA?.usedOrder || 0) - (locB?.usedOrder || 0);
                  }).map((orderLocation) => (
                    <TableRow key={orderLocation.id}>
                      <TableCell className="font-medium">
                        {getLocationName(orderLocation.locationId)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <OrderStatusIndicator
                            status={orderLocation.status}
                            queuePosition={orderLocation.queuePosition}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {orderLocation.completedQuantity}/{order.totalQuantity}
                      </TableCell>
                      <TableCell>
                        {orderLocation.startedAt 
                          ? formatDate(orderLocation.startedAt) 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {orderLocation.completedAt 
                          ? formatDate(orderLocation.completedAt) 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {orderLocation.status === "not_started" || orderLocation.status === "in_queue" ? (
                            <Button
                              size="sm"
                              onClick={() => handleStartLocation(orderLocation.locationId)}
                              disabled={startLocationMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <Clock className="mr-1 h-3 w-3" /> Start
                            </Button>
                          ) : orderLocation.status === "in_progress" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePauseLocation(orderLocation.locationId)}
                                disabled={pauseLocationMutation.isPending}
                              >
                                <PauseCircle className="mr-1 h-3 w-3" /> Pause
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleFinishLocation(orderLocation.locationId)}
                                disabled={finishLocationMutation.isPending}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" /> Complete
                              </Button>
                            </>
                          ) : orderLocation.status === "paused" ? (
                            <Button
                              size="sm"
                              onClick={() => handleStartLocation(orderLocation.locationId)}
                              disabled={startLocationMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Resume
                            </Button>
                          ) : null}
                          
                          {(orderLocation.status === "in_progress" || orderLocation.status === "paused") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(orderLocation.locationId)}
                              disabled={updateQuantityMutation.isPending}
                            >
                              <Edit3 className="mr-1 h-3 w-3" /> Update
                            </Button>
                          )}
                          
                          {(orderLocation.status === "in_progress" || orderLocation.status === "paused") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestHelp(orderLocation.locationId)}
                              disabled={helpRequestMutation.isPending}
                              className="text-red-500 border-red-500 hover:bg-red-50"
                            >
                              <HelpCircle className="mr-1 h-3 w-3" /> Help
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
          <CardDescription>Current shipping status and history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping Status</h3>
              <div className="flex items-center">
                {order.isShipped ? (
                  <Badge className="text-base py-1 px-3 bg-green-500 text-white">Fully Shipped</Badge>
                ) : order.partiallyShipped ? (
                  <Badge variant="secondary" className="text-base py-1 px-3">Partially Shipped</Badge>
                ) : order.isFinished ? (
                  <Badge variant="default" className="text-base py-1 px-3">Ready to Ship</Badge>
                ) : (
                  <Badge variant="outline" className="text-base py-1 px-3">Not Ready</Badge>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Shipped Quantity</h3>
              <p className="text-lg font-medium">{order.shippedQuantity}/{order.totalQuantity}</p>
              {!order.isShipped && (
                <Button 
                  onClick={handleShip} 
                  className="mt-2"
                  disabled={shipMutation.isPending}
                  variant={order.isFinished ? "default" : "outline"}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  {shipMutation.isPending ? "Processing..." : order.shippedQuantity > 0 ? "Ship More" : "Ship"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>History of actions performed on this order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.auditTrail && order.auditTrail.length > 0 ? (
              order.auditTrail.map((audit) => (
                <div key={audit.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0">
                  <div className="bg-gray-100 rounded-full p-2 mr-3">
                    {audit.action === "created" && <Plus className="h-5 w-5" />}
                    {audit.action === "updated" && <Edit3 className="h-5 w-5" />}
                    {audit.action === "started" && <Clock className="h-5 w-5" />}
                    {audit.action === "finished" && <CheckCircle className="h-5 w-5" />}
                    {audit.action === "paused" && <PauseCircle className="h-5 w-5" />}
                    {audit.action === "updated_quantity" && <Edit3 className="h-5 w-5" />}
                    {audit.action === "shipped" && <Truck className="h-5 w-5" />}
                    {audit.action === "help_requested" && <HelpCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">
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
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {formatDate(audit.createdAt)}
                    </div>
                    {audit.details && <p className="text-sm mt-1">{audit.details}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No audit trail available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
