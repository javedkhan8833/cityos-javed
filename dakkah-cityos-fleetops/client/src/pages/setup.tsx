import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Server, Check, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SetupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [server, setServer] = useState({
    name: "",
    url: "",
    api_key: "",
    organization: "",
    cityos_country: "",
    cityos_city: "",
    cityos_tenant: "",
    cityos_channel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(server),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Setup failed" }));
        throw new Error(err.error || "Setup failed");
      }
      const data = await res.json();
      queryClient.setQueryData(["auth", "me"], data.server);
      queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "servers"] });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = server.name.length > 0 && server.url.length > 0 && server.api_key.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-lg p-4">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 font-bold text-2xl text-primary">
            <div className="h-10 w-10 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
            FleetOps
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold">Welcome to FleetOps</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect to your Fleetbase server to get started</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Server className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Connect Fleetbase Server</CardTitle>
                <CardDescription>Enter your server URL and API key to authenticate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-name">Server Name <span className="text-red-500">*</span></Label>
                <Input
                  id="server-name"
                  placeholder="Production Server"
                  value={server.name}
                  onChange={(e) => setServer({ ...server, name: e.target.value })}
                  required
                  data-testid="input-server-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-url">Server URL <span className="text-red-500">*</span></Label>
                <Input
                  id="server-url"
                  placeholder="https://api.fleetbase.io"
                  value={server.url}
                  onChange={(e) => setServer({ ...server, url: e.target.value })}
                  required
                  data-testid="input-server-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-api-key">API Key <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="server-api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder="flb_live_..."
                    value={server.api_key}
                    onChange={(e) => setServer({ ...server, api_key: e.target.value })}
                    required
                    data-testid="input-server-api-key"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-org">Organization / Tenant Label</Label>
                <Input
                  id="server-org"
                  placeholder="My Organization"
                  value={server.organization}
                  onChange={(e) => setServer({ ...server, organization: e.target.value })}
                  data-testid="input-server-org"
                />
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                  CityOS Context (optional)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cityos-country" className="text-xs">Country</Label>
                    <Input
                      id="cityos-country"
                      placeholder="SA"
                      value={server.cityos_country}
                      onChange={(e) => setServer({ ...server, cityos_country: e.target.value })}
                      data-testid="input-cityos-country"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cityos-city" className="text-xs">City</Label>
                    <Input
                      id="cityos-city"
                      placeholder="Riyadh"
                      value={server.cityos_city}
                      onChange={(e) => setServer({ ...server, cityos_city: e.target.value })}
                      data-testid="input-cityos-city"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cityos-tenant" className="text-xs">Tenant</Label>
                    <Input
                      id="cityos-tenant"
                      placeholder="tenant-id"
                      value={server.cityos_tenant}
                      onChange={(e) => setServer({ ...server, cityos_tenant: e.target.value })}
                      data-testid="input-cityos-tenant"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cityos-channel" className="text-xs">Channel</Label>
                    <Input
                      id="cityos-channel"
                      placeholder="channel-id"
                      value={server.cityos_channel}
                      onChange={(e) => setServer({ ...server, cityos_channel: e.target.value })}
                      data-testid="input-cityos-channel"
                    />
                  </div>
                </div>
              </details>

              {error && <p className="text-sm text-red-500" data-testid="text-error">{error}</p>}

              <Button type="submit" className="w-full" disabled={!canSubmit || loading} data-testid="button-complete-setup">
                {loading ? "Connecting..." : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Connect & Get Started
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
