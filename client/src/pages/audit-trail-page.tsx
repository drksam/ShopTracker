import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Plus,
  Loader2
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

interface AuditRecord {
  id: number;
  orderId: number;
  userId: number;
  action: string;
  details: string;
  locationId: number | null;
  createdAt: number;
  order: {
    id: number;
    orderNumber: string;
    tbfosNumber: string;
    client: string;
  } | null;
  user: {
    id: number;
    username: string;
    fullName: string;
  } | null;
  location: {
    id: number;
    name: string;
  } | null;
}

interface PaginatedAuditResponse {
  data: AuditRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function AuditTrailPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredAuditTrail, setFilteredAuditTrail] = useState<AuditRecord[]>([]);

  // Fetch audit trail with pagination
  const { data: paginatedAudit, isLoading, refetch } = useQuery<PaginatedAuditResponse>({
    queryKey: ["/api/audit-trail", currentPage, pageSize, refreshCounter],
    queryFn: async ({ queryKey }) => {
      const [_, page, size] = queryKey;
      const res = await fetch(`/api/audit-trail?page=${page}&pageSize=${size}`);
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return res.json();
    },
  });

  // Filter audit trail client-side when search query or action filter changes
  // Note: In a production app with large datasets, you might want to implement server-side filtering
  useState(() => {
    if (!paginatedAudit) return;

    if (!searchQuery && actionFilter === "all") {
      setFilteredAuditTrail(paginatedAudit.data);
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);
    const filtered = paginatedAudit.data.filter(audit => {
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
    });
    
    setFilteredAuditTrail(filtered);
  }, [paginatedAudit, searchQuery, actionFilter]);

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

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      // Get total record count first
      const countRes = await fetch(`/api/audit-trail?page=1&pageSize=1`);
      if (!countRes.ok) throw new Error("Failed to fetch audit trail count");
      const countData = await countRes.json();
      const totalRecords = countData.pagination.totalItems;
      
      // Define a reasonable batch size for exports
      const BATCH_SIZE = 1000;
      const MAX_RECORDS = 10000; // Maximum number of records to export
      
      // Check if the export would be too large
      if (totalRecords > MAX_RECORDS) {
        alert(`Export limited to ${MAX_RECORDS.toLocaleString()} records. The system has ${totalRecords.toLocaleString()} records in total. Please refine your search criteria or use filters to reduce the dataset.`);
      }
      
      // Calculate number of pages needed based on batch size
      const totalPages = Math.ceil(Math.min(totalRecords, MAX_RECORDS) / BATCH_SIZE);
      let allData: AuditRecord[] = [];
      
      // Show export progress
      const progressIndicator = document.createElement("div");
      progressIndicator.style.position = "fixed";
      progressIndicator.style.top = "50%";
      progressIndicator.style.left = "50%";
      progressIndicator.style.transform = "translate(-50%, -50%)";
      progressIndicator.style.padding = "20px";
      progressIndicator.style.background = "white";
      progressIndicator.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      progressIndicator.style.borderRadius = "8px";
      progressIndicator.style.zIndex = "9999";
      
      // Fetch data in batches
      for (let page = 1; page <= totalPages; page++) {
        // Update progress indicator
        progressIndicator.innerHTML = `Exporting audit records: ${Math.round((page / totalPages) * 100)}%`;
        if (page === 1) document.body.appendChild(progressIndicator);
        
        // Fetch this batch
        const res = await fetch(`/api/audit-trail?page=${page}&pageSize=${BATCH_SIZE}`);
        if (!res.ok) throw new Error(`Failed to fetch audit trail batch ${page}`);
        const batchData = await res.json();
        allData = [...allData, ...batchData.data];
        
        // Stop if we've reached the maximum records
        if (allData.length >= MAX_RECORDS) break;
      }
      
      // Remove progress indicator
      document.body.removeChild(progressIndicator);
      
      // Apply any filters
      if (searchQuery || actionFilter !== "all") {
        allData = allData.filter((audit: AuditRecord) => {
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
        });
      }
      
      if (allData.length === 0) {
        alert("No data to export based on current filters.");
        return;
      }
      
      // Create CSV header
      const headers = ["Timestamp", "Order #", "Action", "User", "Location", "Details"];
      
      // Create CSV rows
      const rows = allData.map((audit: AuditRecord) => [
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
      
      // Clean up URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export audit trail:", error);
      alert("Export failed. Please try again or export a smaller dataset by applying filters.");
    }
  };

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Reset to first page when filtering
    if (value !== searchQuery) {
      setCurrentPage(1);
    }
  };
  
  const handleActionFilterChange = (value: string) => {
    setActionFilter(value as any);
    // Reset to first page when filtering
    if (value !== actionFilter) {
      setCurrentPage(1);
    }
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => {
                setRefreshCounter(c => c + 1);
                refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <Button 
              variant="default" 
              className="flex items-center"
              onClick={exportToCSV}
              disabled={!paginatedAudit || paginatedAudit.data.length === 0}
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
              onValueChange={handleActionFilterChange}
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
          
          <div className="ml-auto text-sm text-gray-500 pt-4 md:pt-0">
            {paginatedAudit && (
              <div>
                Total records: {paginatedAudit.pagination.totalItems}
                {isFiltering && (
                  <span> (filtered: {filteredAuditTrail.length})</span>
                )}
              </div>
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
          {!paginatedAudit || paginatedAudit.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <History className="h-12 w-12 mb-2 text-gray-400" />
              <h3 className="text-lg font-medium mb-1">No Audit Records</h3>
              <p className="text-sm text-center">
                There are no audit records to display
              </p>
            </div>
          ) : filteredAuditTrail.length === 0 && isFiltering ? (
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
                  {(isFiltering ? filteredAuditTrail : paginatedAudit.data).map((audit: AuditRecord) => (
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
        {paginatedAudit && paginatedAudit.pagination.totalPages > 0 && !isFiltering && (
          <CardFooter className="flex justify-center pt-2 border-t">
            <Pagination
              currentPage={paginatedAudit.pagination.page}
              totalPages={paginatedAudit.pagination.totalPages}
              onPageChange={handlePageChange}
              pageSize={paginatedAudit.pagination.pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100, 250]}
              disabled={isLoading}
              className="py-4"
            />
          </CardFooter>
        )}
      </Card>
      
      {paginatedAudit && !isFiltering && (
        <div className="flex justify-between text-sm text-gray-500">
          <div>
            Showing {paginatedAudit.data.length} of {paginatedAudit.pagination.totalItems} records
          </div>
          <div>
            Page {paginatedAudit.pagination.page} of {paginatedAudit.pagination.totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
