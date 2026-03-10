import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function OrganizationPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("organization");
  const bulkUpsert = useBulkUpsertSettings();

  const [companyName, setCompanyName] = useState("FleetOps Logistics Inc.");
  const [taxId, setTaxId] = useState("US-123456789");
  const [industry, setIndustry] = useState("logistics");
  const [website, setWebsite] = useState("https://fleetops.com");
  const [street, setStreet] = useState("123 Innovation Drive");
  const [city, setCity] = useState("San Francisco");
  const [state, setState] = useState("CA");
  const [postalCode, setPostalCode] = useState("94105");
  const [country, setCountry] = useState("us");

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      if (map.companyName) setCompanyName(map.companyName);
      if (map.taxId) setTaxId(map.taxId);
      if (map.industry) setIndustry(map.industry);
      if (map.website) setWebsite(map.website);
      if (map.street) setStreet(map.street);
      if (map.city) setCity(map.city);
      if (map.state) setState(map.state);
      if (map.postalCode) setPostalCode(map.postalCode);
      if (map.country) setCountry(map.country);
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpsert.mutate(
      { category: "organization", settings: { companyName, taxId, industry, website, street, city, state, postalCode, country } },
      {
        onSuccess: () => toast({ title: "Saved", description: "Organization details saved." }),
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
            <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
            <p className="text-muted-foreground">Manage your company details and branding.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Details
                </CardTitle>
                <CardDescription>These details will appear on invoices and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} data-testid="input-company-name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax ID / VAT Number</Label>
                        <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} data-testid="input-tax-id" />
                    </div>
                    <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={industry} onValueChange={setIndustry}>
                            <SelectTrigger data-testid="select-industry">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="logistics">Logistics & Transportation</SelectItem>
                                <SelectItem value="retail">Retail & E-commerce</SelectItem>
                                <SelectItem value="services">Field Services</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Website</Label>
                        <Input value={website} onChange={(e) => setWebsite(e.target.value)} data-testid="input-website" />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Headquarters Address
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} data-testid="input-street" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-city" />
                    </div>
                    <div className="space-y-2">
                        <Label>State/Province</Label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} data-testid="input-state" />
                    </div>
                    <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} data-testid="input-postal-code" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger data-testid="select-country">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="sa">Saudi Arabia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
                <Button onClick={handleSave} disabled={bulkUpsert.isPending} data-testid="button-save-org">
                  {bulkUpsert.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Save Organization Details
                </Button>
            </CardFooter>
        </Card>
      </div>
    </SettingsLayout>
  );
}