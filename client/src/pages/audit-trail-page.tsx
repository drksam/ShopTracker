import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  History,
  Truck,
  Edit,
  Play,
  CheckCircle,
  Pause,
  AlertTriangle,
  Download,
  RefreshCw,
  HelpCircle,
  Plus
} from "lucide-react";

export default function AuditTrailPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string | "all">("all");
  const [limit, setLimit] = useState(100);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Fetch audit trail
  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ["/api/audit-trail", limit, refreshCounter],
    queryFn: async () => {
      const res = await fetch(`/api/audit-trail?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return res.json();
    },
  });

  // Filter audit trail by search query and action type
  const filteredAuditTrail = auditTrail
    ? auditTrail.filter((audit: any) => {
        const matchesSearch = !searchQuery || 
          (audit.order?.orderNumber && audit.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.order?.tbfosNumber && audit.order.tbfosNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.order?.client && audit.order.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.user?.username && audit.user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.user?.fullName && audit.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.location?.name && audit.location.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (audit.details && audit.details.toLowerCase().includes(searchQuery.toLowerCase()));
          
        const matchesAction = actionFilter === "all" || audit.action === actionFilter;
        
        return matchesSearch && matchesAction;
      })
    : [];

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-4 w-4" />;
      case "updated":
        return <Edit className="h-4 w-4" />;
      case "started":
        return <Play className="h-4 w-4" />;
      case "finished":
        return <CheckCircle className="h-4 w-4" />;
      case "paused":
        return <Pause className="h-4 w-4" />;
      case "updated_quantity":
        return <Edit className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "help_requested":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800";
      case "updated":
        return "bg-blue-100 text-blue-800";
      case "started":
        return "bg-blue-100 text-blue-800";
      case "finished":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "updated_quantity":
        return "bg-purple-100 text-purple-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      case "help_requested":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get readable action name
  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return "Created";
      case "updated":
        return "Updated";
      case "started":
        return "Started";
      case "finished":
        return "Completed";
      case "paused":
        return "Paused";
      case "updated_quantity":
        return "Updated Quantity";
      case "shipped":
        return "Shipped";
      case "help_requested":
        return "Help Requested";
      default:
        return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!auditTrail || auditTrail.length === 0) return;
    
    // Create CSV header
    const headers = ["Timestamp", "Order #", "Action", "User", "Location", "Details"];
    
    // Create CSV rows
    const rows = auditTrail.map((audit: any) => [
      formatDate(audit.createdAt),
      audit.order?.orderNumber || "",
      getActionLabel(audit.action),
      audit.user?.fullName || audit.user?.username || "",
      audit.location?.name || "",
      audit.details || ""
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Skeleton className="h-8 w-48 mb-4 md:mb-0" />
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        <Card>
          <CardContent className="p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Audit Trail</h1>
        
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => setRefreshCounter(c => c + 1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <Button 
              variant="default" 
              className="flex items-center"
              onClick={exportToCSV}
              disabled={!auditTrail || auditTrail.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Action Type</label>
            <Select 
              value={actionFilter} 
              onValueChange={(value) => setActionFilter(value as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="started">Started</SelectItem>
                <SelectItem value="finished">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="updated_quantity">Updated Quantity</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="help_requested">Help Requested</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Limit</label>
            <Select 
              value={limit.toString()} 
              onValueChange={(value) => {
                setLimit(parseInt(value));
                setRefreshCounter(c => c + 1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Number of records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 Records</SelectItem>
                <SelectItem value="100">100 Records</SelectItem>
                <SelectItem value="250">250 Records</SelectItem>
                <SelectItem value="500">500 Records</SelectItem>
                <SelectItem value="1000">1000 Records</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="ml-auto text-sm text-gray-500 pt-4 md:pt-0">
            Total records: {auditTrail?.length || 0}
            {filteredAuditTrail.length !== auditTrail?.length && (
              <span> (filtered: {filteredAuditTrail.length})</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Trail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            History of actions performed on orders in the workshop management system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!auditTrail || auditTrail.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <History className="h-12 w-12 mb-2 text-gray-400" />
              <h3 className="text-lg font-medium mb-1">No Audit Records</h3>
              <p className="text-sm text-center">
                There are no audit records to display
              </p>
            </div>
          ) : filteredAuditTrail.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
              <h3 className="text-lg font-medium mb-1">No Matching Records</h3>
              <p className="text-sm text-center">
                No audit records match your search criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Timestamp</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditTrail.map((audit: any) => (
                    <TableRow key={audit.id}>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(audit.createdAt)}
                      </TableCell>
                      <TableCell>
                        {audit.order ? (
                          <div className="font-medium hover:text-primary hover:underline">
                            {audit.order.orderNumber}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center w-fit ${getActionColor(audit.action)}`}>
                          {getActionIcon(audit.action)}
                          <span className="ml-1">{getActionLabel(audit.action)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {audit.user ? (
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                              {audit.user.fullName?.charAt(0).toUpperCase() || 
                               audit.user.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <span>{audit.user.fullName || audit.user.username}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {audit.location ? (
                          <span>{audit.location.name}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {audit.details || <span className="text-gray-500">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
