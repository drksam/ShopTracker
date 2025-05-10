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
  Bell
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Location, Machine } from "@shared/schema";

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

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // Fetch machines for dropdown
  const { data: machines = [] } = useQuery<Machine[], Error>({
    queryKey: ["/api/machines"],
    queryFn: async () => {
      const res = await fetch("/api/machines");
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
    enabled: isAdmin,
  });
  
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
        "flex items-center px-4 py-3 text-neutral-300 hover:bg-neutral-800 transition-colors",
        isActive(href) && "bg-primary text-white"
      )}
      onClick={onNavigate}
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
      onClick={onNavigate}
    >
      <span className="mr-2 text-xs">■</span>
      {children}
    </Link>
  );

  return (
    <>
      <div className="p-4 border-b border-neutral-800">
        <h1 className="text-xl font-bold">ShopTracker</h1>
        <p className="text-sm text-neutral-400">Workshop Management</p>
        <p className="text-xs text-neutral-500">v1.0.1 | ShopSuite v1.0.1</p>
      </div>
      
      <nav className="mt-4 overflow-y-auto max-h-[calc(100vh-100px)]">
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
              "flex items-center px-4 py-3 text-neutral-300 hover:bg-neutral-800 transition-colors w-full",
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
              
              {locations.slice(0, 10).map(location => (
                <DropdownItem key={location.id} href={`/location/${location.id}`}>
                  {location.name}
                </DropdownItem>
              ))}
            </div>
          )}
        </div>
        
        {/* Machines with dropdown (for admins) */}
        {isAdmin && (
          <div>
            <button 
              className={cn(
                "flex items-center px-4 py-3 text-neutral-300 hover:bg-neutral-800 transition-colors w-full",
                (isActive("/machines") || machinesOpen) && "bg-neutral-800"
              )}
              onClick={() => setMachinesOpen(!machinesOpen)}
            >
              <span className="mr-3"><Factory size={20} /></span>
              Machines
              <span className="ml-auto">
                {machinesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>
            
            {machinesOpen && (
              <div className="bg-neutral-900">
                <NavLink href="/machines" icon={<ChevronRight size={16} />}>
                  All Machines
                </NavLink>
                
                {machines.slice(0, 10).map(machine => (
                  <DropdownItem key={machine.id} href={`/machine/${machine.id}`}>
                    {machine.name} ({machine.machineId})
                  </DropdownItem>
                ))}
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
            
            <div className="mt-2 mb-8">
              <NavLink href="/api-config" icon={<Key size={20} />}>
                API Configuration
              </NavLink>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
