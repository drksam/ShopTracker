import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ListOrdered, 
  MapPin, 
  Truck, 
  Eye, 
  Users, 
  Factory, 
  History, 
  Settings,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Lock,
  ClipboardList,
  Key,
  Bell,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Location, Machine } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import logoWhiteOnBlack from "@shared/logo/logoWhiteOnBlack.png";

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const [path] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [locationsOpen, setLocationsOpen] = useState(path.startsWith("/location"));
  const [machinesOpen, setMachinesOpen] = useState(path.startsWith("/machine"));
  const [openMachineGroups, setOpenMachineGroups] = useState<Record<number, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(!mobile);
  const isMobileView = useMobile();

  // When path changes, close the sidebar on mobile
  useEffect(() => {
    if (mobile && isSidebarOpen) {
      // Add a small delay to let the navigation happen first
      const timer = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [path, mobile]);

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // Fetch machines for grouping
  const { data: machines = [] } = useQuery<Machine[], Error>({
    queryKey: ["/api/machines"],
    queryFn: async () => {
      const res = await fetch("/api/machines");
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
    enabled: isAdmin,
  });

  // Group machines by location id
  const machinesByLocation = (() => {
    const map = new Map<number, Machine[]>();
    machines.forEach(m => {
      const arr = map.get(m.locationId) || [];
      arr.push(m);
      map.set(m.locationId, arr);
    });
    return map;
  })();

  const toggleMachineGroup = (locId: number) => {
    setOpenMachineGroups(prev => ({ ...prev, [locId]: !prev[locId] }));
  };
  
  // Fetch pending alerts count
  const { data: alertsData } = useQuery({
    queryKey: ["/api/alerts/pending/count"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/pending/count");
      if (!res.ok) throw new Error("Failed to fetch alerts count");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const isActive = (pathToCheck: string) => {
    // Handle root path
    if (pathToCheck === "/" && path === "/") return true;
    
    // Handle other paths
    if (pathToCheck !== "/") {
      return path.startsWith(pathToCheck);
    }
    
    return false;
  };

  // Load app settings for branding
  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
    if (mobile) {
      setIsSidebarOpen(false);
    }
  };

  const NavLink = ({ 
    href, 
    icon, 
    children, 
    badge 
  }: { 
    href: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    badge?: number;
  }) => (
    <Link 
      href={href}
      className={cn(
        "flex items-center px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors",
        isActive(href) && "bg-primary text-white"
      )}
      onClick={handleNavigate}
    >
      <span className="mr-3">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex items-center justify-center ml-2 min-w-[20px] h-5 px-1 text-xs font-bold rounded-full bg-red-500 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );

  const DropdownItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link 
      href={href}
      className={cn(
        "flex items-center pl-10 pr-4 py-2 text-neutral-300 hover:bg-neutral-800 transition-colors",
        isActive(href) && "bg-neutral-700"
      )}
      onClick={handleNavigate}
    >
      <span className="mr-2 text-xs">■</span>
      {children}
    </Link>
  );

  // Mobile toggle button that appears at the top of the sidebar when in mobile mode
  const MobileToggle = () => (
    <div className="flex justify-between items-center p-4 border-b border-neutral-800">
      <h1 className="text-xl font-bold">ShopTracker</h1>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="text-neutral-300 hover:text-white"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>
    </div>
  );

  // Render a compact version of the sidebar for mobile
  if (mobile && !isSidebarOpen) {
    return (
      <div className="h-14 bg-neutral-900 flex items-center px-4 justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
            className="text-neutral-300 hover:text-white mr-3"
          >
            <Menu size={24} />
          </Button>
          <h1 className="text-xl font-bold text-white">ShopTracker</h1>
        </div>
        
        {/* Show current page title */}
        <div className="text-sm text-neutral-300 font-medium">
          {path === "/" && "Dashboard"}
          {path.startsWith("/orders") && "Orders"}
          {path.startsWith("/locations") && "Locations"}
          {path.startsWith("/location/") && "Location Details"}
          {path.startsWith("/machines") && "Machines"}
          {path.startsWith("/machine/") && "Machine Details"}
          {path.startsWith("/shipping") && "Shipping"}
          {path.startsWith("/alerts") && "Alert Center"}
          {path.startsWith("/overview") && "Shop Overview"}
          {path.startsWith("/users") && "User Management"}
          {path.startsWith("/rfid-cards") && "RFID Cards"}
          {path.startsWith("/access-levels") && "Access Levels"}
          {path.startsWith("/access-logs") && "Access Logs"}
          {path.startsWith("/audit") && "Audit Trail"}
          {path.startsWith("/settings") && "Settings"}
          {path.startsWith("/api-config") && "API Config"}
        </div>
        
        {/* Show alert badge if there are pending alerts */}
        {alertsData?.count > 0 && (
          <Link href="/alerts">
            <Button 
              size="sm" 
              variant="ghost" 
              className="relative"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs font-bold rounded-full bg-red-500 text-white">
                {alertsData.count > 9 ? '9+' : alertsData.count}
              </span>
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Full sidebar content - shown both for desktop and when mobile sidebar is expanded
  const sidebarContent = (
    <>
      {mobile && <MobileToggle />}
      
      {!mobile && (
        <div className="p-4 border-b border-neutral-800">
          <div className="mt-1 flex items-start gap-2.5">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">ShopTracker</h1>
              <p className="text-xs text-neutral-500 mt-0.5">v1.0.1 | ShopSuite v1.0.1</p>
            </div>
            <img src={logoWhiteOnBlack} alt="Brand Logo" className="h-9 w-auto object-contain" />
          </div>
        </div>
      )}
      
      <nav className={cn(
        "overflow-y-auto",
        mobile 
          ? "max-h-[calc(100vh-60px)]" 
          : "mt-4 max-h-[calc(100vh-100px)]"
      )}>
        <NavLink href="/" icon={<LayoutDashboard size={20} />}>
          Dashboard
        </NavLink>
        
        <NavLink href="/orders" icon={<ListOrdered size={20} />}>
          Orders
        </NavLink>
        
        {/* Locations with dropdown */}
        <div>
          <button 
            className={cn(
              "flex items-center px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors w-full",
              (isActive("/locations") || locationsOpen) && "bg-neutral-800"
            )}
            onClick={() => setLocationsOpen(!locationsOpen)}
          >
            <span className="mr-3"><MapPin size={20} /></span>
            Locations
            <span className="ml-auto">
              {locationsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>
          
          {locationsOpen && (
            <div className="bg-neutral-900">
              <NavLink href="/locations" icon={<ChevronRight size={16} />}>
                All Locations
              </NavLink>
              
              {/* Limit visible locations in dropdown based on device */}
              {locations.slice(0, isMobileView ? 5 : 10).map(location => (
                <DropdownItem key={location.id} href={`/location/${location.id}`}>
                  {location.name}
                </DropdownItem>
              ))}
              
              {/* Show a link to view all if there are more locations */}
              {locations.length > (isMobileView ? 5 : 10) && (
                <DropdownItem href="/locations">
                  View all ({locations.length})
                </DropdownItem>
              )}
            </div>
          )}
        </div>
        
        {/* Machines grouped by location (admins) */}
        {isAdmin && (
          <div>
            <button
              className={cn(
                "flex items-center px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors w-full",
                (isActive("/machines") || machinesOpen) && "bg-neutral-800"
              )}
              onClick={() => setMachinesOpen(!machinesOpen)}
            >
              <span className="mr-3"><Factory size={20} /></span>
              Machines
              <span className="ml-auto">{machinesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            </button>
            {machinesOpen && (
              <div className="bg-neutral-900">
                <NavLink href="/machines" icon={<ChevronRight size={16} />}>All Machines</NavLink>
                {/* Iterate locations, show only those having machines */}
                {locations
                  .filter(loc => machinesByLocation.has(loc.id))
                  .map(loc => {
                    const list = machinesByLocation.get(loc.id) || [];
                    // Sort machines by name for consistency
                    list.sort((a,b) => a.name.localeCompare(b.name));
                    const open = openMachineGroups[loc.id] ?? false;
                    return (
                      <div key={loc.id}>
                        <button
                          className={cn(
                            "flex items-center pl-8 pr-4 py-2 w-full text-neutral-300 hover:bg-neutral-800 transition-colors",
                            open && "bg-neutral-800"
                          )}
                          onClick={() => toggleMachineGroup(loc.id)}
                        >
                          <span className="mr-2">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                          <span className="truncate text-sm">{loc.name}</span>
                          <span className="ml-auto text-xs text-neutral-500">{list.length}</span>
                        </button>
                        {open && (
                          <div>
                            {list.map(machine => (
                              <Link
                                key={machine.id}
                                href={`/machine/${machine.id}`}
                                className={cn(
                                  "flex items-center pl-14 pr-4 py-2 text-neutral-300 hover:bg-neutral-800 transition-colors text-sm",
                                  isActive(`/machine/${machine.id}`) && "bg-neutral-700"
                                )}
                                onClick={handleNavigate}
                              >
                                <span className="mr-2 text-xs">•</span>
                                <span className="truncate">{machine.name}</span>
                                <span className="ml-auto text-[10px] opacity-60">{machine.machineId}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {/* Fallback if there are machines but none mapped (unlikely) */}
                {machines.length > 0 && locations.filter(l => machinesByLocation.has(l.id)).length === 0 && (
                  <div className="pl-10 pr-4 py-2 text-xs text-neutral-500">(No location grouping)</div>
                )}
              </div>
            )}
          </div>
        )}
        
        <NavLink href="/shipping" icon={<Truck size={20} />}>
          Shipping
        </NavLink>
        
        <NavLink 
          href="/alerts" 
          icon={<Bell size={20} />}
          badge={alertsData?.count}
        >
          Alert Center
        </NavLink>
        
        <NavLink href="/overview" icon={<Eye size={20} />}>
          Shop Overview
        </NavLink>
        
        {isAdmin && (
          <>
            <div className="mt-4 px-4 py-2 text-xs text-neutral-500">ADMIN CONTROLS</div>
            
            <NavLink href="/users" icon={<Users size={20} />}>
              User Management
            </NavLink>
            
            <div className="ml-6 pl-4 border-l border-neutral-800">
              <NavLink href="/rfid-cards" icon={<CreditCard size={20} />}>
                RFID Cards
              </NavLink>
              
              <NavLink href="/access-levels" icon={<Lock size={20} />}>
                Access Levels
              </NavLink>
              
              <NavLink href="/access-logs" icon={<ClipboardList size={20} />}>
                Access Logs
              </NavLink>
            </div>
            
            <NavLink href="/audit" icon={<History size={20} />}>
              Audit Trail
            </NavLink>
            
            <NavLink href="/settings" icon={<Settings size={20} />}>
              Settings
            </NavLink>
            
            {/* API Configuration moved into Settings → API */}
          </>
        )}
      </nav>
    </>
  );

  // Mobile sidebar as a slide-out overlay
  if (mobile) {
    return (
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-56 bg-neutral-900 transition-transform transform-gpu duration-300",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
        
        {/* Dark overlay behind the sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            style={{ marginLeft: '14rem' }} 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    );
  }

  // Desktop sidebar (normal view)
  return <div className="h-full">{sidebarContent}</div>;
}
