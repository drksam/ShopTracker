import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Order, OrderWithLocations } from "@shared/schema";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  Card,
  CardContent,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  ClipboardList,
  ArrowUpDown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

export default function OrdersPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeShipped, setIncludeShipped] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [sortField, setSortField] = useState<keyof Order>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch orders
  const {
    data: orders,
    isLoading,
    refetch,
  } = useQuery<OrderWithLocations[], Error>({
    queryKey: ["/api/orders", includeShipped],
    queryFn: async ({ queryKey }) => {
      const includeShippedParam = queryKey[1];
      const res = await fetch(`/api/orders?includeShipped=${includeShippedParam}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
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

  // Handle order deletion
  const handleDeleteOrder = async (orderId: number) => {
    try {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
      
      // Refresh orders list
      refetch();
      
      toast({
        title: "Order Deleted",
        description: "The order has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit order
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsOrderFormOpen(true);
  };

  // Calculate completion percentage for an order
  const calculateCompletion = (order: OrderWithLocations) => {
    // Get the sum of completed quantities across all locations
    const completedCount = order.locations.reduce((sum, loc) => sum + loc.completedQuantity, 0);
    
    // Get the total count needed for all locations
    const totalLocationsCount = order.locations.length;
    
    // Calculate the percentage
    return totalLocationsCount > 0
      ? Math.min(100, Math.round((completedCount / (order.totalQuantity * totalLocationsCount)) * 100))
      : 0;
  };
  
  // Check if order is overdue
  const isOrderOverdue = (order: Order) => {
    const dueDate = new Date(order.dueDate);
    const today = new Date();
    return dueDate < today && !order.isShipped;
  };

  // Order form success handler
  const handleOrderFormSuccess = (order: Order) => {
    setIsOrderFormOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Skeleton className="h-8 w-64 mb-4 md:mb-0" />
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Skeleton className="h-10 w-64 sm:w-80" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        <Card>
          <CardContent className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Orders</h1>
        
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
          
          <Dialog 
            open={isOrderFormOpen} 
            onOpenChange={(open) => {
              setIsOrderFormOpen(open);
              if (!open) setEditingOrder(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" /> New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOrder ? "Edit Order" : "Create New Order"}
                </DialogTitle>
                <DialogDescription>
                  {editingOrder 
                    ? "Update the order details in the workshop management system" 
                    : "Add a new order to the workshop management system"}
                </DialogDescription>
              </DialogHeader>
              <OrderForm 
                onSuccess={handleOrderFormSuccess} 
                onCancel={() => {
                  setIsOrderFormOpen(false);
                  setEditingOrder(null);
                }} 
                initialData={editingOrder || undefined}
                isEdit={!!editingOrder}
                orderId={editingOrder?.id}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center">
            <CardTitle>Order List</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIncludeShipped(!includeShipped)}
            >
              {includeShipped ? "Hide Shipped" : "Show Shipped"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-6">
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
                      className={isOrderOverdue(order) ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          {order.orderNumber}
                        </Button>
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
                      <TableCell>
                        {order.isShipped ? (
                          <Badge variant="success">Fully Shipped</Badge>
                        ) : order.partiallyShipped ? (
                          <Badge variant="secondary">Partially Shipped</Badge>
                        ) : order.isFinished ? (
                          <Badge variant="default">Ready to Ship</Badge>
                        ) : isOrderOverdue(order) ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditOrder(order)}
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Order"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete order <strong>{order.orderNumber}</strong>? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
    </div>
  );
}
