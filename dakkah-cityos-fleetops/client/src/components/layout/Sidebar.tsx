import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Map as MapIcon,
  Truck,
  Users,
  Package,
  Calendar,
  Settings,
  Wrench,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Menu,
  Fuel,
  AlertTriangle,
  Contact,
  MapPin,
  Activity,
  Wifi,
  Layers,
  Plug,
  Code,
  Route as RouteIcon,
  FileType,
  Building,
  Wallet,
  Banknote,
  Radio,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  LogOut,
  HelpCircle,
  Server,
  User,
  ExternalLink,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  className?: string;
}

type NavItem = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  submenu?: NavItem[];
};

const navItems: NavItem[] = [
  {
    title: "Operations",
    icon: MapIcon,
    submenu: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Orders", href: "/operations/orders", icon: Package },
      { title: "Tracking", href: "/operations/tracking", icon: MapPin },
      { title: "Routes", href: "/operations/routes", icon: RouteIcon },
      { title: "Scheduler", href: "/operations/scheduler", icon: Calendar },
      { title: "Service Zones", href: "/operations/service-zones", icon: Layers },
      { title: "Service Rates", href: "/operations/service-rates", icon: Banknote },
      { title: "Order Config", href: "/operations/order-config", icon: Settings },
    ],
  },
  {
    title: "Resources",
    icon: Users,
    submenu: [
      { title: "Drivers", href: "/management/drivers", icon: Users },
      { title: "Vehicles", href: "/management/vehicles", icon: Truck },
      { title: "Fleets", href: "/management/fleets", icon: Layers },
      { title: "Vendors", href: "/management/vendors", icon: Building },
      { title: "Contacts", href: "/management/contacts", icon: Contact },
      { title: "Places", href: "/management/places", icon: MapPin },
      { title: "Fuel Reports", href: "/resources/fuel-reports", icon: Fuel },
      { title: "Issues", href: "/resources/issues", icon: AlertTriangle },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    submenu: [
      { title: "Work Orders", href: "/maintenance/work-orders", icon: Wrench },
      { title: "Parts", href: "/maintenance/parts", icon: Package },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    submenu: [
      { title: "Transactions", href: "/finance/transactions", icon: Banknote },
    ],
  },
  {
    title: "Connectivity",
    icon: Activity,
    submenu: [
      { title: "Telematics", href: "/connectivity/telematics", icon: Radio },
      { title: "Devices", href: "/connectivity/devices", icon: Wifi },
      { title: "Sensors", href: "/connectivity/sensors", icon: Cpu },
      { title: "Events", href: "/connectivity/events", icon: Activity },
      { title: "Integrations", href: "/integrations", icon: Plug },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    submenu: [
      { title: "Reports", href: "/analytics", icon: FileType },
    ],
  },
];


function SidebarNavExpanded({ items }: { items: NavItem[] }) {
  const [location] = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Operations: true,
    Resources: true,
    Maintenance: false,
    Finance: false,
    Connectivity: false,
    Analytics: false,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex flex-col gap-0.5 px-3 py-3">
      <Link href="/operations/orders/new">
        <button
          className="flex w-full items-center gap-2.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 mb-3"
          data-testid="button-create-order-sidebar"
        >
          <Plus className="h-4 w-4" />
          <span>Create Order</span>
        </button>
      </Link>

      {items.map((item, index) => {
        if (!item.submenu) return null;
        const isOpen = openGroups[item.title];
        const isActive = item.submenu.some((sub) => sub.href === location);

        return (
          <div key={index} className="mb-0.5">
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              )}
              onClick={() => toggleGroup(item.title)}
            >
              <span className="flex items-center gap-2.5">
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                {item.title}
              </span>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              )}
            </button>
            {isOpen && (
              <div className="mt-0.5 space-y-0.5 pl-3">
                {item.submenu.map((sub, subIndex) => {
                  const active = location === sub.href;
                  return (
                    <Link key={subIndex} href={sub.href!}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-white/10 text-white font-medium"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        )}
                        data-testid={`nav-${sub.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {sub.icon && <sub.icon className="h-4 w-4 shrink-0 opacity-70" />}
                        <span>{sub.title}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SidebarNavCollapsed({ items }: { items: NavItem[] }) {
  const [location] = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col items-center gap-1 py-3 px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/operations/orders/new">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-500 mb-2"
                data-testid="button-create-order-sidebar-collapsed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Create Order</TooltipContent>
        </Tooltip>

        {items.map((item, index) => {
          if (!item.submenu) return null;
          const isActive = item.submenu.some((sub) => sub.href === location);
          const firstHref = item.submenu[0]?.href || "/";

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link href={firstHref}>
                  <button
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function AvatarDropdownMenu({ collapsed }: { collapsed: boolean }) {
  const { server, disconnect } = useAuth();
  const [, setLocation] = useLocation();
  const initials = server?.name
    ? server.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "FB";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white cursor-pointer transition-colors hover:bg-green-500 focus:outline-none"
            data-testid="sidebar-avatar-trigger"
          >
            {initials}
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors hover:bg-white/5 focus:outline-none"
            data-testid="sidebar-avatar-trigger"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white" data-testid="text-server-name">{server?.name || "Fleetbase"}</p>
              <p className="truncate text-xs text-gray-500" data-testid="text-server-org">{server?.organization || "Connected"}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        className="w-64"
        sideOffset={8}
      >
        <DropdownMenuLabel className="pb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" data-testid="dropdown-server-name">{server?.name || "Fleetbase"}</p>
              <p className="truncate text-xs text-muted-foreground font-normal">{server?.organization || "Connected"}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/settings/profile")} data-testid="menu-view-profile">
          <User className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/settings/organization")} data-testid="menu-org-settings">
          <Building className="mr-2 h-4 w-4" />
          Organization Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/settings/servers")} data-testid="menu-servers">
          <Server className="mr-2 h-4 w-4" />
          Servers
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/developers")} data-testid="menu-developers">
          <Code className="mr-2 h-4 w-4" />
          Developers
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="https://docs.fleetbase.io" target="_blank" rel="noopener noreferrer" data-testid="menu-docs">
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://discord.gg/MJQgxHwN" target="_blank" rel="noopener noreferrer" data-testid="menu-discord">
            <MessageCircle className="mr-2 h-4 w-4" />
            Join Discord Community
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://github.com/fleetbase/fleetbase/issues" target="_blank" rel="noopener noreferrer" data-testid="menu-support">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
          data-testid="menu-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomSection({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-white/10 py-3 px-2">
        <AvatarDropdownMenu collapsed={true} />
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 px-3 py-3">
      <AvatarDropdownMenu collapsed={false} />
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "hidden h-screen flex-col md:flex transition-all duration-300",
        collapsed ? "w-[60px]" : "w-60",
        className
      )}
      style={{ backgroundColor: "#1a1f2e" }}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        <div className={cn("flex items-center gap-2.5", collapsed && "gap-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Layers className="h-4.5 w-4.5" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-white">
              FleetOps
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
            onClick={() => setCollapsed(true)}
            data-testid="button-collapse-sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {collapsed ? (
          <SidebarNavCollapsed items={navItems} />
        ) : (
          <SidebarNavExpanded items={navItems} />
        )}
      </ScrollArea>

      {collapsed && (
        <div className="flex justify-center py-2 px-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
                  onClick={() => setCollapsed(false)}
                  data-testid="button-expand-sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <BottomSection collapsed={collapsed} />
    </div>
  );
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 border-0" style={{ backgroundColor: "#1a1f2e" }}>
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              FleetOps
            </span>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-56px)]">
          <SidebarNavExpanded items={navItems} />
          <BottomSection collapsed={false} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

