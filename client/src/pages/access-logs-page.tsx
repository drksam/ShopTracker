import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, User, Key, Check, X, RefreshCw, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

type AccessLog = {
  id: number;
  userId: number | null;
  machineId: string;
  cardId: string;
  accessGranted: boolean;
  reason: string;
  timestamp: string;
  user?: {
    id: number;
    username: string;
    fullName: string;
  };
};

interface PaginatedAccessLogsResponse {
  data: AccessLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function AccessLogsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  const {
    data: paginatedLogs,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<PaginatedAccessLogsResponse>({
    queryKey: ["/api/access-logs/recent", currentPage, pageSize],
    queryFn: async ({ queryKey }) => {
      const [_, page, size] = queryKey;
      const res = await fetch(`/api/access-logs/recent?page=${page}&pageSize=${size}`);
      if (!res.ok) throw new Error("Failed to fetch access logs");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Filter logs based on search term
  useState(() => {
    if (!paginatedLogs) return;
    
    if (!filter) {
      setFilteredLogs(paginatedLogs.data);
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);
    const searchTerm = filter.toLowerCase();
    const filtered = paginatedLogs.data.filter(log => 
      log.machineId.toLowerCase().includes(searchTerm) ||
      log.cardId.toLowerCase().includes(searchTerm) ||
      log.reason.toLowerCase().includes(searchTerm) ||
      (log.user?.fullName || "").toLowerCase().includes(searchTerm) ||
      (log.user?.username || "").toLowerCase().includes(searchTerm)
    );
    
    setFilteredLogs(filtered);
  }, [paginatedLogs, filter]);

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
      const countRes = await fetch(`/api/access-logs/recent?page=1&pageSize=1`);
      if (!countRes.ok) throw new Error("Failed to fetch access logs count");
      const countData = await countRes.json();
      const totalRecords = countData.pagination.totalItems;
      
      // Define a reasonable batch size for exports
      const BATCH_SIZE = 1000;
      const MAX_RECORDS = 10000; // Maximum number of records to export
      
      // Check if the export would be too large
      if (totalRecords > MAX_RECORDS) {
        alert(`Export limited to ${MAX_RECORDS.toLocaleString()} records. Please refine your search criteria.`);
      }
      
      // Calculate number of pages needed based on batch size
      const totalPages = Math.ceil(Math.min(totalRecords, MAX_RECORDS) / BATCH_SIZE);
      let allData: AccessLog[] = [];
      
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
        progressIndicator.innerHTML = `Exporting access logs: ${Math.round((page / totalPages) * 100)}%`;
        if (page === 1) document.body.appendChild(progressIndicator);
        
        // Fetch this batch
        const res = await fetch(`/api/access-logs/recent?page=${page}&pageSize=${BATCH_SIZE}`);
        if (!res.ok) throw new Error(`Failed to fetch access logs batch ${page}`);
        const batchData = await res.json();
        allData = [...allData, ...batchData.data];
      }
      
      // Remove progress indicator
      document.body.removeChild(progressIndicator);
      
      // Apply any filters
      if (filter) {
        const searchTerm = filter.toLowerCase();
        allData = allData.filter((log: AccessLog) => 
          log.machineId.toLowerCase().includes(searchTerm) ||
          log.cardId.toLowerCase().includes(searchTerm) ||
          log.reason.toLowerCase().includes(searchTerm) ||
          (log.user?.fullName || "").toLowerCase().includes(searchTerm) ||
          (log.user?.username || "").toLowerCase().includes(searchTerm)
        );
      }
      
      if (allData.length === 0) {
        alert("No data to export based on current filters.");
        return;
      }
      
      // Create CSV header
      const headers = ["Timestamp", "User", "Card ID", "Machine ID", "Status", "Reason"];
      
      // Create CSV rows
      const rows = allData.map((log: AccessLog) => [
        new Date(log.timestamp).toLocaleString(),
        log.user ? (log.user.fullName || log.user.username) : "Unknown",
        log.cardId,
        log.machineId,
        log.accessGranted ? "Granted" : "Denied",
        log.reason
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
      link.setAttribute("download", `access-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export access logs:", error);
      alert("Export failed. Please try again or export a smaller dataset.");
    }
  };

  // Loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              Error loading access logs. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Access Logs</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={() => exportToCSV()}
              className="flex items-center"
              title="Export to CSV"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedLogs && paginatedLogs.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Card ID</TableHead>
                    <TableHead>Machine ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isFiltering ? filteredLogs : paginatedLogs.data).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-500" />
                            {log.user.fullName || log.user.username}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Key className="w-4 h-4 mr-2 text-gray-500" />
                          {log.cardId}
                        </div>
                      </TableCell>
                      <TableCell>{log.machineId}</TableCell>
                      <TableCell>
                        {log.accessGranted ? (
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Granted
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="w-3 h-3 mr-1" />
                              Denied
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{log.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {filter ? "No matching access logs found." : "No access logs found."}
            </div>
          )}
        </CardContent>
        {paginatedLogs && paginatedLogs.pagination.totalPages > 0 && !isFiltering && (
          <CardFooter className="flex justify-center pt-2 border-t">
            <Pagination
              currentPage={paginatedLogs.pagination.page}
              totalPages={paginatedLogs.pagination.totalPages}
              onPageChange={handlePageChange}
              pageSize={paginatedLogs.pagination.pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 50, 100, 250]}
              disabled={isLoading || isRefetching}
              className="py-4"
            />
          </CardFooter>
        )}
      </Card>
      
      {paginatedLogs && !isFiltering && (
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <div>
            Showing {paginatedLogs.data.length} of {paginatedLogs.pagination.totalItems} logs
          </div>
          <div>
            Page {paginatedLogs.pagination.page} of {paginatedLogs.pagination.totalPages}
          </div>
        </div>
      )}
    </div>
  );
}