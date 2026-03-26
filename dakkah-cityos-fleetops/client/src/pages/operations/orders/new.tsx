import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { ordersApi, contactsApi, driversApi, placesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PICKUP_COORDINATES: [number, number] = [46.6753, 24.7136];
const DEFAULT_DROPOFF_COORDINATES: [number, number] = [46.6853, 24.7236];

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function resolveCountry(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "SA";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  if (trimmed.toLowerCase().includes("saudi")) return "SA";
  return trimmed;
}

function hasPointCoordinates(location: any): location is { coordinates: [number, number] } {
  return Array.isArray(location?.coordinates)
    && location.coordinates.length >= 2
    && typeof location.coordinates[0] === "number"
    && typeof location.coordinates[1] === "number";
}

export default function CreateOrderPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { server } = useAuth();
  const createOrder = ordersApi.useCreate();
  const { data: contacts = [] } = contactsApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const { data: places = [] } = placesApi.useList({ enabled: step >= 2, retry: 0 });

  const [formData, setFormData] = useState({
    customer: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    pickupAddress: "",
    pickupUnit: "",
    pickupDate: "",
    pickupTimeFrom: "",
    pickupTimeTo: "",
    dropoffAddress: "",
    dropoffUnit: "",
    itemDescription: "",
    itemQuantity: "1",
    itemWeight: "",
    itemLength: "",
    itemHeight: "",
    type: "standard",
    driverAssignment: "auto",
    notes: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const getPrice = () => {
    switch (formData.type) {
      case "express": return "35.00";
      case "freight": return "120.00";
      default: return "15.00";
    }
  };

  const generateTrackingNumber = () => {
    const prefix = "FO";
    const num = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${num}`;
  };

  const handleSubmit = async () => {
    if (!formData.pickupAddress.trim() || !formData.dropoffAddress.trim()) {
      toast({
        title: "Missing Locations",
        description: "Pickup and dropoff addresses are required before creating an order.",
        variant: "destructive",
      });
      setStep(2);
      return;
    }

    const customerName = formData.customer === "new"
      ? `${formData.firstName} ${formData.lastName}`.trim()
      : contacts.find(c => c.id === formData.customer)?.name ?? `${formData.firstName} ${formData.lastName}`.trim();

    const findMatchingPlace = (address: string) => {
      const normalizedAddress = normalizeSearchValue(address);
      if (!normalizedAddress) return undefined;

      return places.find((place) => {
        const candidates = [
          place.name,
          place.street1,
          [place.street1, place.city, place.province, place.country].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .map((candidate) => normalizeSearchValue(candidate));

        return candidates.some((candidate) =>
          candidate === normalizedAddress
          || candidate.includes(normalizedAddress)
          || normalizedAddress.includes(candidate)
        );
      });
    };

    const buildStop = (kind: "pickup" | "dropoff", address: string, unit: string) => {
      const matchedPlace = findMatchingPlace(address);
      const fallbackCoordinates = kind === "pickup"
        ? DEFAULT_PICKUP_COORDINATES
        : DEFAULT_DROPOFF_COORDINATES;
      const coordinates = hasPointCoordinates(matchedPlace?.location)
        ? matchedPlace.location.coordinates
        : fallbackCoordinates;

      return {
        name: matchedPlace?.name || `${kind === "pickup" ? "Pickup" : "Dropoff"} ${customerName || "Location"}`.trim(),
        street1: matchedPlace?.street1 || address.trim(),
        street2: matchedPlace?.street2 || unit.trim() || undefined,
        city: matchedPlace?.city || server?.cityos_city || "Riyadh",
        country: resolveCountry(matchedPlace?.country || server?.cityos_country),
        location: {
          type: "Point",
          coordinates,
        },
        meta: {
          source: matchedPlace ? "saved_place" : "manual_entry",
          unit: unit.trim() || undefined,
        },
      };
    };

    const pickup = buildStop("pickup", formData.pickupAddress, formData.pickupUnit);
    const dropoff = buildStop("dropoff", formData.dropoffAddress, formData.dropoffUnit);
    const scheduledAt = formData.pickupDate && formData.pickupTimeFrom
      ? new Date(`${formData.pickupDate}T${formData.pickupTimeFrom}`).toISOString()
      : undefined;
    const trackingNumber = generateTrackingNumber();

    createOrder.mutate({
      type: "default",
      notes: formData.notes || undefined,
      scheduled_at: scheduledAt,
      pickup,
      dropoff,
      waypoints: [pickup, dropoff],
      customer_uuid: formData.customer && formData.customer !== "new" ? formData.customer : undefined,
      driver_assigned_uuid: formData.driverAssignment !== "auto" && formData.driverAssignment !== "broadcast"
        ? formData.driverAssignment
        : undefined,
      meta: {
        tracking_number: trackingNumber,
        quoted_amount: getPrice(),
        quoted_currency: "SAR",
        service_type: formData.type,
        item_description: formData.itemDescription || undefined,
        item_quantity: Number(formData.itemQuantity || "1") || 1,
        item_weight: formData.itemWeight || undefined,
        item_length: formData.itemLength || undefined,
        item_height: formData.itemHeight || undefined,
        pickup_window: formData.pickupDate || formData.pickupTimeFrom || formData.pickupTimeTo
          ? {
              date: formData.pickupDate || undefined,
              from: formData.pickupTimeFrom || undefined,
              to: formData.pickupTimeTo || undefined,
            }
          : undefined,
        contact_name: customerName || undefined,
        contact_phone: formData.phone || undefined,
        contact_email: formData.email || undefined,
      },
    } as any, {
      onSuccess: () => {
        toast({
          title: "Order Created",
          description: `Order has been created successfully.`,
        });
        setLocation("/operations/orders");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create order",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create New Order</h1>
            <p className="text-muted-foreground">Follow the steps to book a new delivery or service.</p>
        </div>

        <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />
            {['Customer', 'Locations', 'Payload', 'Service'].map((label, i) => {
                const stepNum = i + 1;
                const isActive = step >= stepNum;
                const isCompleted = step > stepNum;
                return (
                    <div key={label} className="flex flex-col items-center gap-2 bg-background px-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted-foreground'}`}>
                            {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : stepNum}
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>

        <Card>
            <CardContent className="pt-6">
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label>Select Customer</Label>
                                <Select value={formData.customer} onValueChange={v => updateField("customer", v)}>
                                    <SelectTrigger data-testid="select-customer">
                                        <SelectValue placeholder="Search existing customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contacts.filter(c => c.type === "customer").map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                        <SelectItem value="new">+ Create New Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator className="my-2" />
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input placeholder="Jane" value={formData.firstName} onChange={e => updateField("firstName", e.target.value)} data-testid="input-first-name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input placeholder="Doe" value={formData.lastName} onChange={e => updateField("lastName", e.target.value)} data-testid="input-last-name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => updateField("phone", e.target.value)} data-testid="input-phone" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input placeholder="jane@example.com" value={formData.email} onChange={e => updateField("email", e.target.value)} data-testid="input-email" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-lg">
                                <MapPin className="h-5 w-5 text-green-600" />
                                Pickup Location
                            </div>
                            <div className="grid gap-4 pl-7">
                                <Input placeholder="Search address..." value={formData.pickupAddress} onChange={e => updateField("pickupAddress", e.target.value)} data-testid="input-pickup-address" />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input placeholder="Unit / Suite" value={formData.pickupUnit} onChange={e => updateField("pickupUnit", e.target.value)} />
                                    <Input placeholder="Access Code" />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Pickup Date</Label>
                                        <Input type="date" value={formData.pickupDate} onChange={e => updateField("pickupDate", e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pickup Time Window</Label>
                                        <div className="flex gap-2">
                                            <Input type="time" value={formData.pickupTimeFrom} onChange={e => updateField("pickupTimeFrom", e.target.value)} />
                                            <span className="self-center">-</span>
                                            <Input type="time" value={formData.pickupTimeTo} onChange={e => updateField("pickupTimeTo", e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-lg">
                                <MapPin className="h-5 w-5 text-red-600" />
                                Dropoff Location
                            </div>
                            <div className="grid gap-4 pl-7">
                                <Input placeholder="Search address..." value={formData.dropoffAddress} onChange={e => updateField("dropoffAddress", e.target.value)} data-testid="input-dropoff-address" />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input placeholder="Unit / Suite" value={formData.dropoffUnit} onChange={e => updateField("dropoffUnit", e.target.value)} />
                                    <Input placeholder="Access Code" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Items</h3>
                                <Button variant="outline" size="sm" data-testid="button-add-item" onClick={() => toast({ title: "Item Added", description: "Additional item slot added to this order." })}>Add Item</Button>
                            </div>
                            <div className="border rounded-md p-4 space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input placeholder="e.g. Box of documents" value={formData.itemDescription} onChange={e => updateField("itemDescription", e.target.value)} data-testid="input-item-description" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input type="number" value={formData.itemQuantity} onChange={e => updateField("itemQuantity", e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Weight (kg)</Label>
                                        <Input type="number" value={formData.itemWeight} onChange={e => updateField("itemWeight", e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Length (cm)</Label>
                                        <Input type="number" value={formData.itemLength} onChange={e => updateField("itemLength", e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Height (cm)</Label>
                                        <Input type="number" value={formData.itemHeight} onChange={e => updateField("itemHeight", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base">Select Service Type</Label>
                            <div className="grid md:grid-cols-3 gap-4">
                                {[
                                    { value: "standard", label: "Standard", time: "2-3 Days", price: "$15.00" },
                                    { value: "express", label: "Express", time: "Same Day", price: "$35.00" },
                                    { value: "freight", label: "Freight", time: "Palletized", price: "$120.00" },
                                ].map(svc => (
                                    <div
                                        key={svc.value}
                                        className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${formData.type === svc.value ? 'bg-secondary/10 border-primary' : ''}`}
                                        onClick={() => updateField("type", svc.value)}
                                        data-testid={`service-type-${svc.value}`}
                                    >
                                        <div className="font-semibold">{svc.label}</div>
                                        <div className="text-sm text-muted-foreground mt-1">{svc.time}</div>
                                        <div className="font-bold mt-2">{svc.price}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Driver Assignment</Label>
                            <Select value={formData.driverAssignment} onValueChange={v => updateField("driverAssignment", v)}>
                                <SelectTrigger data-testid="select-driver-assignment">
                                    <SelectValue placeholder="Auto-Assign (Smart Dispatch)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto-Assign (Smart Dispatch)</SelectItem>
                                    <SelectItem value="broadcast">Broadcast to nearby drivers</SelectItem>
                                    {drivers.filter(d => d.status === "active" || d.status === "online").map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Internal Notes</Label>
                            <Textarea placeholder="Notes for dispatchers..." value={formData.notes} onChange={e => updateField("notes", e.target.value)} data-testid="input-notes" />
                        </div>
                    </div>
                )}
            </CardContent>
            <div className="p-6 border-t bg-muted/10 flex justify-between">
                <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={step === 1}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {step < 4 ? (
                    <Button onClick={nextStep} data-testid="button-next-step">
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleSubmit}
                        disabled={createOrder.isPending}
                        data-testid="button-confirm-create-order"
                    >
                        {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Create Order
                    </Button>
                )}
            </div>
        </Card>
      </div>
    </MainLayout>
  );
}
