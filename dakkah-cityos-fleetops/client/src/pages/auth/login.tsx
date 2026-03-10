import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Server, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"select" | "new">("select");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { connect, savedServers, savedServersLoading } = useAuth();

  const handleConnectNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await connect({ url, api_key: apiKey, name: name || undefined, organization: organization || undefined });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectExisting = async (serverId: string) => {
    setError("");
    setLoading(true);
    try {
      await connect({ serverId });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const hasSavedServers = savedServers.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 font-bold text-2xl text-primary">
            <div className="h-10 w-10 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
            FleetOps
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Connect to Server</CardTitle>
            <CardDescription>
              Connect to a Fleetbase server using your API key
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSavedServers && mode === "select" && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Saved Servers</Label>
                {savedServersLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <div className="space-y-2">
                    {savedServers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleConnectExisting(s.id)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                        data-testid={`server-${s.id}`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Server className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.organization || s.url}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="outline" className="w-full" onClick={() => setMode("new")} data-testid="button-new-server">
                    Connect to a new server
                  </Button>
                </div>
              </div>
            )}

            {(!hasSavedServers || mode === "new") && (
              <form onSubmit={handleConnectNew} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-name">Server Name</Label>
                  <Input
                    id="server-name"
                    placeholder="My Fleetbase Server"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-server-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server-url">Server URL <span className="text-red-500">*</span></Label>
                  <Input
                    id="server-url"
                    placeholder="https://api.fleetbase.io"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    data-testid="input-server-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key <span className="text-red-500">*</span></Label>
                  <Input
                    id="api-key"
                    placeholder="flb_live_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    data-testid="input-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    placeholder="My Organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    data-testid="input-organization"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !url || !apiKey} data-testid="button-connect">
                  {loading ? "Connecting..." : "Connect"}
                </Button>
                {hasSavedServers && (
                  <Button variant="ghost" className="w-full" onClick={() => setMode("select")} data-testid="button-back-to-list">
                    Back to saved servers
                  </Button>
                )}
              </form>
            )}

            {error && <p className="mt-4 text-sm text-red-500 text-center" data-testid="text-error">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
