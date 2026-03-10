import { ReactNode } from "react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { Settings, Database, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { DataSourceToggle } from "@/components/DataSourceToggle";
import { CityOSContextSelector } from "@/components/CityOSContextSelector";
import { Link } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar />
            <CommandPalette />
          </div>
          <div className="flex items-center gap-3">
            <CityOSContextSelector />
            <DataSourceToggle />
            <NotificationsMenu />
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-settings-header">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
