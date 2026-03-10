import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { driversApi, ordersApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Plus, Filter, Download, Phone, Mail, FileText, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { Link } from "wouter";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function DriversPage() {
  const { data: drivers = [] } = driversApi.useList();
  const { data: allOrders = [] } = ordersApi.useList();
  const createDriver = driversApi.useCreate();
  const deleteDriver = driversApi.useDelete();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const driverOrders = selectedDriver ? allOrders.filter(o => o.driver_assigned_uuid === selectedDriver.id) : [];
  const [createOpen, setCreateOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", email: "", vehicle_uuid: "", license: "" });

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDriver = () => {
    if (!newDriver.name.trim()) {
      toast({ title: "Validation Error", description: "Driver name is required.", variant: "destructive" });
      return;
    }
    const driverPayload: Record<string, any> = {
      name: newDriver.name,
      phone: newDriver.phone,
      email: newDriver.email,
    };
    if (newDriver.vehicle_uuid) driverPayload.vehicle_uuid = newDriver.vehicle_uuid;
    if (newDriver.license) driverPayload.drivers_license_number = newDriver.license;
    createDriver.mutate(driverPayload, {
      onSuccess: () => {
        toast({ title: "Driver Created", description: `${newDriver.name} has been added to the fleet.` });
        setCreateOpen(false);
        setNewDriver({ name: "", phone: "", email: "", vehicle_uuid: "", license: "" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDeactivate = (driver: any) => {
    deleteDriver.mutate(driver.id, {
      onSuccess: () => {
        toast({ title: "Driver Deactivated", description: `${driver.name} has been deactivated.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Phone", "Email", "Status", "Vehicle UUID", "Fleet UUID"].join(","),
      ...drivers.map(d => [d.name, d.phone, d.email, d.status, d.vehicle_uuid ?? "", d.fleet_uuid ?? ""].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drivers.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Drivers exported as CSV." });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
            <p className="text-muted-foreground">Manage your fleet drivers and their status.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/management/drivers/availability">
                    Availability & Shifts
                </Link>
            </Button>
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetTrigger asChild>
                    <Button data-testid="button-add-driver">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Driver
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Add New Driver</SheetTitle>
                        <SheetDescription>Create a profile for a new driver in your fleet.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input placeholder="John Doe" value={newDriver.name} onChange={e => setNewDriver(p => ({...p, name: e.target.value}))} data-testid="input-driver-name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input placeholder="+1..." value={newDriver.phone} onChange={e => setNewDriver(p => ({...p, phone: e.target.value}))} data-testid="input-driver-phone" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input placeholder="driver@fleet.com" value={newDriver.email} onChange={e => setNewDriver(p => ({...p, email: e.target.value}))} data-testid="input-driver-email" />
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label>Assign Vehicle (Optional)</Label>
                            <Input placeholder="Search vehicle UUID..." value={newDriver.vehicle_uuid} onChange={e => setNewDriver(p => ({...p, vehicle_uuid: e.target.value}))} />
                        </div>
                        <div className="space-y-2">
                            <Label>License Number</Label>
                            <Input placeholder="DL-..." value={newDriver.license} onChange={e => setNewDriver(p => ({...p, license: e.target.value}))} />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button className="w-full" onClick={handleCreateDriver} disabled={createDriver.isPending} data-testid="button-create-driver-submit">
                                {createDriver.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Driver Profile
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search drivers..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-drivers"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter-drivers">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("online")}>Online</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("offline")}>Offline</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("busy")}>On Break</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={handleExport} data-testid="button-export-drivers">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => (
                <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3 cursor-pointer hover:underline" onClick={() => setSelectedDriver(driver)}>
                      <Avatar>
                        <AvatarImage src={driver.photo_url || undefined} />
                        <AvatarFallback>{driver.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-muted-foreground">{driver.fleet_uuid ? `Fleet: ${driver.fleet_uuid.substring(0, 8)}...` : 'No fleet'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm">
                         <Phone className="h-3 w-3 text-muted-foreground" />
                         {driver.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                         <Mail className="h-3 w-3 text-muted-foreground" />
                         {driver.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      driver.status === "online" ? "default" : 
                      driver.status === "busy" ? "secondary" : "outline"
                    }>
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {driver.vehicle_uuid ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {driver.vehicle_uuid.substring(0, 8)}...
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedDriver(driver)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedDriver(driver)}>Edit Driver</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivate(driver)}>Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedDriver && (
                <>
                    <SheetHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/20">
                                <AvatarImage src={selectedDriver.photo_url || undefined} />
                                <AvatarFallback className="text-lg">{selectedDriver.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-2xl">{selectedDriver.name}</SheetTitle>
                                <SheetDescription className="flex items-center gap-2">
                                    <Badge variant="outline" className="rounded-sm font-normal">
                                        ID: {selectedDriver.id.substring(0, 8)}
                                    </Badge>
                                    <span className="text-muted-foreground">•</span>
                                    <span>Joined {new Date().getFullYear()}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold">{driverOrders.length}</div>
                                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <FileText className="h-3 w-3" /> Orders
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold capitalize">{selectedDriver.status}</div>
                                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Status
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold">{selectedDriver.vehicle_uuid ? 'Yes' : 'No'}</div>
                                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        Vehicle
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="details">
                            <TabsList className="w-full">
                                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                                <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                                <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-6 pt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <Phone className="h-4 w-4" /> Contact Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Phone</span>
                                            <a href={`tel:${selectedDriver.phone}`} className="font-medium hover:underline text-primary">{selectedDriver.phone}</a>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Email</span>
                                            <a href={`mailto:${selectedDriver.email}`} className="font-medium hover:underline text-primary">{selectedDriver.email}</a>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> Current Status
                                    </h3>
                                    <div className="bg-muted rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Status: <span className="uppercase text-primary">{selectedDriver.status}</span></p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {selectedDriver.status === 'online' ? 'Available for new orders' : 'Currently offline'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity" className="space-y-4 pt-4">
                                <h3 className="font-semibold text-sm">Recent Activity</h3>
                                {driverOrders.length > 0 ? (
                                  <div className="space-y-4 border-l-2 border-muted pl-4 ml-2">
                                    {driverOrders.slice(0, 5).map(order => (
                                        <div key={order.id} className="relative">
                                            <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                                            <div className="text-sm font-medium">{order.tracking_number} — {order.status.replace("_", " ")}</div>
                                            <div className="text-xs text-muted-foreground">{order.customer_uuid || 'N/A'} • ${order.total_amount}</div>
                                        </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-sm text-muted-foreground">
                                    <p>No recent activity found for this driver.</p>
                                  </div>
                                )}
                            </TabsContent>

                            <TabsContent value="documents" className="space-y-4 pt-4">
                                <h3 className="font-semibold text-sm">Compliance Documents</h3>
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>Document management coming soon.</p>
                                    <p className="text-xs mt-1">Upload and track driver licenses, insurance, and certifications.</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
