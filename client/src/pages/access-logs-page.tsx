import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, User, Key, Check, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";

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

export default function AccessLogsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(100);

  const {
    data: accessLogs,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<AccessLog[]>({
    queryKey: ["/api/access-logs/recent", limit],
    enabled: !!user && user.role === "admin",
  });

  // Filter logs based on search term
  const filteredLogs = accessLogs?.filter(log => {
    const searchTerm = filter.toLowerCase();
    return (
      log.machineId.toLowerCase().includes(searchTerm) ||
      log.cardId.toLowerCase().includes(searchTerm) ||
      log.reason.toLowerCase().includes(searchTerm) ||
      (log.user?.fullName || "").toLowerCase().includes(searchTerm) ||
      (log.user?.username || "").toLowerCase().includes(searchTerm)
    );
  });

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
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs && filteredLogs.length > 0 ? (
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
                  {filteredLogs.map((log) => (
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
              {filteredLogs.length >= limit && (
                <div className="flex justify-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setLimit(prev => prev + 100)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {filter ? "No matching access logs found." : "No access logs found."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}