import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { fleetsApi, serviceZonesApi } from "@/lib/api";
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
import { Plus, Filter, Download, MoreHorizontal, MapPin, Truck, Users, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Fleet } from "@shared/schema";

export default function FleetsPage() {
  const { data: fleets = [] } = fleetsApi.useList();
  const { data: zones = [] } = serviceZonesApi.useList();
  const createFleet = fleetsApi.useCreate();
  const updateFleet = fleetsApi.useUpdate();
  const deleteFleet = fleetsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fleet | null>(null);

  const [formName, setFormName] = useState("");
  const [formServiceAreaUuid, setFormServiceAreaUuid] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const getZoneName = (uuid: string | null) => {
    if (!uuid) return 'N/A';
    const zone = zones.find(z => z.id === uuid);
    return zone?.name || uuid.substring(0, 8) + '...';
  };

  const filteredFleets = fleets.filter(f => {
    const zoneName = getZoneName(f.service_area_uuid);
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      zoneName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormName("");
    setFormServiceAreaUuid("");
    setFormDescription("");
    setEditingFleet(null);
  };

  const openCreateSheet = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const openEditSheet = (fleet: Fleet) => {
    setEditingFleet(fleet);
    setFormName(fleet.name);
    setFormServiceAreaUuid(fleet.service_area_uuid || "");
    setFormDescription("");
    setIsSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsSheetOpen(open);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast({ title: "Validation Error", description: "Fleet name is required.", variant: "destructive" });
      return;
    }

    if (editingFleet) {
      updateFleet.mutate({
        id: editingFleet.id,
        name: formName,
        service_area_uuid: formServiceAreaUuid || null,
      } as any, {
        onSuccess: () => {
          toast({ title: "Fleet Updated", description: `${formName} has been updated.` });
          setIsSheetOpen(false);
          resetForm();
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    } else {
      createFleet.mutate({
        name: formName,
        service_area_uuid: formServiceAreaUuid || null,
        status: "active",
      }, {
        onSuccess: () => {
          toast({ title: "Fleet Created", description: `${formName} has been created.` });
          setIsSheetOpen(false);
          resetForm();
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteFleet.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Fleet Deleted", description: `${deleteTarget.name} has been deleted.` });
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Service Area", "Status", "Created At"].join(","),
      ...fleets.map(f => [f.name, getZoneName(f.service_area_uuid), f.status, f.created_at ?? ""].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleets.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Fleets exported as CSV." });
  };

  const isMutating = createFleet.isPending || updateFleet.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleets</h1>
            <p className="text-muted-foreground">Manage your service zones and fleet groups.</p>
          </div>
          <Button onClick={openCreateSheet} data-testid="button-create-fleet">
            <Plus className="mr-2 h-4 w-4" />
            Create Fleet
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search fleets..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-fleets"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter-fleets">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={handleExport} data-testid="button-export-fleets">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet Name</TableHead>
                <TableHead>Service Area</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Drivers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFleets.map((fleet) => (
                <TableRow key={fleet.id} data-testid={`row-fleet-${fleet.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {fleet.name.charAt(0)}
                       </div>
                       <span data-testid={`text-fleet-name-${fleet.id}`}>{fleet.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span data-testid={`text-fleet-zone-${fleet.id}`}>{getZoneName(fleet.service_area_uuid)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      -
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      -
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={fleet.status === "active" ? "default" : "secondary"} data-testid={`status-fleet-${fleet.id}`}>
                      {fleet.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-fleet-${fleet.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(fleet)} data-testid={`button-edit-fleet-${fleet.id}`}>Edit Fleet</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(fleet)} data-testid={`button-delete-fleet-${fleet.id}`}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent className="sm:max-w-md">
            <SheetHeader>
                <SheetTitle>{editingFleet ? "Edit Fleet" : "Create Fleet"}</SheetTitle>
                <SheetDescription>
                    {editingFleet ? "Update fleet details." : "Establish a new fleet group to assign drivers and vehicles."}
                </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="fleet-name">Fleet Name</Label>
                    <Input
                      id="fleet-name"
                      placeholder="e.g. West Coast Distribution"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      data-testid="input-fleet-name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="service-zone">Service Area</Label>
                    <Select value={formServiceAreaUuid} onValueChange={setFormServiceAreaUuid}>
                        <SelectTrigger data-testid="select-fleet-zone">
                            <SelectValue placeholder="Select a service area" />
                        </SelectTrigger>
                        <SelectContent>
                             {zones.map(z => (
                                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                             ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional notes about this fleet..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      data-testid="input-fleet-description"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Assignment Strategy</Label>
                    <Select defaultValue="manual">
                        <SelectTrigger data-testid="select-fleet-strategy">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual Assignment</SelectItem>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="nearest">Nearest Driver</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSheetOpen(false)} data-testid="button-cancel-fleet">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isMutating} data-testid="button-submit-fleet">
                        {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingFleet ? "Update Fleet" : "Create Fleet"}
                    </Button>
                </div>
            </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fleet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} data-testid="button-cancel-delete-fleet">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteFleet.isPending} data-testid="button-confirm-delete-fleet">
              {deleteFleet.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
