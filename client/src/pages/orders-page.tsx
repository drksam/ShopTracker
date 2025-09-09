import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Order, OrderWithLocations } from "@shared/schema";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OrderForm from "@/components/orders/order-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { useQueryError, useMutationError } from "@/hooks/use-query-error";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  ClipboardList,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  PackageX,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Pagination } from "@/components/ui/pagination";

interface PaginatedOrdersResponse {
  data: OrderWithLocations[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function OrdersPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeShipped, setIncludeShipped] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [sortField, setSortField] = useState<keyof Order>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch orders with pagination
  const ordersQuery = useQuery<PaginatedOrdersResponse, Error>({
    queryKey: [
      "/api/orders", 
      includeShipped, 
      currentPage, 
      pageSize, 
      debouncedSearchQuery
    ],
    queryFn: async ({ queryKey }) => {
      const [_, includeShippedParam, page, size, q] = queryKey as [string, boolean, number, number, string];

      const includeStr = String(includeShippedParam);
      const pageStr = String(page);
      const sizeStr = String(size);
      const query = (q || "").trim();

      // If we have a search query, use the search API
      if (query.length > 0) {
        setIsSearching(true);
        const params = new URLSearchParams({
          q: query,
          includeShipped: includeStr,
          page: pageStr,
          pageSize: sizeStr,
        });
        const res = await apiRequest("GET", `/api/orders/search?${params.toString()}`);
        setIsSearching(false);
        return await res.json();
      }

      // Otherwise use the regular orders API
      const params = new URLSearchParams({
        includeShipped: includeStr,
        page: pageStr,
        pageSize: sizeStr,
      });
      const res = await apiRequest("GET", `/api/orders?${params.toString()}`);
      return await res.json();
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      setDeletingId(orderId);
      await apiRequest("DELETE", `/api/orders/${orderId}`);
      setDeletingId(null);
      return orderId;
    },
    onSuccess: (orderId) => {
      // Refresh orders list
      ordersQuery.refetch();
      
      toast({
        title: "Order Deleted",
        description: "The order has been successfully deleted.",
      });
    }
  });

  // Get error states using our custom hooks
  const { error: ordersError, clearError: clearOrdersError } = useQueryError(ordersQuery);
  const { error: deleteError, clearError: clearDeleteError } = useMutationError(deleteOrderMutation);

