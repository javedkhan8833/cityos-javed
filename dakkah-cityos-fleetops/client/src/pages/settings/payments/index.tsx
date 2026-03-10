import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Switch } from "@/components/ui/switch";
import { CreditCard, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function PaymentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("payments");
  const bulkUpsert = useBulkUpsertSettings();

  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(false);
  const [currency, setCurrency] = useState("USD ($)");
  const [taxRate, setTaxRate] = useState("0");

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      if (map.stripeEnabled !== undefined) setStripeEnabled(map.stripeEnabled === "true");
      if (map.codEnabled !== undefined) setCodEnabled(map.codEnabled === "true");
      if (map.currency) setCurrency(map.currency);
      if (map.taxRate) setTaxRate(map.taxRate);
    }
  }, [settings]);

  const persistAll = (overrides?: Record<string, string>) => {
    const current = {
      stripeEnabled: String(stripeEnabled),
      codEnabled: String(codEnabled),
      currency,
      taxRate,
      ...overrides,
    };
    bulkUpsert.mutate(
      { category: "payments", settings: current },
      {
        onSuccess: () => toast({ title: "Saved", description: "Payment settings saved." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleStripeToggle = (checked: boolean) => {
    setStripeEnabled(checked);
    persistAll({ stripeEnabled: String(checked) });
  };

  const handleCodToggle = (checked: boolean) => {
    setCodEnabled(checked);
    persistAll({ codEnabled: String(checked) });
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
            <h1 className="text-3xl font-bold tracking-tight">Payments & Billing</h1>
            <p className="text-muted-foreground">Configure payment gateways, currency settings, and invoicing.</p>
        </div>

        <Tabs defaultValue="gateways">
            <TabsList>
                <TabsTrigger value="gateways">Gateways</TabsTrigger>
                <TabsTrigger value="currency">Currency & Tax</TabsTrigger>
                <TabsTrigger value="invoices">Invoicing</TabsTrigger>
            </TabsList>

            <TabsContent value="gateways" className="mt-4 grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <CardTitle>Stripe</CardTitle>
                        </div>
                        <Switch checked={stripeEnabled} onCheckedChange={handleStripeToggle} data-testid="switch-stripe" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Publishable Key</Label>
                            <Input type="password" value="pk_live_................" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label>Secret Key</Label>
                            <Input type="password" value="sk_live_................" readOnly />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/developers')} data-testid="button-configure-webhooks">Configure Webhooks</Button>
                    </CardFooter>
                </Card>

                <Card className={codEnabled ? "" : "opacity-75"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            <CardTitle>Cash on Delivery</CardTitle>
                        </div>
                        <Switch checked={codEnabled} onCheckedChange={handleCodToggle} data-testid="switch-cod" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <p className="text-sm text-muted-foreground">Enable drivers to collect cash payments upon delivery.</p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="currency" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Regional Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Default Currency</Label>
                                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} data-testid="input-currency" />
                            </div>
                            <div className="space-y-2">
                                <Label>Tax Rate (%)</Label>
                                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} data-testid="input-tax-rate" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4">
                        <Button onClick={() => persistAll()} disabled={bulkUpsert.isPending} data-testid="button-save-payments">
                          {bulkUpsert.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                          Save Payment Settings
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
}