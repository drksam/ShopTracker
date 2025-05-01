import { OrderLocation } from "@shared/schema";
import { cn } from "@/lib/utils";

interface OrderStatusIndicatorProps {
  status: OrderLocation["status"];
  queuePosition?: number | null;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function OrderStatusIndicator({ 
  status, 
  queuePosition, 
  className,
  showLabel = true,
  size = "md"
}: OrderStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case "in_progress":
        return "bg-green-500"; // Green for In Progress
      case "in_queue":
        return "bg-blue-500"; // Blue for In Queue
      case "paused":
        return "bg-yellow-400"; // Yellow for Paused
      case "done":
        return "bg-green-500"; // Green for Done
      case "not_started":
        return "bg-gray-400"; // Gray for Not Started
      default:
        return "bg-gray-400"; // Gray for N/A
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "in_progress":
        return "In Progress";
      case "in_queue":
        return queuePosition ? `Queue #${queuePosition}` : "In Queue";
      case "paused":
        return "Paused";
      case "done":
        return "Done";
      case "not_started":
        return "Not Started";
      default:
        return "N/A";
    }
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <div className={cn("flex items-center", className)}>
      <span className={cn("rounded-full mr-2", getStatusColor(), sizeClasses[size])}></span>
      {showLabel && <span className="text-sm">{getStatusLabel()}</span>}
    </div>
  );
}