  // Rush-first overlay sort, then user-selected sort
  const sortedOrders = [...(ordersQuery.data?.data || [])]
    .sort((a, b) => {
      // Primary rush precedence
      if (a.rush && !b.rush) return -1;
      if (!a.rush && b.rush) return 1;
      if (a.rush && b.rush) {
        const ar = a.rushSetAt ? new Date(a.rushSetAt as any).getTime() : 0;
        const br = b.rushSetAt ? new Date(b.rushSetAt as any).getTime() : 0;
        if (ar !== br) return ar - br;
      }
      // Secondary by globalQueuePosition if present
      const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      if (ag !== bg) return ag - bg;
      return 0; // Preserve original order before next sort pass
    })
    .sort((a, b) => {
      // User chosen sort field/direction applied after rush/global precedence grouping
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
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
    deleteOrderMutation.mutate(orderId);
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

  // Determine overall production status across locations
  const getOverallProductionStatus = (order: OrderWithLocations) => {
    const locs = order.locations || [];
    const hasInProgress = locs.some(l => l.status === "in_progress");
    const hasPaused = locs.some(l => l.status === "paused");
    const hasInQueue = locs.some(l => l.status === "in_queue");
    if (hasInProgress || hasPaused) return "in_progress" as const;
    if (hasInQueue) return "in_queue" as const;
    return null;
  };

  // Order form success handler
  const handleOrderFormSuccess = (order: Order) => {
    setIsOrderFormOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to page 1 when changing page size
  };

  // Handle include shipped toggle
  const toggleIncludeShipped = () => {
    setIncludeShipped(!includeShipped);
    setCurrentPage(1); // Reset to page 1 when changing filter
  };

  // Render order actions based on device
  const renderOrderActions = (order: OrderWithLocations) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditOrder(order)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem 
                onClick={() => {
                  // Using DialogTrigger doesn't work well in DropdownMenuItems
                  // For mobile, we'll use a simpler confirmation
                  if (window.confirm(`Are you sure you want to delete order ${order.orderNumber}? This cannot be undone.`)) {
                    handleDeleteOrder(order.id);
                  }
                }}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
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
                  disabled={deletingId === order.id}
                >
                  {deletingId === order.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  };

  // Render loading skeleton
  if (ordersQuery.isLoading) {
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
        <h1 className="text-2xl font-bold mb-3 md:mb-0">Orders</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 w-full"
            />
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            )}
          </div>
          
          <Button
            className="flex items-center min-w-[120px]"
            onClick={() => {
              setEditingOrder(null);
              setIsOrderFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Button>

          <Dialog
            open={isOrderFormOpen}
            onOpenChange={(open) => {
              setIsOrderFormOpen(open);
              if (!open) setEditingOrder(null);
            }}
          >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Error Messages */}
      {ordersError && (
        <ErrorMessage
          title={ordersError.title}
          message={ordersError.message}
          details={ordersError.details}
          severity={ordersError.severity}
          onRetry={() => ordersQuery.refetch()}
          onDismiss={clearOrdersError}
          showDismiss={true}
        />
      )}

      {deleteError && (
        <ErrorMessage
          title={deleteError.title}
          message={deleteError.message}
          details={deleteError.details}
          severity="error"
          onDismiss={clearDeleteError}
          showDismiss={true}
        />
      )}
      
      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center">
              <CardTitle>Order List</CardTitle>
              {ordersQuery.isFetching && !ordersQuery.isLoading && (
                <div className="ml-2 text-blue-500 flex items-center">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  <span className="text-xs">Refreshing...</span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              onClick={toggleIncludeShipped}
              className="self-start sm:self-auto"
            >
              {includeShipped ? "Hide Shipped" : "Show Shipped"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4 md:pt-6">
          {isMobile ? (
            // Mobile card view
            <div className="px-3 pb-4 space-y-3">
              {sortedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-neutral-500 py-6">
                  {debouncedSearchQuery ? (
                    <>
                      <PackageX className="h-12 w-12 mb-2 text-gray-400" />
                      <h3 className="text-lg font-medium mb-1">No Orders Found</h3>
                      <p className="text-sm text-center px-4">
                        No orders match your search criteria
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery('')}
                        className="mt-3"
                        size="sm"
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-12 w-12 mb-2" />
                      <h3 className="text-lg font-medium mb-1">No Orders Found</h3>
                      <p className="text-sm text-center px-4">
                        Start by creating your first order
                      </p>
                      <Button 
                        onClick={() => setIsOrderFormOpen(true)} 
                        className="mt-3"
                        size="sm"
                      >
                        <Plus className="mr-1 h-4 w-4" /> Create Order
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                sortedOrders.map((order) => (
                  <Card 
                    key={order.id}
                    className={`overflow-hidden ${isOrderOverdue(order) ? "border-red-300" : ""}`}
                  >
                    <CardHeader className={`py-3 px-4 ${isOrderOverdue(order) ? "bg-red-50" : ""}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-lg"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            {order.orderNumber}
                          </Button>
                          <p className="text-sm text-gray-500">{order.client}</p>
                        </div>
                        <div>
                          {renderOrderActions(order)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 py-3 px-4">
                      <div>
                        <p className="text-xs text-gray-500">TBFOS #</p>
                        <p>{order.tbfosNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className={isOrderOverdue(order) ? "text-red-500 font-medium" : ""}>
                          {new Date(order.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p>
                          {order.shippedQuantity > 0 ? `${order.shippedQuantity}/` : ""}
                          {order.totalQuantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <div>
                          {order.isShipped ? (
                            <Badge variant="default">Fully Shipped</Badge>
                          ) : order.partiallyShipped ? (
                            <Badge variant="secondary">Partial</Badge>
                          ) : order.isFinished ? (
                            <Badge variant="default">Ready</Badge>
                          ) : isOrderOverdue(order) ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : getOverallProductionStatus(order) === "in_queue" ? (
                            <Badge variant="outline">In Queue</Badge>
                          ) : getOverallProductionStatus(order) === "in_progress" ? (
                            <Badge variant="outline">In Progress</Badge>
                          ) : (
                            <Badge variant="outline">Not Started</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 py-2 px-4 flex justify-center">
                      <div className="flex items-center">
                        <div style={{ width: 40, height: 40 }}>
                          <CircularProgressbar
                            value={calculateCompletion(order)}
                            text={`${calculateCompletion(order)}%`}
                            styles={buildStyles({
                              textSize: '28px',
                              pathColor: order.isShipped 
                                ? "#4caf50" 
                                : isOrderOverdue(order)
                                  ? "#f44336" 
                                  : "#1976d2",
                              textColor: order.isShipped 
                                ? "#4caf50" 
                                : isOrderOverdue(order)
                                  ? "#f44336" 
                                  : "#1976d2",
                              trailColor: "#e0e0e0",
                            })}
                          />
                        </div>
                        <span className="ml-2 text-sm">Completion</span>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Desktop table view
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
                          {debouncedSearchQuery ? (
                            <>
                              <PackageX className="h-12 w-12 mb-2 text-gray-400" />
                              <h3 className="text-lg font-medium mb-1">No Orders Found</h3>
                              <p className="text-sm">
                                No orders match your search criteria
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setSearchQuery('')}
                                className="mt-4"
                              >
                                Clear Search
                              </Button>
                            </>
                          ) : (
                            <>
                              <ClipboardList className="h-12 w-12 mb-2" />
                              <h3 className="text-lg font-medium mb-1">No Orders Found</h3>
                              <p className="text-sm">
                                Start by creating your first order
                              </p>
                              <Button 
                                onClick={() => setIsOrderFormOpen(true)} 
                                className="mt-4"
                              >
                                <Plus className="mr-1 h-4 w-4" /> Create Order
                              </Button>
                            </>
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
                            <Badge variant="default">Fully Shipped</Badge>
                          ) : order.partiallyShipped ? (
                            <Badge variant="secondary">Partially Shipped</Badge>
                          ) : order.isFinished ? (
                            <Badge variant="default">Ready to Ship</Badge>
                          ) : isOrderOverdue(order) ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : getOverallProductionStatus(order) === "in_queue" ? (
                            <Badge variant="outline">In Queue</Badge>
                          ) : getOverallProductionStatus(order) === "in_progress" ? (
                            <Badge variant="outline">In Progress</Badge>
                          ) : (
                            <Badge variant="outline">Not Started</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderOrderActions(order)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {ordersQuery.data && ordersQuery.data.pagination.totalPages > 0 && (
          <CardFooter className="flex justify-center pt-2 border-t">
            <Pagination
              currentPage={ordersQuery.data.pagination.page}
              totalPages={ordersQuery.data.pagination.totalPages}
              onPageChange={handlePageChange}
              pageSize={ordersQuery.data.pagination.pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
              disabled={ordersQuery.isLoading || isSearching || ordersQuery.isFetching}
              className="py-4"
            />
          </CardFooter>
        )}
      </Card>
      
      {ordersQuery.data && (
        <div className="flex justify-between text-sm text-gray-500">
          <div>
            Showing {sortedOrders.length} of {ordersQuery.data.pagination.totalItems} orders
          </div>
          <div>
            Page {ordersQuery.data.pagination.page} of {ordersQuery.data.pagination.totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
