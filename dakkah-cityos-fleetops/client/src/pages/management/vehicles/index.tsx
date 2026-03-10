import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { vehiclesApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, Download, MoreHorizontal, Car, Truck, Bike, MapPin, Wrench, Loader2, Trash2, Pencil } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function VehiclesPage() {
  const [, navigate] = useLocation();
  const { data: vehicles = [] } = vehiclesApi.useList();
  const createVehicle = vehiclesApi.useCreate();
  const deleteVehicle = vehiclesApi.useDelete();
  const updateVehicle = vehiclesApi.useUpdate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newVehicle, setNewVehicle] = useState({ plate_number: "", make: "", model: "", type: "van" });

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getIcon = (type: string) => {
      switch(type) {
          case 'truck': return <Truck className="h-4 w-4" />;
          case 'van': return <Car className="h-4 w-4" />;
          case 'scooter': return <Bike className="h-4 w-4" />;
          default: return <Car className="h-4 w-4" />;
      }
  };

  const handleCreateVehicle = () => {
    if (!newVehicle.plate_number.trim() || !newVehicle.model.trim()) {
      toast({ title: "Validation Error", description: "Plate number and model are required.", variant: "destructive" });
      return;
    }
    createVehicle.mutate({
      plate_number: newVehicle.plate_number,
      make: newVehicle.make,
      model: newVehicle.model,
      type: newVehicle.type,
      status: "idle",
    }, {
      onSuccess: () => {
        toast({ title: "Vehicle Added", description: `${newVehicle.plate_number} has been added to the fleet.` });
        setCreateOpen(false);
        setNewVehicle({ plate_number: "", make: "", model: "", type: "van" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleExport = () => {
    const csv = [
      ["Plate Number", "Make", "Model", "Type", "Status", "Location"].join(","),
      ...vehicles.map(v => [v.plate_number, v.make ?? '', v.model, v.type, v.status, (v.location as any)?.coordinates ? `${(v.location as any).coordinates[1]},${(v.location as any).coordinates[0]}` : ''].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicles.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Vehicles exported as CSV." });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
            <p className="text-muted-foreground">Manage your fleet vehicles and maintenance status.</p>
          </div>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-add-vehicle">
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add New Vehicle</SheetTitle>
                <SheetDescription>Register a new vehicle in your fleet.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-6">
                <div className="space-y-2">
                  <Label>License Plate</Label>
                  <Input placeholder="ABC-1234" value={newVehicle.plate_number} onChange={e => setNewVehicle(p => ({...p, plate_number: e.target.value}))} data-testid="input-vehicle-plate" />
                </div>
                <div className="space-y-2">
                  <Label>Make</Label>
                  <Input placeholder="Toyota" value={newVehicle.make} onChange={e => setNewVehicle(p => ({...p, make: e.target.value}))} data-testid="input-vehicle-make" />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input placeholder="HiAce 2024" value={newVehicle.model} onChange={e => setNewVehicle(p => ({...p, model: e.target.value}))} data-testid="input-vehicle-model" />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={newVehicle.type} onValueChange={v => setNewVehicle(p => ({...p, type: v}))}>
                    <SelectTrigger data-testid="select-vehicle-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-4">
                  <Button className="w-full" onClick={handleCreateVehicle} disabled={createVehicle.isPending} data-testid="button-create-vehicle-submit">
                    {createVehicle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Vehicle
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search vehicles..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-vehicles"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter-vehicles">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("idle")}>Inactive</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("maintenance")}>Maintenance</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={handleExport} data-testid="button-export-vehicles">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                  <TableCell>
                    <div className="flex flex-col cursor-pointer hover:underline" onClick={() => setSelectedVehicle(vehicle)}>
                        <span className="font-medium">{vehicle.plate_number}</span>
                        <span className="text-xs text-muted-foreground">{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 capitalize">
                        {getIcon(vehicle.type)}
                        {vehicle.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      vehicle.status === "active" ? "default" : 
                      vehicle.status === "maintenance" ? "destructive" : "secondary"
                    }>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                     {(vehicle.location as any)?.coordinates
                       ? `${(vehicle.location as any).coordinates[1]?.toFixed(4)}, ${(vehicle.location as any).coordinates[0]?.toFixed(4)}`
                       : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setEditMode(false); }}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setEditMode(true); }}>Edit Vehicle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/maintenance/work-orders')}>Maintenance Log</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(vehicle.id)}>
                          <Trash2 className="h-3 w-3 mr-2" /> Delete
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

      <Sheet open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedVehicle && (
                <>
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            {getIcon(selectedVehicle.type)}
                            {selectedVehicle.plate_number}
                        </SheetTitle>
                        <SheetDescription>
                            {[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ')} • {selectedVehicle.type}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant={
                                        selectedVehicle.status === "active" ? "default" : 
                                        selectedVehicle.status === "maintenance" ? "destructive" : "secondary"
                                    } className="text-base capitalize px-3 py-1">
                                        {selectedVehicle.status}
                                    </Badge>
                                </CardContent>
                             </Card>
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Location</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-2">
                                        <span className="text-sm font-medium">
                                          {(selectedVehicle.location as any)?.coordinates
                                            ? `${(selectedVehicle.location as any).coordinates[1]?.toFixed(4)}, ${(selectedVehicle.location as any).coordinates[0]?.toFixed(4)}`
                                            : 'N/A'}
                                        </span>
                                        <MapPin className="h-4 w-4 mb-1 text-muted-foreground" />
                                    </div>
                                </CardContent>
                             </Card>
                        </div>

                        <Tabs defaultValue="overview">
                            <TabsList className="w-full">
                                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                                <TabsTrigger value="maintenance" className="flex-1">Maintenance</TabsTrigger>
                                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4 pt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Vehicle Specs</h3>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Make</span>
                                            <span className="font-medium">{selectedVehicle.make || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Model</span>
                                            <span className="font-medium">{selectedVehicle.model}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Type</span>
                                            <span className="font-medium capitalize">{selectedVehicle.type}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Plate</span>
                                            <span className="font-medium font-mono">{selectedVehicle.plate_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">GPS</span>
                                            <span className="font-medium">
                                              {(selectedVehicle.location as any)?.coordinates 
                                                ? `${(selectedVehicle.location as any).coordinates[1]?.toFixed(4)}, ${(selectedVehicle.location as any).coordinates[0]?.toFixed(4)}` 
                                                : "No GPS data"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Driver</span>
                                            <span className="font-medium">{selectedVehicle.driver_uuid || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="maintenance" className="space-y-4 pt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-sm">Maintenance Schedule</h3>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/maintenance/work-orders')} data-testid="button-add-maintenance-record">
                                      <Plus className="h-3 w-3 mr-1" /> Create Work Order
                                    </Button>
                                </div>
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>Manage maintenance records from the Work Orders page.</p>
                                    <Button variant="link" size="sm" onClick={() => navigate('/maintenance/work-orders')}>
                                      Go to Work Orders
                                    </Button>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="history" className="space-y-4 pt-4">
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>Trip history will appear here once the vehicle completes routes.</p>
                                    <Button variant="link" size="sm" onClick={() => navigate('/operations/routes')}>
                                      Go to Routes
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this vehicle from your fleet. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteId) deleteVehicle.mutate(deleteId, {
                onSuccess: () => {
                  toast({ title: "Vehicle deleted" });
                  setDeleteId(null);
                  if (selectedVehicle?.id === deleteId) setSelectedVehicle(null);
                },
                onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
              });
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-vehicle">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
