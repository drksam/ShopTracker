import { useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import { 
  Menu,
  Bell,
  ChevronDown,
  User as UserIcon,
  ArrowLeft 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HelpRequest } from "@shared/schema";
import { SyncLoadingIndicator } from "@/components/api/sync-loading-indicator";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { AppSettings } from "@shared/schema";

export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useMobile();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  
  // Track previous path for back button functionality
  useEffect(() => {
    if (location !== previousPath && previousPath !== null) {
      // Store current path as previous when navigation occurs
      setPreviousPath(location);
    } else if (previousPath === null) {
      // Set initial previous path
      setPreviousPath(location);
    }
  }, [location, previousPath]);

  // Get page title based on the current location
  const getPageTitle = () => {
    const pathSegments = location.split("/").filter(Boolean);
    const firstSegment = pathSegments[0] || "dashboard";
    
    const titles: Record<string, string> = {
      "": "Dashboard",
      "dashboard": "Dashboard",
      "orders": pathSegments.length > 1 ? "Order Details" : "Orders",
      "locations": "Locations",
      "location": "Location",
      "shipping": "Shipping",
      "overview": "Shop Overview",
      "users": "User Management",
      "machines": "Machine Management",
      "machine": "Machine Details",
      "audit": "Audit Trail",
      "settings": "Settings",
      "alerts": "Alert Center",
      "rfid-cards": "RFID Cards",
      "access-levels": "Access Levels",
      "access-logs": "Access Logs",
  // "api-config": "API Configuration" (moved to Settings)
    };
    
    return titles[firstSegment] || "Dashboard";
  };

  const canGoBack = () => {
    // Logic to determine if we can go back based on navigation paths
    const pathSegments = location.split("/").filter(Boolean);
    // Can go back if we're in a detail view (e.g., /orders/123)
    return pathSegments.length > 1 || (previousPath && previousPath !== location);
  };

  const handleBackNavigation = () => {
    const pathSegments = location.split("/").filter(Boolean);
    
    if (pathSegments.length > 1) {
      // If we're in a detail view, go back to the list view
      navigate(`/${pathSegments[0]}`);
    } else if (previousPath && previousPath !== location) {
      // Otherwise go back to previous path
      navigate(previousPath);
    } else {
      // Default to dashboard
      navigate('/');
    }
  };

  // Get help requests and alerts for unified notifications (admins only for now)
  type HelpRequestWithDetails = HelpRequest & { order: { orderNumber: string }; location: { name: string } };
  const { data: helpRequests } = useQuery<HelpRequestWithDetails[], Error>({
    queryKey: ["/api/help-requests/active"],
    enabled: !!user && user.role === "admin",
  });
  type Alert = { id: number; createdAt: string | number | Date; status: string; message: string; machineId: string; alertType: string };
  const { data: alerts } = useQuery<Alert[], Error>({
    queryKey: ["/api/alerts"],
    enabled: !!user && user.role === "admin",
  });
  
  // Compute unseen count based on user's notificationsLastSeenAt
  const lastSeen = user?.notificationsLastSeenAt ? new Date(user.notificationsLastSeenAt) : null;
  const unseenHelp = (helpRequests || []).filter(hr => !lastSeen || new Date(hr.createdAt) > lastSeen);
  const unseenAlerts = (alerts || []).filter(a => a.status === "pending" && (!lastSeen || new Date(a.createdAt) > lastSeen));
  const unseenCount = unseenHelp.length + unseenAlerts.length;

  // Branding
  const { data: appSettings } = useQuery<AppSettings>({ queryKey: ["/api/settings"] });

  // Mark notifications seen when opening the dropdown
  const markSeen = useMutation({
    mutationFn: async () => {
  await fetch("/api/user/notifications/seen", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      if (user) {
        queryClient.setQueryData(["/api/user"], {
          ...user,
          notificationsLastSeenAt: new Date().toISOString(),
        });
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    if (!user) return "U";
    if (user.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    return user.username.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="bg-neutral-900 text-white w-56 flex-shrink-0 hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center">
            {/* Mobile sidebar */}
            <div className="md:hidden">
              <Sidebar mobile />
            </div>
            
            {/* Back button on mobile */}
            {isMobile && canGoBack() && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackNavigation} 
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            {/* Branding on desktop */}
            <div className="hidden md:flex items-center gap-2 ml-2 mr-4">
              {appSettings?.companyLogoUrl && (
                <img src={appSettings.companyLogoUrl} alt="Logo" className="h-7 w-auto" />
              )}
              <span className="text-sm text-gray-600">{appSettings?.companyName || 'ShopTracker'}</span>
            </div>

            <h2 className={cn(
              "text-lg font-medium",
              isMobile && "truncate max-w-[150px]"
            )}>
              {getPageTitle()}
            </h2>
            
            {/* Sync indicator in header */}
            <div className="ml-4">
              <SyncLoadingIndicator variant="badge" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications - unified with alerts */}
            {user && user.role === "admin" && (
              <div className="relative">
                <DropdownMenu onOpenChange={(open) => {
                  if (open) {
                    markSeen.mutate();
                  }
                }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5 text-gray-500" />
                      {unseenCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                          {unseenCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {((helpRequests && helpRequests.length > 0) || (alerts && alerts.length > 0)) ? (
                      <div className="max-w-xs">
                        {(helpRequests || []).map((request) => (
                          <DropdownMenuItem key={`hr-${request.id}`} className="flex flex-col items-start">
                            <div className="font-semibold">Help Needed: {request.order.orderNumber}</div>
                            <div className="text-xs text-gray-500">
                              {request.location.name} • {new Date(request.createdAt).toLocaleString()}
                            </div>
                          </DropdownMenuItem>
                        ))}
                        {(alerts || []).map((a) => (
                          <DropdownMenuItem key={`al-${a.id}`} className="flex flex-col items-start">
                            <div className="font-semibold">{a.alertType === "warning" ? "Warning" : a.alertType === "error" ? "Error" : "Notification"} on {a.machineId}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[260px]">{a.message}</div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ) : (
                      <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>{getUserInitial()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user?.fullName || user?.username}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center" onSelect={() => navigate("/settings")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center" onSelect={handleLogout}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {/* Full-width sync indicator at top of content */}
          <div className="mb-4">
            <SyncLoadingIndicator variant="full" />
          </div>
          
          {/* Add responsive padding adjustments */}
          <div className={cn(
            isMobile ? "px-0" : "px-2",
            "max-w-full"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
