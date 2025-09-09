import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Location, OrderWithLocations } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import OrderStatusIndicator from "@/components/orders/order-status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Bell, CheckCircle, HelpCircle, AlertCircle } from "lucide-react";

export default function OverviewPage() {
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(c => c + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[], Error>({
    queryKey: ["/api/locations", refreshCounter],
  });

  // Fetch orders
  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery<{data: OrderWithLocations[]}, Error>({
    queryKey: ["/api/orders", false, refreshCounter], // false = don't include shipped orders
    queryFn: async () => {
      const res = await fetch("/api/orders?includeShipped=false");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // Extract orders array from the response
  const orders = ordersResponse?.data;

  // Fetch help requests
  const { data: helpRequestsResponse, isLoading: isLoadingHelpRequests } = useQuery({
    queryKey: ["/api/help-requests/active", refreshCounter],
    queryFn: async () => {
      const res = await fetch("/api/help-requests/active");
      if (!res.ok) throw new Error("Failed to fetch help requests");
      return res.json();
    },
  });

  // Extract help requests from response
  const helpRequests = Array.isArray(helpRequestsResponse) ? helpRequestsResponse : [];

  // Sort locations by order
  const sortedLocations: Location[] = Array.isArray(locations)
    ? [...locations].sort((a, b) => a.usedOrder - b.usedOrder)
    : [];

  // Get orders for a specific location with a specific status
  const getOrdersForLocationStatus = (locationId: number, status: string) => {
    if (!orders) return [];
    
    return orders.filter(order => {
      const orderLocation = order.locations.find(ol => ol.locationId === locationId);
      return orderLocation && orderLocation.status === status;
    });
  };

  // Get in-progress orders for a location
  const getInProgressOrders = (locationId: number) => {
    return getOrdersForLocationStatus(locationId, "in_progress");
  };

  // Get queued orders for a location
  const getQueuedOrders = (locationId: number) => {
    return getOrdersForLocationStatus(locationId, "in_queue")
      .sort((a, b) => {
        const aLocation = a.locations.find(ol => ol.locationId === locationId);
        const bLocation = b.locations.find(ol => ol.locationId === locationId);
        return (aLocation?.queuePosition || 0) - (bLocation?.queuePosition || 0);
      });
  };

  // Check if an order is overdue
  const isOrderOverdue = (order: OrderWithLocations) => {
    const dueDate = new Date(order.dueDate);
    const today = new Date();
    return dueDate < today && !order.isShipped;
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Render loading state
  if (isLoadingLocations || isLoadingOrders || isLoadingHelpRequests) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-6">
            <Skeleton className="h-7 w-40 mb-2" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Shop Overview</h1>
        <p className="text-gray-500">
          Real-time status of workshop operations and current orders in process
        </p>
      </div>
      
      {/* Help Requests Alert */}
      {helpRequests && helpRequests.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center">
            <Bell className="mr-2 h-4 w-4" /> Help Needed ({helpRequests.length})
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-32 overflow-y-auto">
              {helpRequests.map((request: any) => (
                <div key={request.id} className="border-l-2 border-red-700 pl-3 py-1 mb-2">
                  <p className="font-semibold">{request.location.name} - Order #{request.order.orderNumber}</p>
                  <p className="text-sm">{request.notes || "No details provided"}</p>
                  <p className="text-xs text-gray-500">{formatDate(new Date(request.createdAt))}</p>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Location Overview Cards */}
      {sortedLocations.map((location) => {
        const inProgressOrders = getInProgressOrders(location.id);
        const queuedOrders = getQueuedOrders(location.id);
        
        return (
          <div key={location.id} className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              {location.name}
              {location.isPrimary && (
                <Badge variant="outline" className="ml-2">Primary</Badge>
              )}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Processing Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Currently Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inProgressOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-gray-500">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>No orders currently in progress</span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Order #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inProgressOrders.slice(0, 3).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              <Link href={`/orders/${order.id}`}>
                                <span className="text-primary hover:underline cursor-pointer">{order.orderNumber}</span>
                              </Link>
                              {isOrderOverdue(order) && (
                                <AlertCircle className="inline-block ml-1 h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell>{order.client}</TableCell>
                            <TableCell className="text-right">
                              <OrderStatusIndicator status="in_progress" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              
              {/* Queue Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    Next in Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {queuedOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-gray-500">
                      <HelpCircle className="h-5 w-5 mr-2" />
                      <span>No orders in queue</span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Position</TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queuedOrders.slice(0, 3).map((order) => {
                          const orderLocation = order.locations.find(ol => ol.locationId === location.id);
                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                #{orderLocation?.queuePosition || "-"}
                              </TableCell>
                              <TableCell>
                                <Link href={`/orders/${order.id}`}>
                                  <span className="text-primary hover:underline cursor-pointer">{order.orderNumber}</span>
                                </Link>
                                {isOrderOverdue(order) && (
                                  <AlertCircle className="inline-block ml-1 h-4 w-4 text-red-500" />
                                )}
                              </TableCell>
                              <TableCell>{order.client}</TableCell>
                              <TableCell className={isOrderOverdue(order) ? "text-red-500" : ""}>
                                {new Date(order.dueDate).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })}
      
      {/* Last updated indicator */}
      <div className="text-xs text-gray-500 text-right mt-4">
        Last updated: {new Date().toLocaleTimeString()}
        <span className="ml-2 text-primary cursor-pointer hover:underline" onClick={() => setRefreshCounter(c => c + 1)}>
          Refresh
        </span>
      </div>
    </div>
  );
}
