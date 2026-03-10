import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Navigation, MapPin, Battery, Shield, QrCode, Copy, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function NavigatorAppPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("navigator");
  const bulkUpsert = useBulkUpsertSettings();

  const [copied, setCopied] = useState(false);
  const instanceLink = "flb://link/instance?key=pk_test_123456789";

  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [showEarnings, setShowEarnings] = useState(true);
  const [navApp, setNavApp] = useState("google");
  const [highAccuracy, setHighAccuracy] = useState(false);
  const [proofOfDelivery, setProofOfDelivery] = useState(true);
  const [rejectOrders, setRejectOrders] = useState(true);
  const [createOrders, setCreateOrders] = useState(false);
  const [editProfile, setEditProfile] = useState(true);
  const [viewCustomerPhone, setViewCustomerPhone] = useState(false);

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      if (map.theme) setTheme(map.theme);
      if (map.language) setLanguage(map.language);
      if (map.showEarnings !== undefined) setShowEarnings(map.showEarnings === "true");
      if (map.navApp) setNavApp(map.navApp);
      if (map.highAccuracy !== undefined) setHighAccuracy(map.highAccuracy === "true");
      if (map.proofOfDelivery !== undefined) setProofOfDelivery(map.proofOfDelivery === "true");
      if (map.rejectOrders !== undefined) setRejectOrders(map.rejectOrders === "true");
      if (map.createOrders !== undefined) setCreateOrders(map.createOrders === "true");
      if (map.editProfile !== undefined) setEditProfile(map.editProfile === "true");
      if (map.viewCustomerPhone !== undefined) setViewCustomerPhone(map.viewCustomerPhone === "true");
    }
  }, [settings]);

  const copyLink = () => {
    navigator.clipboard.writeText(instanceLink);
    setCopied(true);
    toast({ title: "Copied", description: "Instance link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    bulkUpsert.mutate(
      {
        category: "navigator",
        settings: {
          theme, language,
          showEarnings: String(showEarnings),
          navApp,
          highAccuracy: String(highAccuracy),
          proofOfDelivery: String(proofOfDelivery),
          rejectOrders: String(rejectOrders),
          createOrders: String(createOrders),
          editProfile: String(editProfile),
          viewCustomerPhone: String(viewCustomerPhone),
        },
      },
      {
        onSuccess: () => toast({ title: "Saved", description: "Navigator app configuration saved." }),
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
            <h1 className="text-3xl font-bold tracking-tight">Navigator App</h1>
            <p className="text-muted-foreground">Configure the experience for the driver mobile application.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        App Interface
                    </CardTitle>
                    <CardDescription>Customize the look and feel for drivers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>App Theme</Label>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger data-testid="select-theme">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light Mode</SelectItem>
                                <SelectItem value="dark">Dark Mode</SelectItem>
                                <SelectItem value="system">System Default</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger data-testid="select-language">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <Label>Show Earnings</Label>
                            <p className="text-sm text-muted-foreground">Allow drivers to see order earnings.</p>
                        </div>
                        <Switch checked={showEarnings} onCheckedChange={setShowEarnings} data-testid="switch-show-earnings" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Navigation & Tracking
                    </CardTitle>
                    <CardDescription>GPS and routing settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label>Default Navigation App</Label>
                         <Select value={navApp} onValueChange={setNavApp}>
                            <SelectTrigger data-testid="select-nav-app">
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="google">Google Maps</SelectItem>
                                <SelectItem value="waze">Waze</SelectItem>
                                <SelectItem value="apple">Apple Maps</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <Label>High Accuracy GPS</Label>
                            <p className="text-sm text-muted-foreground">Force high accuracy (consumes more battery).</p>
                        </div>
                        <Switch checked={highAccuracy} onCheckedChange={setHighAccuracy} data-testid="switch-high-accuracy" />
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <Label>Proof of Delivery</Label>
                            <p className="text-sm text-muted-foreground">Require signature or photo on completion.</p>
                        </div>
                        <Switch checked={proofOfDelivery} onCheckedChange={setProofOfDelivery} data-testid="switch-proof-of-delivery" />
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Instance Linking
                    </CardTitle>
                    <CardDescription>Connect the mobile app to your custom Fleetbase instance.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <div className="h-32 w-32 bg-slate-900 rounded-md flex items-center justify-center text-white text-xs text-center p-2">
                            [QR Code Placeholder]
                        </div>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <Label>Instance Link URL</Label>
                            <div className="flex gap-2">
                                <Input value={instanceLink} readOnly className="font-mono text-xs" />
                                <Button variant="outline" size="icon" onClick={copyLink} data-testid="button-copy-link">
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Share this link with your drivers or have them scan the QR code to instantly connect their Navigator App to this dashboard.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Driver Permissions
                    </CardTitle>
                    <CardDescription>Control what drivers can do in the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <Label className="cursor-pointer">Reject Orders</Label>
                            <Switch checked={rejectOrders} onCheckedChange={setRejectOrders} data-testid="switch-reject-orders" />
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-md">
                             <Label className="cursor-pointer">Create Orders</Label>
                            <Switch checked={createOrders} onCheckedChange={setCreateOrders} data-testid="switch-create-orders" />
                        </div>
                         <div className="flex items-center justify-between border p-3 rounded-md">
                             <Label className="cursor-pointer">Edit Profile</Label>
                            <Switch checked={editProfile} onCheckedChange={setEditProfile} data-testid="switch-edit-profile" />
                        </div>
                         <div className="flex items-center justify-between border p-3 rounded-md">
                             <Label className="cursor-pointer">View Customer Phone</Label>
                            <Switch checked={viewCustomerPhone} onCheckedChange={setViewCustomerPhone} data-testid="switch-view-customer-phone" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={bulkUpsert.isPending} data-testid="button-save-config">
                          {bulkUpsert.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                          Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}