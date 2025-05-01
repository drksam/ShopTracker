import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Order, OrderWithLocations, Location } from "@shared/schema";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OrderForm from "@/components/orders/order-form";
import OrderStatusIndicator from "@/components/orders/order-status-indicator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Eye,
  Clock,
  ClipboardList,
  Truck,
  FileCheck,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeShipped, setIncludeShipped] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Order>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery<OrderWithLocations[], Error>({
    queryKey: ["/api/orders", includeShipped],
    queryFn: async ({ queryKey }) => {
      const includeShippedParam = queryKey[1];
      const res = await fetch(`/api/orders?includeShipped=${includeShippedParam}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
  });

  // Handle search
  const filteredOrders = orders
    ? orders.filter((order) => {
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.tbfosNumber.toLowerCase().includes(searchLower) ||
          order.client.toLowerCase().includes(searchLower) ||
          (order.description && order.description.toLowerCase().includes(searchLower))
        );
      })
    : [];

  // Sort orders
  const sortedOrders = [...(filteredOrders || [])].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle specific fields that need special comparison
    if (sortField === "dueDate") {
      aValue = new Date(a.dueDate).getTime();
      bValue = new Date(b.dueDate).getTime();
    }

    if (aValue === bValue) return 0;
    
    const direction = sortDirection === "asc" ? 1 : -1;
    
    if (aValue === null) return 1 * direction;
    if (bValue === null) return -1 * direction;
    
    return aValue < bValue ? -1 * direction : 1 * direction;
  });

  // Handle sorting
  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle shipping
  const handleShip = async (orderId: number) => {
    try {
      // Get the order to check total quantity
      const order = orders?.find(o => o.id === orderId);
      if (!order) return;
      
      // Prompt for quantity to ship
      const quantity = prompt(
        `Enter quantity to ship (max: ${order.totalQuantity}):`,
        order.totalQuantity.toString()
      );
      
      if (quantity === null) return;
      
      const parsedQuantity = parseInt(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > order.totalQuantity) {
        toast({
          title: "Invalid quantity",
          description: "Please enter a valid quantity",
          variant: "destructive",
        });
        return;
      }
      
      await apiRequest("POST", `/api/orders/${orderId}/ship`, { quantity: parsedQuantity });
      
      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: "Order Shipped",
        description: `${parsedQuantity} units of order ${order.orderNumber} have been shipped.`,
      });
    } catch (error) {
      console.error("Error shipping order:", error);
      toast({
        title: "Error",
        description: "Failed to ship order. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if order is overdue
  const isOrderOverdue = (order: Order) => {
    const dueDate = new Date(order.dueDate);
    const today = new Date();
    return dueDate < today && !order.isShipped;
  };

  // Determine if an order is ready to ship
  const isOrderReadyToShip = (order: OrderWithLocations) => {
    if (order.isShipped) return false;
    
    // Only consider locations that are actually used for this order
    const usedLocations = order.locations.filter(loc => loc.locationId > 0);
    
    // If no locations are assigned, it can't be ready to ship
    if (usedLocations.length === 0) return false;
    
    // Check if all locations are either done or in progress with quantity completed
    const allLocationsProcessed = usedLocations.every(
      loc => loc.status === "done" || (loc.status === "in_progress" && loc.completedQuantity > 0)
    );
    
    // Check if at least one location is done
    const someLocationsDone = usedLocations.some(loc => loc.status === "done");
    
    return allLocationsProcessed && someLocationsDone;
  };

  // Get order row background color
  const getOrderRowClass = (order: OrderWithLocations) => {
    if (isOrderOverdue(order)) return "bg-red-50";
    
    // Check predominant status
    const inProgress = order.locations.some(loc => loc.status === "in_progress");
    const inQueue = order.locations.some(loc => loc.status === "in_queue");
    const paused = order.locations.some(loc => loc.status === "paused");
    
    if (inProgress) return "bg-green-50";
    if (paused) return "bg-yellow-50";
    if (inQueue) return "bg-blue-50";
    
    return "";
  };

  // Calculate completion percentage for an order
  const calculateCompletion = (order: OrderWithLocations) => {
    // Filter to only use valid locations (locationId > 0)
    const validLocations = order.locations.filter(loc => loc.locationId > 0);
    
    // Get the sum of completed quantities across all valid locations
    const completedCount = validLocations.reduce((sum, loc) => sum + loc.completedQuantity, 0);
    
    // Get the total count needed for all valid locations
    const totalLocationsCount = validLocations.length;
    
    // Calculate the percentage
    return totalLocationsCount > 0
      ? Math.min(100, Math.round((completedCount / (order.totalQuantity * totalLocationsCount)) * 100))
      : 0;
  };

  // Render loading skeleton
  if (isLoadingOrders || isLoadingLocations) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Skeleton className="h-8 w-64 mb-4 md:mb-0" />
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Skeleton className="h-10 w-64 sm:w-80" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        <Skeleton className="h-12 w-full mb-4" />
        
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Order Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 w-full sm:w-80"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          
          <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" /> New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
                <DialogDescription>
                  Add a new order to the workshop management system
                </DialogDescription>
              </DialogHeader>
              <OrderForm 
                onSuccess={() => setIsOrderFormOpen(false)} 
                onCancel={() => setIsOrderFormOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Status Legend */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-4 py-3">
          <div className="text-sm font-medium">Status:</div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-sm">In Progress</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-sm">In Queue</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
            <span className="text-sm">Paused</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            <span className="text-sm">Overdue</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
            <span className="text-sm">Not Available</span>
          </div>
          
          <div className="ml-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIncludeShipped(!includeShipped)}
            >
              {includeShipped ? "Hide Shipped" : "Show Shipped"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("orderNumber")}
                  >
                    <div className="flex items-center">
                      Order # <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center">
                      Client <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("tbfosNumber")}
                  >
                    <div className="flex items-center">
                      TBFOS # <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center">
                      Due Date <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Quantity</TableHead>
                  
                  {/* Render location columns based on fetched locations */}
                  {locations?.map((location) => (
                    <TableHead key={location.id}>{location.name}</TableHead>
                  ))}
                  
                  <TableHead>Shipping</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8 + (locations?.length || 0)} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-neutral-500">
                        <ClipboardList className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-medium mb-1">No Orders Found</h3>
                        <p className="text-sm">
                          {searchQuery 
                            ? "No orders match your search criteria" 
                            : "Start by creating your first order"}
                        </p>
                        {!searchQuery && (
                          <Button 
                            onClick={() => setIsOrderFormOpen(true)} 
                            className="mt-4"
                          >
                            <Plus className="mr-1 h-4 w-4" /> Create Order
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className={getOrderRowClass(order)}
                    >
                      <TableCell className="font-medium">
                        <Link href={`/orders/${order.id}`}>
                          <a className="text-primary hover:underline">{order.orderNumber}</a>
                        </Link>
                      </TableCell>
                      <TableCell>{order.client}</TableCell>
                      <TableCell>{order.tbfosNumber}</TableCell>
                      <TableCell className={isOrderOverdue(order) ? "text-red-500 font-medium" : ""}>
                        {new Date(order.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div style={{ width: 60, height: 60 }}>
                            <CircularProgressbar
                              value={calculateCompletion(order)}
                              text={`${calculateCompletion(order)}%`}
                              styles={buildStyles({
                                pathColor: order.isShipped 
                                  ? "#4caf50" 
                                  : isOrderOverdue(order) 
                                    ? "#f44336" 
                                    : "#1976d2",
                                textSize: '32px',
                                textColor: order.isShipped 
                                  ? "#4caf50" 
                                  : isOrderOverdue(order) 
                                    ? "#f44336" 
                                    : "#1976d2",
                                trailColor: "#e0e0e0",
                              })}
                            />
                          </div>
                          <span className="ml-2 text-sm">
                            {order.shippedQuantity > 0 ? `${order.shippedQuantity}/` : ""}
                            {order.totalQuantity}
                          </span>
                        </div>
                      </TableCell>
                      
                      {/* Location status cells */}
                      {locations?.map((location) => {
                        const orderLocation = order.locations.find(
                          (ol) => ol.locationId === location.id
                        );
                        
                        // Don't show empty locations that have no data
                        if (!orderLocation) {
                          return (
                            <TableCell key={`${order.id}-${location.id}`} className="text-center text-gray-300">
                              -
                            </TableCell>
                          );
                        }
                        
                        return (
                          <TableCell key={`${order.id}-${location.id}`}>
                            <OrderStatusIndicator
                              status={orderLocation.status}
                              queuePosition={orderLocation.queuePosition}
                            />
                          </TableCell>
                        );
                      })}
                      
                      {/* Shipping status */}
                      <TableCell>
                        {order.isShipped ? (
                          <Badge className="bg-green-500 text-white whitespace-nowrap">Fully Shipped</Badge>
                        ) : order.partiallyShipped ? (
                          <Badge variant="secondary" className="whitespace-nowrap">Partially Shipped</Badge>
                        ) : isOrderReadyToShip(order) ? (
                          <Button 
                            onClick={() => handleShip(order.id)}
                            className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap"
                            size="sm"
                          >
                            Ship
                          </Button>
                        ) : (
                          <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
                            <span className="text-sm">Not Ready</span>
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/orders/${order.id}`)}
                            title="View Order"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
      
      {/* Order Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <h3 className="text-2xl font-bold mt-1">{orders?.length || 0}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <h3 className="text-2xl font-bold mt-1">
                  {orders?.filter(order => 
                    order.locations.some(loc => loc.status === "in_progress")
                  ).length || 0}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ready to Ship</p>
                <h3 className="text-2xl font-bold mt-1">
                  {orders?.filter(order => isOrderReadyToShip(order)).length || 0}
                </h3>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <h3 className="text-2xl font-bold mt-1 text-red-500">
                  {orders?.filter(order => isOrderOverdue(order)).length || 0}
                </h3>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <FileCheck className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
