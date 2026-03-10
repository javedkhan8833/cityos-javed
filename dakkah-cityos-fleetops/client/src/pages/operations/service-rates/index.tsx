import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { serviceRatesApi, serviceZonesApi } from "@/lib/api";
import type { ServiceRate } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, DollarSign, Map, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ServiceRatesPage() {
  const { data: rates = [] } = serviceRatesApi.useList();
  const { data: zones = [] } = serviceZonesApi.useList();
  const createRate = serviceRatesApi.useCreate();
  const updateRate = serviceRatesApi.useUpdate();
  const deleteRate = serviceRatesApi.useDelete();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ServiceRate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    service_type: "on_demand",
    zone: "",
    currency: "USD",
    base_fee: "5.00",
    per_km_flat_rate_fee: "1.50",
    algorithm: "distance_and_time",
    rate_calculation_method: "fixed_meter",
  });

  const openCreate = () => {
    setEditingRate(null);
    setFormData({ name: "", service_type: "on_demand", zone: "", currency: "USD", base_fee: "5.00", per_km_flat_rate_fee: "1.50", algorithm: "distance_and_time", rate_calculation_method: "fixed_meter" });
    setIsSheetOpen(true);
  };

  const openEdit = (rate: ServiceRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      service_type: rate.service_type,
      zone: rate.zone_uuid ?? "",
      currency: rate.currency,
      base_fee: rate.base_fee ?? "0",
      per_km_flat_rate_fee: rate.per_km_flat_rate_fee ?? "0",
      algorithm: rate.algorithm ?? "distance_and_time",
      rate_calculation_method: rate.rate_calculation_method ?? "fixed_meter",
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Rate name is required.", variant: "destructive" });
      return;
    }
    if (editingRate) {
      updateRate.mutate({ id: editingRate.id, ...formData } as any, {
        onSuccess: () => {
          toast({ title: "Updated", description: "Service rate updated successfully." });
          setIsSheetOpen(false);
        },
      });
    } else {
      createRate.mutate(formData as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Service rate created successfully." });
          setIsSheetOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRate.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Service rate deleted." });
        setDeleteId(null);
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-service-rates-title">Service Rates</h1>
            <p className="text-muted-foreground">Configure delivery pricing, distance calculations, and surcharges.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-rate">
            <Plus className="mr-2 h-4 w-4" />
            Add Rate
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Base Rate</TableHead>
                <TableHead>Per KM Rate</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No service rates configured yet. Click "Add Rate" to create one.
                  </TableCell>
                </TableRow>
              )}
              {rates.map((rate) => (
                <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {rate.service_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-muted-foreground" />
                      {rate.zone_uuid || "Global"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {parseFloat(rate.base_fee ?? "0").toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {parseFloat(rate.per_km_flat_rate_fee ?? "0").toFixed(2)} / km
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rate.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-rate-actions-${rate.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rate)} data-testid={`button-edit-rate-${rate.id}`}>Edit Rate</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => createRate.mutate({ ...rate, name: `${rate.name} (Copy)` } as any, {
                            onSuccess: () => toast({ title: "Duplicated", description: "Rate duplicated." }),
                          })}
                        >
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{editingRate ? "Edit Service Rate" : "Create Service Rate"}</SheetTitle>
                <SheetDescription>
                    Define pricing logic for deliveries within specific zones or globally.
                </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing Logic</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rate-name">Rate Name</Label>
                            <Input
                              id="rate-name"
                              placeholder="e.g. Downtown Express"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              data-testid="input-rate-name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Service Type</Label>
                                <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                                    <SelectTrigger data-testid="select-service-type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="on_demand">On-Demand</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="same_day">Same Day</SelectItem>
                                        <SelectItem value="parcel">Parcel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Service Zone</Label>
                                <Select value={formData.zone} onValueChange={(v) => setFormData({ ...formData, zone: v })}>
                                    <SelectTrigger data-testid="select-zone">
                                        <SelectValue placeholder="Global (All Zones)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global</SelectItem>
                                        {zones.map(z => (
                                            <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                             <Label>Currency</Label>
                             <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                                <SelectTrigger data-testid="select-currency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="SAR">SAR (﷼)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-6 pt-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Base Fee</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              className="pl-9"
                                              placeholder="0.00"
                                              value={formData.base_fee}
                                              onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
                                              data-testid="input-base-rate"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Starting price for the service.</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Per Kilometer</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              className="pl-9"
                                              placeholder="0.00"
                                              value={formData.per_km_flat_rate_fee}
                                              onChange={(e) => setFormData({ ...formData, per_km_flat_rate_fee: e.target.value })}
                                              data-testid="input-per-km-rate"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Added for every km travelled.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={createRate.isPending || updateRate.isPending} data-testid="button-save-rate">
                      {createRate.isPending || updateRate.isPending ? "Saving..." : "Save Service Rate"}
                    </Button>
                </div>
            </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Rate</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this service rate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-rate">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
