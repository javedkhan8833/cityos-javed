import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, CreditCard, MessageSquare, Map as MapIcon, Truck, Bell, ExternalLink, Loader2 } from "lucide-react";
import { integrationsApi } from "@/lib/api";
import type { Integration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const defaultIntegrations = [
  { name: "Stripe", provider: "stripe", category: "payments", description: "Accept payments directly in FleetOps for order deliveries and services.", status: "connected" },
  { name: "Twilio", provider: "twilio", category: "communications", description: "Send SMS notifications to customers and drivers about order updates.", status: "available" },
  { name: "Google Maps", provider: "google_maps", category: "mapping", description: "Enhanced address resolution and traffic data for route optimization.", status: "connected" },
  { name: "Slack", provider: "slack", category: "notifications", description: "Receive dispatch alerts and operational updates in your team Slack channels.", status: "available" },
  { name: "Samsara", provider: "samsara", category: "telematics", description: "Sync vehicle GPS and diagnostic data from Samsara ELD devices.", status: "available" },
  { name: "QuickBooks", provider: "quickbooks", category: "accounting", description: "Automatically sync invoices and transaction data for accounting.", status: "available" },
];

export default function IntegrationsPage() {
  const { data: integrations, isLoading, error } = integrationsApi.useList();
  const createMutation = integrationsApi.useCreate();
  const updateMutation = integrationsApi.useUpdate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);

  const seededRef = useRef(false);

  useEffect(() => {
    if (!isLoading && integrations && integrations.length === 0 && !seededRef.current) {
      seededRef.current = true;
      defaultIntegrations.forEach((integration) => {
        createMutation.mutate(integration);
      });
    }
  }, [isLoading, integrations]);

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKeyValue(integration.api_key || "");
    setWebhooksEnabled(integration.webhooks_enabled ?? false);
    setConfigOpen(true);
  };

  const handleSave = () => {
    if (!selectedIntegration) return;
    updateMutation.mutate(
      {
        id: selectedIntegration.id,
        status: "connected",
        api_key: apiKeyValue,
        webhooks_enabled: webhooksEnabled,
      },
      {
        onSuccess: () => {
          toast({
            title: selectedIntegration.status === "connected" ? "Settings saved" : "Integration connected",
            description: `${selectedIntegration.name} has been ${selectedIntegration.status === "connected" ? "updated" : "connected"} successfully.`,
          });
          setConfigOpen(false);
        },
      }
    );
  };

  const handleToggleStatus = (integration: Integration) => {
    const newStatus = integration.status === "connected" ? "available" : "connected";
    updateMutation.mutate(
      { id: integration.id, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "connected" ? "Integration enabled" : "Integration disabled",
            description: `${integration.name} has been ${newStatus === "connected" ? "enabled" : "disabled"}.`,
          });
        },
      }
    );
  };

  const filteredIntegrations = (integrations || []).filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (provider: string) => {
    switch (provider) {
      case 'stripe': return <CreditCard className="h-6 w-6" />;
      case 'twilio': return <MessageSquare className="h-6 w-6" />;
      case 'google_maps': return <MapIcon className="h-6 w-6" />;
      case 'samsara': return <Truck className="h-6 w-6" />;
      case 'slack': return <Bell className="h-6 w-6" />;
      default: return <ExternalLink className="h-6 w-6" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64" data-testid="loading-integrations">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64" data-testid="error-integrations">
          <p className="text-destructive">Failed to load integrations. Please try again.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">Connect FleetOps with your favorite tools and services.</p>
        </div>

        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-integrations"
            placeholder="Search integrations..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map(integration => (
            <Card key={integration.id} className="flex flex-col" data-testid={`card-integration-${integration.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                    {getIcon(integration.provider)}
                  </div>
                  <div>
                    <CardTitle className="text-base" data-testid={`text-name-${integration.id}`}>{integration.name}</CardTitle>
                    <CardDescription className="capitalize">{integration.category}</CardDescription>
                  </div>
                </div>
                <Switch
                  data-testid={`switch-status-${integration.id}`}
                  checked={integration.status === 'connected'}
                  onCheckedChange={() => handleToggleStatus(integration)}
                />
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {integration.description}
                </p>
              </CardContent>
              <CardFooter className="pt-0 border-t bg-muted/20 p-4">
                <Button
                  data-testid={`button-connect-${integration.id}`}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleConnect(integration)}
                >
                  {integration.status === 'connected' ? 'Configure' : 'Connect'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent data-testid="dialog-configure-integration">
            <DialogHeader>
              <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
              <DialogDescription>
                {selectedIntegration?.status === 'connected'
                  ? 'Update connection settings and preferences.'
                  : 'Connect this service to your FleetOps account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  data-testid="input-api-key"
                  type="password"
                  placeholder="sk_live_..."
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Webhooks</Label>
                <Switch
                  data-testid="switch-webhooks"
                  checked={webhooksEnabled}
                  onCheckedChange={setWebhooksEnabled}
                />
              </div>
              {selectedIntegration?.category === 'telematics' && (
                <div className="space-y-2">
                  <Label>Vehicle Sync Frequency</Label>
                  <Input data-testid="input-sync-frequency" defaultValue="5 minutes" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button data-testid="button-cancel" variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button data-testid="button-save" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedIntegration?.status === 'connected' ? 'Save Changes' : 'Connect Service'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
