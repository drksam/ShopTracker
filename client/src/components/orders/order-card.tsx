import { OrderLocation, Order } from "@shared/schema";
import OrderStatusIndicator from "./order-status-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { useQuery } from "@tanstack/react-query";

interface OrderCardProps {
  orderLocation: OrderLocation & { order: Order };
  onClick?: () => void;
  onStart?: () => void;
  onFinish?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onUpdateCount?: (count: number) => void;
  onRequestHelp?: (notes: string) => void;
  expanded?: boolean;
}

export default function OrderCard({
  orderLocation,
  onClick,
  onStart,
  onFinish,
  onPause,
  onResume,
  onUpdateCount,
  onRequestHelp,
  expanded = false
}: OrderCardProps) {
  const { order, status, queuePosition, completedQuantity } = orderLocation;
  
  // Add debugging to help identify status issues
  console.log(`Order ${order.orderNumber} status:`, status);
  
  // Get PDF settings to generate PDF link
  const { data: pdfSettings } = useQuery({
    queryKey: ["/api/pdf-settings"],
    enabled: expanded
  });
  
  const pdfPrefix = pdfSettings?.pdfPrefix || "";
  const pdfPostfix = pdfSettings?.pdfPostfix || ".pdf";
  const pdfLink = `${pdfPrefix}${order.tbfosNumber}${pdfPostfix}`;
  
  // Calculate progress percentage
  const progress = order.totalQuantity > 0
    ? Math.round((completedQuantity / order.totalQuantity) * 100)
    : 0;
  
  // Format due date
  const formattedDueDate = new Date(order.dueDate).toLocaleDateString();
  
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
  
  return (
    <Card 
      className={`relative border rounded-md mb-4 ${expanded ? 'cursor-default' : 'cursor-pointer'}`} 
      onClick={!expanded ? onClick : undefined}
    >
      <CardContent className={`p-4 ${expanded ? 'pt-4' : 'pt-8'}`}>
        {!expanded && (
          <div className="absolute top-3 left-3">
            <OrderStatusIndicator 
              status={status} 
              queuePosition={queuePosition} 
              showLabel={false} 
              size="md" 
            />
          </div>
        )}
        
        <div className={expanded ? '' : 'ml-4'}>
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">{order.orderNumber} ({order.tbfosNumber})</h3>
            {expanded ? (
              <Badge 
                variant={
                  status === "in_progress" ? "default" : 
                  status === "in_queue" ? "secondary" :
                  status === "paused" ? "warning" :
                  status === "done" ? "success" : "outline"
                }
              >
                <OrderStatusIndicator status={status} queuePosition={queuePosition} showLabel={true} />
              </Badge>
            ) : null}
          </div>
          
          <div className="text-sm mb-2">
            <p>Client: <span className="font-medium">{order.client}</span></p>
            <p>Due: <span className="font-medium">{formattedDueDate}</span></p>
            <p>Quantity: <span className="font-medium">{order.totalQuantity} pcs</span></p>
          </div>
          
          {expanded && (
            <>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <div style={{ width: 60, height: 60 }}>
                    <CircularProgressbar 
                      value={progress} 
                      text={`${progress}%`}
                      styles={buildStyles({
                        pathColor: getProgressColor(),
                        textColor: getProgressColor(),
                        trailColor: '#e0e0e0'
                      })}
                    />
                  </div>
                  <span className="ml-2 text-sm">{completedQuantity}/{order.totalQuantity} Complete</span>
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
                  <Button disabled>
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
