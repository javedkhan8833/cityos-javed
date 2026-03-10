import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MapPin, Navigation, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function RoutingSettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("routing");
  const bulkUpsert = useBulkUpsertSettings();

  const [provider, setProvider] = useState("osrm");
  const [profile, setProfile] = useState("driving");
  const [maxDistance, setMaxDistance] = useState("200");
  const [maxStops, setMaxStops] = useState("25");
  const [serviceTime, setServiceTime] = useState("5");
  const [speedFactor, setSpeedFactor] = useState("1.0");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      if (map.provider) setProvider(map.provider);
      if (map.profile) setProfile(map.profile);
      if (map.maxDistance) setMaxDistance(map.maxDistance);
      if (map.maxStops) setMaxStops(map.maxStops);
      if (map.serviceTime) setServiceTime(map.serviceTime);
      if (map.speedFactor) setSpeedFactor(map.speedFactor);
      if (map.avoidTolls !== undefined) setAvoidTolls(map.avoidTolls === "true");
      if (map.avoidHighways !== undefined) setAvoidHighways(map.avoidHighways === "true");
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpsert.mutate(
      {
        category: "routing",
        settings: {
          provider, profile, maxDistance, maxStops, serviceTime, speedFactor,
          avoidTolls: String(avoidTolls),
          avoidHighways: String(avoidHighways),
        },
      },
      {
        onSuccess: () => toast({ title: "Saved", description: "Routing profile saved." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Routing Configuration</h1>
            <p className="text-muted-foreground">Manage routing engines, optimization parameters, and provider settings.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Routing Engine
                    </CardTitle>
                    <CardDescription>Select the primary provider for route calculations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger data-testid="select-provider">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="osrm">OSRM (Open Source)</SelectItem>
                                <SelectItem value="google">Google Directions API</SelectItem>
                                <SelectItem value="mapbox">Mapbox Route API</SelectItem>
                                <SelectItem value="here">HERE Routing</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Note: Commercial providers (Google, Mapbox) require valid API keys in Developer settings.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Optimization Profile</Label>
                        <Select value={profile} onValueChange={setProfile}>
                            <SelectTrigger data-testid="select-profile">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="driving">Driving (Standard)</SelectItem>
                                <SelectItem value="truck">Truck / Heavy Goods</SelectItem>
                                <SelectItem value="bicycle">Bicycle / Scooter</SelectItem>
                                <SelectItem value="walking">Walking</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Constraints & Defaults
                    </CardTitle>
                    <CardDescription>Set global limits for route optimization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Max Distance (km)</Label>
                            <Input type="number" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} data-testid="input-max-distance" />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Stops per Route</Label>
                            <Input type="number" value={maxStops} onChange={(e) => setMaxStops(e.target.value)} data-testid="input-max-stops" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Service Time (min)</Label>
                            <Input type="number" value={serviceTime} onChange={(e) => setServiceTime(e.target.value)} data-testid="input-service-time" />
                        </div>
                        <div className="space-y-2">
                            <Label>Speed Factor</Label>
                            <Input type="number" value={speedFactor} onChange={(e) => setSpeedFactor(e.target.value)} data-testid="input-speed-factor" />
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <Label>Avoid Tolls</Label>
                        <Switch checked={avoidTolls} onCheckedChange={setAvoidTolls} data-testid="switch-avoid-tolls" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Avoid Highways</Label>
                        <Switch checked={avoidHighways} onCheckedChange={setAvoidHighways} data-testid="switch-avoid-highways" />
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t pt-4">
                    <Button className="w-full" onClick={handleSave} disabled={bulkUpsert.isPending} data-testid="button-save-routing">
                      {bulkUpsert.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Save Routing Profile
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}