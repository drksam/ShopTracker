import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderWithLocations } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Truck, 
  Package, 
  Calendar, 
  CheckCircle, 
  Search,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ShippingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch completed orders ready for shipping
  const { data: ordersResponse, isLoading } = useQuery<{data: OrderWithLocations[]}>({
    queryKey: ["/api/orders", { includeShipped: true }],
    queryFn: async () => {
      // Note: backend doesn't support status filter here; includeShipped shows shipped too
      const res = await fetch("/api/orders?includeShipped=true");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const orders = ordersResponse?.data || [];

  // Compute production readiness states per spec
  const computeReadiness = (order: OrderWithLocations) => {
    const locs = order.locations || [];
    if (locs.length === 0) return { readiness: "unknown" as const, allStarted: false };
    const isStarted = (s: string) => s === "in_progress" || s === "paused" || s === "done";
    const allStarted = locs.every(l => isStarted(l.status));
    const allDone = locs.every(l => l.status === "done");
    if (allDone) return { readiness: "fully_ready" as const, allStarted };
    if (allStarted) return { readiness: "part_ready" as const, allStarted };
    return { readiness: "not_ready" as const, allStarted };
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.tbfosNumber && order.tbfosNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Only fully ready and not-yet-shipped orders should appear in the main table
  const readyOrders = filteredOrders.filter(o => {
    const { readiness } = computeReadiness(o);
    return !o.isShipped && readiness === "fully_ready";
  });

  const handleMarkAsShipped = async (order: OrderWithLocations) => {
    try {
      // Ship full quantity for fully-ready orders
      await apiRequest("POST", `/api/orders/${order.id}/ship`, {
        quantity: order.totalQuantity
      });
      
      toast({
        title: "Order Shipped",
        description: "The order has been marked as shipped.",
      });
      
      // Refresh the data without a full reload
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark order as shipped. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateShippingLabel = (order: OrderWithLocations) => {
    // This would integrate with a shipping API in a real application
    toast({
      title: "Shipping Label",
      description: `Generating shipping label for order ${order.orderNumber}`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Shipping Management</h1>
          <p className="text-gray-600">Manage completed orders ready for shipping</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Completed orders awaiting shipment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partially Shipped</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter(o => o.partiallyShipped).length}</div>
            <p className="text-xs text-muted-foreground">Orders with partial shipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipped</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.isShipped).length}
            </div>
            <p className="text-xs text-muted-foreground">
              All time shipped orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Order Search</CardTitle>
          <CardDescription>
            Search and filter orders by order number, client, or TBFOS number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Shipping</CardTitle>
          <CardDescription>
            Manage completed orders and shipping status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>TBFOS #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    No orders found matching your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                readyOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <a href={`/orders/${order.id}`} className="text-primary hover:underline">{order.orderNumber}</a>
                    </TableCell>
                    <TableCell>{order.client}</TableCell>
                    <TableCell>{order.tbfosNumber || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(order.dueDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{order.totalQuantity}</TableCell>
                    <TableCell>
                      {(() => {
                        if (order.isShipped) {
                          return (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Shipped
                            </Badge>
                          );
                        }
                        const { readiness } = computeReadiness(order);
                        if (readiness === "fully_ready") {
                          return (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                              <Package className="w-3 h-3 mr-1" /> Fully Ready
                            </Badge>
                          );
                        }
                        if (readiness === "part_ready") {
                          return (
                            <Badge variant="secondary" className="bg-amber-500 text-black hover:bg-amber-500">
                              <Package className="w-3 h-3 mr-1" /> Part Ready
                            </Badge>
                          );
                        }
                        if (readiness === "not_ready") {
                          return (
                            <Badge variant="outline" className="border-gray-300">
                              <Package className="w-3 h-3 mr-1" /> Not Ready
                            </Badge>
                          );
                        }
                        return (
                          <Badge variant="outline">
                            <Package className="w-3 h-3 mr-1" /> —
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!order.isShipped ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateShippingLabel(order)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Label
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsShipped(order)}
                              disabled={computeReadiness(order).readiness !== "fully_ready"}
                            >
                              <Truck className="w-4 h-4 mr-1" />
                              Ship
                            </Button>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Shipped
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
