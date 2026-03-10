import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DriversPage from "@/pages/management/drivers";
import AvailabilityPage from "@/pages/management/drivers/availability";
import TrackingPage from "@/pages/operations/tracking";
import OrdersPage from "@/pages/operations/orders";
import CreateOrderPage from "@/pages/operations/orders/new";
import OrderImportPage from "@/pages/operations/orders/import";
import RoutesPage from "@/pages/operations/routes";
import FleetsPage from "@/pages/management/fleets";
import VehiclesPage from "@/pages/management/vehicles";
import ContactsPage from "@/pages/management/contacts";
import VendorsPage from "@/pages/management/vendors";
import ServiceRatesPage from "@/pages/operations/service-rates";
import OrderConfigPage from "@/pages/operations/order-config";
import SchedulerPage from "@/pages/operations/scheduler";
import PlacesPage from "@/pages/management/places";
import ServiceZonesPage from "@/pages/operations/service-zones";
import WorkOrdersPage from "@/pages/maintenance/work-orders";
import PartsPage from "@/pages/maintenance/parts";
import FuelReportsPage from "@/pages/resources/fuel-reports";
import IssuesPage from "@/pages/resources/issues";
import SensorsPage from "@/pages/connectivity/sensors";
import EventsPage from "@/pages/connectivity/events";
import TelematicsPage from "@/pages/connectivity/telematics";
import PaymentsPage from "@/pages/settings/payments";
import NotificationsPage from "@/pages/settings/notifications";
import RoutingPage from "@/pages/settings/routing";
import DevicesPage from "@/pages/connectivity/devices";
import SettingsPage from "@/pages/settings";
import CustomFieldsPage from "@/pages/settings/custom-fields";
import NavigatorAppPage from "@/pages/settings/navigator-app";
import TeamPage from "@/pages/settings/team";
import DevelopersPage from "@/pages/developers";
import IntegrationsPage from "@/pages/integrations";
import AnalyticsPage from "@/pages/analytics";
import TransactionsPage from "@/pages/finance/transactions";

import LoginPage from "@/pages/auth/login";
import ProfilePage from "@/pages/settings/profile";
import OrganizationPage from "@/pages/settings/organization";
import ServersPage from "@/pages/settings/servers";
import FleetbaseTestPage from "@/pages/fleetbase-test";
import SetupPage from "@/pages/setup";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConnected) {
    return <Redirect to="/auth/login" />;
  }

  return <>{children}</>;
}

function ProtectedRoutes() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={Dashboard} />

        {/* Operations */}
        <Route path="/operations/tracking" component={TrackingPage} />
        <Route path="/operations/orders" component={OrdersPage} />
        <Route path="/operations/orders/new" component={CreateOrderPage} />
        <Route path="/operations/orders/import" component={OrderImportPage} />
        <Route path="/operations/routes" component={RoutesPage} />
        <Route path="/operations/scheduler" component={SchedulerPage} />
        <Route path="/operations/service-rates" component={ServiceRatesPage} />
        <Route path="/operations/order-config" component={OrderConfigPage} />
        <Route path="/operations/service-zones" component={ServiceZonesPage} />
        
        {/* Management */}
        <Route path="/management/drivers" component={DriversPage} />
        <Route path="/management/drivers/availability" component={AvailabilityPage} />
        <Route path="/management/fleets" component={FleetsPage} />
        <Route path="/management/vehicles" component={VehiclesPage} />
        <Route path="/management/contacts" component={ContactsPage} />
        <Route path="/management/vendors" component={VendorsPage} />
        <Route path="/management/places" component={PlacesPage} />
        
        {/* Maintenance */}
        <Route path="/maintenance/work-orders" component={WorkOrdersPage} />
        <Route path="/maintenance/parts" component={PartsPage} />

        {/* Resources */}
        <Route path="/resources/fuel-reports" component={FuelReportsPage} />
        <Route path="/resources/issues" component={IssuesPage} />

        {/* Connectivity */}
        <Route path="/connectivity/devices" component={DevicesPage} />
        <Route path="/connectivity/sensors" component={SensorsPage} />
        <Route path="/connectivity/events" component={EventsPage} />
        <Route path="/connectivity/telematics" component={TelematicsPage} />
        
        {/* Finance */}
        <Route path="/finance/transactions" component={TransactionsPage} />
        
        {/* Developer & Admin */}
        <Route path="/developers" component={DevelopersPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        
        {/* Settings */}
        <Route path="/settings" component={SettingsPage} />
        <Route path="/settings/profile" component={ProfilePage} />
        <Route path="/settings/organization" component={OrganizationPage} />
        <Route path="/settings/custom-fields" component={CustomFieldsPage} />
        <Route path="/settings/navigator-app" component={NavigatorAppPage} />
        <Route path="/settings/team" component={TeamPage} />
        <Route path="/settings/payments" component={PaymentsPage} />
        <Route path="/settings/notifications" component={NotificationsPage} />
        <Route path="/settings/routing" component={RoutingPage} />
        <Route path="/settings/servers" component={ServersPage} />
        
        {/* Dev / Test */}
        <Route path="/fleetbase-test" component={FleetbaseTestPage} />

        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function Router() {
  const { isConnected, isLoading: authLoading } = useAuth();
  const [location] = useLocation();

  const { data: setupStatus, isLoading: setupLoading } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/status");
      if (!res.ok) return { needsSetup: false };
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  if (authLoading || setupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (setupStatus?.needsSetup) {
    return <SetupPage />;
  }

  if (location === "/auth/login" && isConnected) {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      <Route><ProtectedRoutes /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
