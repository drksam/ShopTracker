import { OrderLocation, Order } from "@shared/schema";
import OrderStatusIndicator from "./order-status-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// Support both historical and current usages of this component
// - orderLocation: the expected prop (OrderLocation with embedded order)
// - order: alias sometimes passed from pages, actually the same shape
type OrderWithLocationDetails = OrderLocation & { order: Order };

interface OrderCardProps {
  orderLocation?: OrderWithLocationDetails;
  // Accept both plain Order (Needed tab) and OrderWithLocationDetails (Current/Completed)
  order?: Order | OrderWithLocationDetails;
  onClick?: () => void;
  onStart?: () => void;
  onFinish?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onUpdateCount?: (count: number) => void;
  onRequestHelp?: (notes: string) => void;
  expanded?: boolean;
  // Extra optional props used by location-page; safely ignored here
  onExpand?: () => void;
  onStatusUpdate?: (status: OrderLocation["status"]) => void;
  isCompleted?: boolean;
  onLocationAssign?: () => void;
  className?: string;
  // Quantity behavior overrides
  hideQuantity?: boolean;
  totalOverride?: number; // if provided, use this instead of ord.totalQuantity
}

export default function OrderCard({
  orderLocation,
  order,
  onClick,
  onStart,
  onFinish,
  onPause,
  onResume,
  onUpdateCount,
  onRequestHelp,
  expanded = false,
  // accept but ignore for now to preserve compatibility
  onExpand,
  onStatusUpdate,
  isCompleted,
  onLocationAssign,
  className,
  hideQuantity,
  totalOverride
}: OrderCardProps) {
  const [, navigate] = useLocation();
  const resolved = (() => {
    if (orderLocation) return orderLocation;
    if (order) {
      // Distinguish between plain Order and OrderWithLocationDetails by checking for a field unique to Order
      const maybeBase = order as Order;
      if (typeof (maybeBase as any).orderNumber === "string") {
        // Construct a minimal synthetic OrderLocation for display in Needed tab
        const minimal: OrderWithLocationDetails = {
          id: -1,
          orderId: maybeBase.id,
          locationId: -1,
          status: "not_available",
          queuePosition: null,
          completedQuantity: 0,
          notes: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          order: maybeBase,
        } as unknown as OrderWithLocationDetails;
        return minimal;
      }
      return order as OrderWithLocationDetails;
    }
    return undefined;
  })();

  if (!resolved) return null;
  const { order: ord, status, queuePosition, completedQuantity } = resolved;
  const isMobile = useMobile();
  
  // Add debugging to help identify status issues
  if (ord) console.log(`Order ${ord.orderNumber} status:`, status);
  
  // Get PDF settings to generate PDF link
  const { data: pdfSettings } = useQuery<{ pdfPrefix?: string; pdfPostfix?: string }>({
    queryKey: ["/api/pdf-settings"],
    enabled: expanded
  });
  
  const pdfPrefix = pdfSettings?.pdfPrefix || "";
  const pdfPostfix = pdfSettings?.pdfPostfix || ".pdf";
  const pdfLink = `${pdfPrefix}${ord.tbfosNumber}${pdfPostfix}`;
  
  // Calculate progress percentage
  const totalQty = typeof totalOverride === 'number' && totalOverride >= 0
    ? totalOverride
    : ord.totalQuantity;

  const progress = totalQty > 0
    ? Math.round((completedQuantity / totalQty) * 100)
    : 0;
  
  // Format due date
  const formattedDueDate = new Date(ord.dueDate).toLocaleDateString();
  
  // Get status color for progress bar
  const getProgressColor = () => {
    switch (status) {
      case "in_progress":
        return "#4caf50"; // Green
      case "in_queue":
        return "#2196f3"; // Blue
      case "paused":
        return "#ffeb3a"; // Yellow
      case "done":
        return "#4caf50"; // Green
      default:
        return "#9e9e9e"; // Gray
    }
  };
  
  // Determine the card click handler: prefer provided onClick, else onExpand if available
  const cardClick = !expanded ? (onClick ?? onExpand) : undefined;

  return (
  <Card 
      className={cn(
    "relative border rounded-md mb-4",
    className,
        expanded || !cardClick ? 'cursor-default' : 'cursor-pointer'
      )}
      onClick={cardClick}
    >
      <CardContent className={cn(
        "p-4",
        expanded ? 'pt-4' : 'pt-8'
      )}>
        {!expanded && (
          <div className="absolute top-3 left-3">
            <OrderStatusIndicator 
              status={status} 
              queuePosition={queuePosition ?? undefined} 
              showLabel={false} 
              size="md" 
            />
          </div>
        )}
        
        <div className={expanded ? '' : 'ml-4'}>
          <div className="flex justify-between mb-2">
            <h3 className={cn(
              "font-medium",
              isMobile && !expanded && "text-sm truncate max-w-[180px]"
            )}>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={(e) => { e.stopPropagation(); navigate(`/orders/${ord.id}`); }}
              >
                {ord.orderNumber}
              </button>
              {" "}({ord.tbfosNumber})
            </h3>
            {/* Rush badge (compact view) */}
            {!expanded && ord.rush && (
              <Badge variant="destructive" className="ml-2 animate-pulse">RUSH</Badge>
            )}
            {expanded ? (
              <Badge 
                variant={
                  status === "in_progress" ? "default" : 
                  status === "in_queue" ? "secondary" :
                  status === "paused" ? "secondary" :
                  status === "done" ? "secondary" : "outline"
                }
              >
                <OrderStatusIndicator status={status} queuePosition={queuePosition ?? undefined} showLabel={true} />
              </Badge>
            ) : null}
          </div>
          {expanded && ord.rush && (
            <div className="mb-3 -mt-1">
              <Badge variant="destructive" className="animate-pulse">RUSH PRIORITY</Badge>
            </div>
          )}
          
          <div className={cn(
            "text-sm mb-2",
            isMobile && !expanded && "text-xs"
          )}>
            <p>Client: <span className="font-medium">{ord.client}</span></p>
            <p>Due: <span className="font-medium">{formattedDueDate}</span></p>
            {!hideQuantity && (
              <p>Quantity: <span className="font-medium">{totalQty} pcs</span></p>
            )}
          </div>
          
          {expanded && (
            <>
              <div className={cn(
                "flex items-center justify-between mt-4",
                isMobile && "flex-col items-start gap-4"
              )}>
                <div className="flex items-center">
                  <div style={{ width: isMobile ? 50 : 60, height: isMobile ? 50 : 60 }}>
                    <CircularProgressbar 
                      value={progress} 
                      text={`${progress}%`}
                      styles={buildStyles({
                        pathColor: getProgressColor(),
                        textColor: getProgressColor(),
                        trailColor: '#e0e0e0',
                        textSize: isMobile ? '22px' : '16px'
                      })}
                    />
                  </div>
                  {!hideQuantity && (
                    <span className="ml-2 text-sm">{completedQuantity}/{totalQty} Complete</span>
                  )}
                </div>
                
                <div>
                  <a 
                    href={pdfLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    View PDF
                  </a>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                {status === "not_started" || status === "in_queue" ? (
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onStart && onStart(); }}
                    className="bg-blue-500 hover:bg-blue-600"
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Start
                  </Button>
                ) : status === "in_progress" ? (
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onPause && onPause(); }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    Pause
                  </Button>
                ) : status === "paused" ? (
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onResume && onResume(); }}
                    className="bg-blue-500 hover:bg-blue-600"
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Resume
                  </Button>
                ) : (
                  <Button 
                    disabled
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Completed
                  </Button>
                )}
                
                {(status === "in_progress" || status === "paused") && (
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onFinish && onFinish(); }}
                    variant="secondary"
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Complete
                  </Button>
                )}
                
                {(status === "in_progress" || status === "paused") && (
                  <Button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const count = prompt(`Enter completed count (current: ${completedQuantity}):`, completedQuantity.toString());
                      if (count !== null) {
                        const numCount = parseInt(count);
                        if (!isNaN(numCount) && numCount >= 0) {
                          onUpdateCount && onUpdateCount(numCount);
                        }
                      }
                    }}
                    variant="outline"
                    className="col-span-2 mt-2"
                    size={isMobile ? "sm" : "default"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-4 w-4 mr-1"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Update Count
                  </Button>
                )}
              </div>
              
              <div className="mt-2">
                <Button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const notes = prompt("Enter details about the help needed:");
                    if (notes !== null) {
                      onRequestHelp && onRequestHelp(notes);
                    }
                  }}
                  variant="outline"
                  className="w-full border-red-500 text-red-500 hover:bg-red-50"
                  size={isMobile ? "sm" : "default"}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-4 w-4 mr-1"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Request Help
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
