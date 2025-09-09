import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Alert = { id: number; createdAt: string | number | Date; status: string; message: string; machineId: string; alertType: string };
type HelpRequestWithDetails = {
  id: number;
  createdAt: string | number | Date;
  isResolved: boolean;
  order: { orderNumber: string };
  location: { name: string };
  user: { fullName: string };
};

export function NotificationsFeed() {
  const { user } = useAuth();
  const lastSeen = user?.notificationsLastSeenAt ? new Date(user.notificationsLastSeenAt) : null;
  const { data: alerts } = useQuery<Alert[]>({ queryKey: ["/api/alerts/all"], enabled: !!user });
  const { data: helpRequests } = useQuery<HelpRequestWithDetails[]>({ queryKey: ["/api/help-requests/all"], enabled: !!user });

  const [filter, setFilter] = useState<"all" | "alerts" | "help">("all");

  const items = useMemo(() => {
    const alertItems = (alerts || []).map((a) => ({
      type: "alert" as const,
      id: `alert-${a.id}`,
      createdAt: new Date(a.createdAt),
      title: `${a.alertType === "warning" ? "Warning" : a.alertType === "error" ? "Error" : "Notification"} on ${a.machineId}`,
      subtitle: a.message,
      status: a.status,
    }));
    const helpItems = (helpRequests || []).map((h) => ({
      type: "help" as const,
      id: `help-${h.id}`,
      createdAt: new Date(h.createdAt),
      title: `Help Needed: ${h.order.orderNumber}`,
      subtitle: `${h.location.name} • ${h.user.fullName}`,
      status: h.isResolved ? "resolved" : "pending",
    }));
    let all = [...alertItems, ...helpItems];
    if (filter === "alerts") all = alertItems;
    if (filter === "help") all = helpItems;
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [alerts, helpRequests, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Badge variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="cursor-pointer">
          All
        </Badge>
        <Badge variant={filter === "alerts" ? "default" : "outline"} onClick={() => setFilter("alerts")} className="cursor-pointer">
          Alerts
        </Badge>
        <Badge variant={filter === "help" ? "default" : "outline"} onClick={() => setFilter("help")} className="cursor-pointer">
          Help Requests
        </Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul>
              {items.map((item, idx) => {
                const unseen = !lastSeen || item.createdAt > lastSeen;
                return (
                  <li key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.type === "help" ? (
                          <HelpCircle className="h-4 w-4 text-amber-500" />
                        ) : item.status === "error" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : item.status === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Bell className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.title}</span>
                          {unseen && <span className="text-xs text-blue-600">new</span>}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item.createdAt.toLocaleString()}</div>
                      </div>
                      <div>
                        <Badge variant={item.status === "resolved" || item.status === "acknowledged" ? "outline" : "default"}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    {idx !== items.length - 1 && <Separator className="mt-4" />}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
