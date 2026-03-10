import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, CheckCircle2, Building, MapPin, Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBulkUpsertSettings } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const bulkUpsert = useBulkUpsertSettings();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [vehicleCount, setVehicleCount] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const handleNext = () => {
    if (step < 3) {
        setStep(step + 1);
    } else {
        bulkUpsert.mutate(
          {
            category: "onboarding",
            settings: { companyName, industry, teamSize, address, city, postalCode, country, vehicleCount, vehicleType },
          },
          {
            onSuccess: () => {
              toast({ title: "Setup complete", description: "Your organization has been configured." });
              setLocation("/");
            },
            onError: (error: Error) => {
              toast({ title: "Error", description: error.message, variant: "destructive" });
            },
          }
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-2xl text-primary mb-4">
                <div className="h-10 w-10 rounded bg-primary text-primary-foreground flex items-center justify-center">
                    <Layers className="h-6 w-6" />
                </div>
                FleetOps
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to FleetOps</h1>
            <p className="text-muted-foreground">Let's get your organization set up in a few simple steps.</p>
        </div>

        <div className="mb-8">
            <div className="flex justify-between text-sm font-medium mb-2">
                <span>Organization</span>
                <span>Location</span>
                <span>Fleet</span>
            </div>
            <Progress value={step * 33.33} className="h-2" data-testid="progress-steps" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
                {step === 1 && "Organization Details"}
                {step === 2 && "Primary Operating Center"}
                {step === 3 && "Initial Fleet Setup"}
            </CardTitle>
            <CardDescription>
                {step === 1 && "Tell us about your company."}
                {step === 2 && "Where will your operations be based?"}
                {step === 3 && "Add your first few vehicles."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {step === 1 && (
                <div className="space-y-4 max-w-md mx-auto py-4">
                    <div className="flex justify-center mb-6">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input placeholder="Acme Logistics Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} data-testid="input-companyName" />
                    </div>
                    <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input placeholder="Last Mile Delivery" value={industry} onChange={(e) => setIndustry(e.target.value)} data-testid="input-industry" />
                    </div>
                    <div className="space-y-2">
                        <Label>Team Size</Label>
                        <Input type="number" placeholder="10" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} data-testid="input-teamSize" />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 max-w-md mx-auto py-4">
                    <div className="flex justify-center mb-6">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-address" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Input placeholder="San Francisco" value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-city" />
                        </div>
                        <div className="space-y-2">
                            <Label>Postal Code</Label>
                            <Input placeholder="94105" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} data-testid="input-postalCode" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Country</Label>
                        <Input placeholder="United States" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="input-country" />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 max-w-md mx-auto py-4">
                    <div className="flex justify-center mb-6">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>How many vehicles do you have?</Label>
                        <Input type="number" placeholder="5" value={vehicleCount} onChange={(e) => setVehicleCount(e.target.value)} data-testid="input-vehicleCount" />
                    </div>
                    <div className="space-y-2">
                        <Label>Primary Vehicle Type</Label>
                        <Input placeholder="Vans, Trucks, Scooters..." value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} data-testid="input-vehicleType" />
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3 mt-6">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium">You're all set!</p>
                            <p className="text-muted-foreground">Click Finish to enter your dashboard and start managing your fleet.</p>
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} data-testid="button-back">
                Back
            </Button>
            <Button onClick={handleNext} disabled={bulkUpsert.isPending} data-testid="button-next">
                {step === 3 ? "Finish Setup" : "Continue"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
