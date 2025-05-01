import { useState, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import { 
  Menu,
  Bell,
  ChevronDown,
  User as UserIcon 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { HelpRequest } from "@shared/schema";

export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
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
      "audit": "Audit Trail",
      "settings": "Settings"
    };
    
    return titles[firstSegment] || "Dashboard";
  };

  // Get help requests
  const { data: helpRequests } = useQuery<HelpRequest[], Error>({
    queryKey: ["/api/help-requests/active"],
    enabled: !!user && user.role === "admin"
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
      <div className="bg-neutral-900 text-white w-64 flex-shrink-0 hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <Sidebar mobile onNavigate={() => setIsMobileSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
            
            <h2 className="text-lg font-medium">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            {user && user.role === "admin" && (
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5 text-gray-500" />
                      {helpRequests && helpRequests.length > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                          {helpRequests.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {helpRequests && helpRequests.length > 0 ? (
                      helpRequests.map((request) => (
                        <DropdownMenuItem key={request.id} className="flex flex-col items-start">
                          <div className="font-semibold">Help Needed: {request.order.orderNumber}</div>
                          <div className="text-xs text-gray-500">
                            {request.location.name} - {request.notes || "No details provided"}
                          </div>
                        </DropdownMenuItem>
                      ))
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
          {children}
        </main>
      </div>
    </div>
  );
}
