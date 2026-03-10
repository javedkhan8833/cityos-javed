import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { MainLayout } from "./MainLayout";
import {
  Settings,
  Smartphone,
  CreditCard,
  Bell,
  Building,
  Users,
  Server,
  Code,
  FlaskConical,
  FileType,
  Route as RouteIcon,
  User,
  Menu,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const settingsNav = [
  { label: "General", href: "/settings", icon: Settings },
  { label: "Navigator App", href: "/settings/navigator-app", icon: Smartphone },
  { label: "Payments", href: "/settings/payments", icon: CreditCard },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
  { label: "Routing", href: "/settings/routing", icon: RouteIcon },
  { label: "Custom Fields", href: "/settings/custom-fields", icon: FileType },
  { label: "divider", href: "", icon: Settings },
  { label: "Profile", href: "/settings/profile", icon: User },
  { label: "Organization", href: "/settings/organization", icon: Building },
  { label: "Team & Roles", href: "/settings/team", icon: Users },
  { label: "Servers", href: "/settings/servers", icon: Server },
  { label: "divider", href: "", icon: Settings },
  { label: "Developers", href: "/developers", icon: Code },
  { label: "API Tests", href: "/fleetbase-test", icon: FlaskConical },
];

function SettingsNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <>
      {settingsNav.map((item, i) => {
        if (item.label === "divider") {
          return <div key={i} className="my-2 h-px bg-border" />;
        }
        const isActive =
          item.href === "/settings"
            ? location === "/settings"
            : location.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}>
            <button
              onClick={onNavigate}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              data-testid={`settings-nav-${item.label.toLowerCase().replace(/\s+&?\s*/g, '-')}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          </Link>
        );
      })}
    </>
  );
}

function getCurrentLabel(location: string): string {
  const match = settingsNav.find((item) => {
    if (item.label === "divider") return false;
    if (item.href === "/settings") return location === "/settings";
    return location.startsWith(item.href);
  });
  return match?.label || "Settings";
}

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLabel = getCurrentLabel(location);

  return (
    <MainLayout>
      <div className="flex gap-6 min-h-[calc(100vh-4rem)]">
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r pr-4">
          <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-0.5">
              <SettingsNavItems />
            </nav>
          </ScrollArea>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="settings-mobile-nav-trigger">
                  <Menu className="h-4 w-4" />
                  <span>{currentLabel}</span>
                  <ChevronDown className="h-3 w-3 ml-auto" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <h2 className="text-lg font-semibold mb-4">Settings</h2>
                <nav className="flex flex-col gap-0.5">
                  <SettingsNavItems onNavigate={() => setMobileOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  );
}
