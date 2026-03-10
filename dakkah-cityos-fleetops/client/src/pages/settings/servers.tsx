import { useState } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Server, Plus, Trash2, Check, Loader2, Zap, CloudOff, Pencil } from "lucide-react";
import {
  useFleetbaseServers,
  useCreateFleetbaseServer,
  useDeleteFleetbaseServer,
  useActivateFleetbaseServer,
  useTestFleetbaseServer,
  useUpdateFleetbaseServer,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ServersPage() {
  const { data: servers, isLoading } = useFleetbaseServers();
  const createServer = useCreateFleetbaseServer();
  const deleteServer = useDeleteFleetbaseServer();
  const activateServer = useActivateFleetbaseServer();
  const testServer = useTestFleetbaseServer();
  const updateServer = useUpdateFleetbaseServer();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<{ id: string; name: string; organization: string; url: string; api_key: string; cityos_country: string; cityos_city: string; cityos_tenant: string; cityos_channel: string } | null>(null);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [cityosCountry, setCityosCountry] = useState("");
  const [cityosCity, setCityosCity] = useState("");
  const [cityosTenant, setCityosTenant] = useState("");
  const [cityosChannel, setCityosChannel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; error?: string } | null>(null);

  const handleTest = async () => {
    const testUrl = editingServer ? editingServer.url : url;
    const testKey = editingServer ? editingServer.api_key : apiKey;
    if (!testUrl || !testKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testServer.mutateAsync({ url: testUrl, api_key: testKey });
      setTestResult(result);
      if (result.connected) {
        if (editingServer) {
          const updates: any = { ...editingServer };
          if (result.organization && !editingServer.organization) updates.organization = result.organization;
          if (result.country && !editingServer.cityos_country) updates.cityos_country = result.country;
          if (result.city && !editingServer.cityos_city) updates.cityos_city = result.city;
          if (result.tenant && !editingServer.cityos_tenant) updates.cityos_tenant = result.tenant;
          if (result.channel && !editingServer.cityos_channel) updates.cityos_channel = result.channel;
          setEditingServer(updates);
        } else {
          if (result.organization && !organization) setOrganization(result.organization);
          if (result.country && !cityosCountry) setCityosCountry(result.country);
          if (result.city && !cityosCity) setCityosCity(result.city);
          if (result.tenant && !cityosTenant) setCityosTenant(result.tenant);
          if (result.channel && !cityosChannel) setCityosChannel(result.channel);
        }
        if (result.organization || result.country || result.city || result.tenant || result.channel) {
          toast({ title: "Context detected", description: "CityOS context was auto-detected from the server." });
        }
      }
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = () => {
    if (!name || !url || !apiKey) return;
    createServer.mutate(
      {
        name, organization: organization || undefined, url: url.replace(/\/+$/, ""), api_key: apiKey,
        cityos_country: cityosCountry || undefined, cityos_city: cityosCity || undefined,
        cityos_tenant: cityosTenant || undefined, cityos_channel: cityosChannel || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Server added", description: `${name} has been added successfully.` });
          setDialogOpen(false);
          setName(""); setOrganization(""); setUrl(""); setApiKey("");
          setCityosCountry(""); setCityosCity(""); setCityosTenant(""); setCityosChannel("");
          setTestResult(null);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingServer) return;
    updateServer.mutate(
      {
        id: editingServer.id, name: editingServer.name, organization: editingServer.organization || undefined,
        url: editingServer.url.replace(/\/+$/, ""), api_key: editingServer.api_key,
        cityos_country: editingServer.cityos_country || undefined, cityos_city: editingServer.cityos_city || undefined,
        cityos_tenant: editingServer.cityos_tenant || undefined, cityos_channel: editingServer.cityos_channel || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Server updated", description: `${editingServer.name} has been updated.` });
          setEditDialogOpen(false);
          setEditingServer(null);
          setTestResult(null);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleActivate = (id: string, serverName: string) => {
    activateServer.mutate(id, {
      onSuccess: () => {
        toast({ title: "Server activated", description: `Now connected to ${serverName}.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteServer.mutate(id, {
      onSuccess: () => {
        toast({ title: "Server removed", description: "The server configuration has been deleted." });
      },
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-servers-title">Servers</h1>
            <p className="text-muted-foreground">Manage your Fleetbase server connections. All fleet data comes from the active server.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setTestResult(null); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-server">
                <Plus className="mr-2 h-4 w-4" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Fleetbase Server</DialogTitle>
                <DialogDescription>Enter the connection details for your Fleetbase server.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="server-name">Server Name</Label>
                  <Input id="server-name" placeholder="e.g. Production, Staging, Dev" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-server-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server-org">Organization / Tenant</Label>
                  <Input id="server-org" placeholder="e.g. Dakkah CityOS, Node A" value={organization} onChange={(e) => setOrganization(e.target.value)} data-testid="input-server-organization" />
                  <p className="text-xs text-muted-foreground">The company or tenant this API key is scoped to</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server-url">Server URL</Label>
                  <Input id="server-url" placeholder="https://api.fleetbase.io" value={url} onChange={(e) => setUrl(e.target.value)} data-testid="input-server-url" />
                  <p className="text-xs text-muted-foreground">The base URL of your Fleetbase API (e.g. https://api.fleetbase.io)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server-api-key">API Key</Label>
                  <Input id="server-api-key" type="password" placeholder="Your Fleetbase API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} data-testid="input-server-api-key" />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-3">CityOS Context</p>
                  <p className="text-xs text-muted-foreground mb-3">These values are automatically sent with every API request to filter data by tenant. Set them based on your organization's CityOS setup.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Country</Label>
                      <Input placeholder="e.g. Saudi Arabia" value={cityosCountry} onChange={(e) => setCityosCountry(e.target.value)} className="h-8 text-sm" data-testid="input-server-cityos-country" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <Input placeholder="e.g. Riyadh" value={cityosCity} onChange={(e) => setCityosCity(e.target.value)} className="h-8 text-sm" data-testid="input-server-cityos-city" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tenant</Label>
                      <Input placeholder="e.g. Dakkah" value={cityosTenant} onChange={(e) => setCityosTenant(e.target.value)} className="h-8 text-sm" data-testid="input-server-cityos-tenant" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Channel</Label>
                      <Input placeholder="e.g. delivery" value={cityosChannel} onChange={(e) => setCityosChannel(e.target.value)} className="h-8 text-sm" data-testid="input-server-cityos-channel" />
                    </div>
                  </div>
                </div>
                {testResult && (
                  <div className={`p-3 rounded-lg text-sm ${testResult.connected ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`} data-testid="text-test-result">
                    {testResult.connected ? "Connection successful!" : `Connection failed: ${testResult.error}`}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleTest} disabled={testing || !url || !apiKey} data-testid="button-test-connection">
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Test Connection
                </Button>
                <Button onClick={handleCreate} disabled={!name || !url || !apiKey || createServer.isPending} data-testid="button-save-server">
                  {createServer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Server
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !servers || servers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CloudOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-servers">No servers configured</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Add your first Fleetbase server to start managing your fleet operations. You can add multiple servers and switch between them.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-server">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {servers.map((server) => (
              <Card key={server.id} className={server.is_active ? "border-green-500 border-2" : ""} data-testid={`card-server-${server.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className={`h-5 w-5 ${server.is_active ? "text-green-500" : "text-muted-foreground"}`} />
                      <div>
                        <CardTitle className="text-lg">{server.name}</CardTitle>
                        {server.organization && (
                          <p className="text-sm text-muted-foreground">{server.organization}</p>
                        )}
                        <CardDescription className="font-mono text-xs">{server.url}</CardDescription>
                        {((server as any).cityos_country || (server as any).cityos_city || (server as any).cityos_tenant || (server as any).cityos_channel) && (
                          <p className="text-xs text-blue-600 mt-1">
                            CityOS: {[(server as any).cityos_country, (server as any).cityos_city, (server as any).cityos_tenant, (server as any).cityos_channel].filter(Boolean).join(" / ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {server.is_active ? (
                        <Badge className="bg-green-500/20 text-green-700 border-green-300">
                          <Check className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {server.last_connected
                        ? `Last connected: ${new Date(server.last_connected).toLocaleString()}`
                        : "Never connected"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingServer({ id: server.id, name: server.name, organization: server.organization || "", url: server.url, api_key: server.api_key, cityos_country: (server as any).cityos_country || "", cityos_city: (server as any).cityos_city || "", cityos_tenant: (server as any).cityos_tenant || "", cityos_channel: (server as any).cityos_channel || "" });
                          setTestResult(null);
                          setEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-server-${server.id}`}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      {!server.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(server.id, server.name)}
                          disabled={activateServer.isPending}
                          data-testid={`button-activate-server-${server.id}`}
                        >
                          {activateServer.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                          Set Active
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-delete-server-${server.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove server?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{server.name}" from your saved servers. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(server.id)} className="bg-red-600 hover:bg-red-700">
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingServer(null); setTestResult(null); } }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Server</DialogTitle>
              <DialogDescription>Update the connection details for this server.</DialogDescription>
            </DialogHeader>
            {editingServer && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Server Name</Label>
                  <Input value={editingServer.name} onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })} data-testid="input-edit-server-name" />
                </div>
                <div className="space-y-2">
                  <Label>Organization / Tenant</Label>
                  <Input placeholder="e.g. Dakkah CityOS, Node A" value={editingServer.organization} onChange={(e) => setEditingServer({ ...editingServer, organization: e.target.value })} data-testid="input-edit-server-organization" />
                  <p className="text-xs text-muted-foreground">The company or tenant this API key is scoped to</p>
                </div>
                <div className="space-y-2">
                  <Label>Server URL</Label>
                  <Input value={editingServer.url} onChange={(e) => setEditingServer({ ...editingServer, url: e.target.value })} data-testid="input-edit-server-url" />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={editingServer.api_key} onChange={(e) => setEditingServer({ ...editingServer, api_key: e.target.value })} data-testid="input-edit-server-api-key" />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-3">CityOS Context</p>
                  <p className="text-xs text-muted-foreground mb-3">Automatically sent with every API request to scope data to this organization's tenant.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Country</Label>
                      <Input placeholder="e.g. Saudi Arabia" value={editingServer.cityos_country} onChange={(e) => setEditingServer({ ...editingServer, cityos_country: e.target.value })} className="h-8 text-sm" data-testid="input-edit-cityos-country" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <Input placeholder="e.g. Riyadh" value={editingServer.cityos_city} onChange={(e) => setEditingServer({ ...editingServer, cityos_city: e.target.value })} className="h-8 text-sm" data-testid="input-edit-cityos-city" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tenant</Label>
                      <Input placeholder="e.g. Dakkah" value={editingServer.cityos_tenant} onChange={(e) => setEditingServer({ ...editingServer, cityos_tenant: e.target.value })} className="h-8 text-sm" data-testid="input-edit-cityos-tenant" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Channel</Label>
                      <Input placeholder="e.g. delivery" value={editingServer.cityos_channel} onChange={(e) => setEditingServer({ ...editingServer, cityos_channel: e.target.value })} className="h-8 text-sm" data-testid="input-edit-cityos-channel" />
                    </div>
                  </div>
                </div>
                {testResult && (
                  <div className={`p-3 rounded-lg text-sm ${testResult.connected ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {testResult.connected ? "Connection successful!" : `Connection failed: ${testResult.error}`}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleTest} disabled={testing} data-testid="button-test-edit-connection">
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Test
              </Button>
              <Button onClick={handleUpdate} disabled={updateServer.isPending} data-testid="button-update-server">
                {updateServer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
