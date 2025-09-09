import React from "react";
import { OrderLocation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

type OrderStatus =
  | "not_available"
  | "not_started"
  | "in_queue"
  | "in_progress"
  | "paused"
  | "done"
  | "shipped"
  | "cancelled"
  // Extra overall statuses used in some list headers (e.g., dashboard cards)
  | "overdue"
  | "ready";

interface OrderStatusIndicatorProps {
  status: import("@shared/schema").OrderLocation["status"] | Exclude<OrderStatus,
    | "not_started"
    | "in_queue"
    | "in_progress"
    | "paused"
    | "done"
  >;
  queuePosition?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}

export function OrderStatusIndicator({
  status,
  queuePosition,
  showLabel = true,
  size = "md",
  interactive = false,
}: OrderStatusIndicatorProps) {
  const { toast } = useToast();
  const isMobile = useMobile();
  
  const statusConfig: Record<OrderStatus, { color: string; label: string; description: string }> = {
    not_available: {
      color: "bg-gray-400",
      label: "N/A",
      description: "This location is not available yet"
    },
    not_started: {
      color: "bg-gray-300",
      label: "Not Started",
      description: "This location has not started yet"
    },
    in_queue: {
      color: "bg-amber-500",
      label: queuePosition ? `In Queue (#${queuePosition})` : "In Queue",
      description: "Order is waiting to be processed"
    },
    in_progress: {
      color: "bg-blue-500",
      label: "In Progress",
      description: "Order is currently being produced"
    },
    paused: {
      color: "bg-yellow-400",
      label: "Paused",
      description: "Production on this order has been temporarily paused"
    },
    done: {
      color: "bg-green-500",
      label: "Completed",
      description: "Production is complete at this location"
    },
    shipped: {
      color: "bg-green-700",
      label: "Shipped",
      description: "Order has been shipped to the customer"
    },
    cancelled: {
      color: "bg-red-500",
      label: "Cancelled",
      description: "Order has been cancelled"
    },
    overdue: {
      color: "bg-red-500",
      label: "Overdue",
      description: "This order is past its due date"
    },
    ready: {
      color: "bg-emerald-500",
      label: "Ready to Ship",
      description: "This order is ready for shipment"
    }
  };
  
  const config = statusConfig[status] ?? {
    color: "bg-gray-400",
    label: "Unknown",
    description: "Unknown order status"
  };
  
  const handleTap = () => {
    if (interactive) {
      toast({
        title: config.label,
        description: config.description,
        duration: 3000,
      });
    }
  };
  
  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  };
  
  const labelSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  // For mobile devices, we'll use a more touch-friendly approach when interactive
  if (isMobile && interactive) {
    return (
      <Badge
        variant="outline"
        className={`flex items-center px-2 py-1 border-2 border-${config.color.replace('bg-', '')}/20 hover:bg-${config.color.replace('bg-', '')}/10 active:bg-${config.color.replace('bg-', '')}/20 cursor-pointer transition-colors`}
        onClick={handleTap}
      >
        <span className={`${config.color} ${dotSizes[size]} rounded-full mr-1.5`}></span>
        <span className={labelSizes[size]}>{config.label}</span>
      </Badge>
    );
  }

  // For desktop or non-interactive elements
  const statusDot = (
    <span className={`${config.color} ${dotSizes[size]} rounded-full ${showLabel ? "mr-1.5" : ""}`}></span>
  );
  
  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex cursor-help">{statusDot}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="flex items-center" onClick={handleTap}>
      {statusDot}
      <span className={labelSizes[size]}>{config.label}</span>
    </div>
  );
}

export default OrderStatusIndicator;
