import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle, AlertCircle, Ban, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type ErrorSeverity = "error" | "warning" | "info" | "validation";

export interface ErrorMessageProps {
  title?: string;
  message?: string;
  details?: string;
  severity?: ErrorSeverity;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  children?: React.ReactNode;
}

export function ErrorMessage({
  title,
  message,
  details,
  severity = "error",
  className,
  onRetry,
  onDismiss,
  showDismiss = false,
  children,
}: ErrorMessageProps) {
  // Define styles based on severity
  const severityStyles = {
    error: {
      icon: XCircle,
      iconClass: "text-destructive",
      alertClass: "border-destructive/50 text-destructive",
      title: title || "Error",
    },
    warning: {
      icon: AlertCircle,
      iconClass: "text-warning",
      alertClass: "border-warning/50 text-warning bg-warning/10",
      title: title || "Warning",
    },
    info: {
      icon: InfoIcon,
      iconClass: "text-info",
      alertClass: "border-info/50 text-info bg-info/10",
      title: title || "Information",
    },
    validation: {
      icon: Ban,
      iconClass: "text-muted-foreground",
      alertClass: "border-muted text-muted-foreground bg-muted/20",
      title: title || "Validation Error",
    },
  };

  const { icon: Icon, iconClass, alertClass, title: defaultTitle } = severityStyles[severity];

  return (
    <Alert className={cn("relative", alertClass, className)}>
      <Icon className={cn("h-5 w-5", iconClass)} />
      <AlertTitle className="mb-2 font-medium">{title || defaultTitle}</AlertTitle>
      <AlertDescription className="text-sm">
        {message && <p>{message}</p>}
        {details && (
          <details className="mt-1 cursor-pointer">
            <summary className="text-xs font-medium">Show details</summary>
            <div className="mt-2 rounded bg-background/80 p-2 text-xs">
              {details}
            </div>
          </details>
        )}
        {children}
        
        {(onRetry || onDismiss || showDismiss) && (
          <div className="mt-4 flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
            {(onDismiss || showDismiss) && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}