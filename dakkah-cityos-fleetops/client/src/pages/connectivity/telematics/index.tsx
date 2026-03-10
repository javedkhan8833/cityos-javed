import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { telematicsApi, vehiclesApi } from "@/lib/api";
import type { TelematicsRecord } from "@shared/schema";
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
import { Plus, MoreHorizontal, Gauge, Fuel, MapPin, Trash2, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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

export default function TelematicsPage() {
  const { data: records = [], isLoading, error } = telematicsApi.useList();
  const { data: vehicles = [] } = vehiclesApi.useList();
  const createRecord = telematicsApi.useCreate();
  const updateRecord = telematicsApi.useUpdate();
  const deleteRecord = telematicsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TelematicsRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vehicle_uuid: "",
    speed: 0,
    rpm: 0,
    fuel: 100,
    location: "0, 0",
    event: "active",
  });

  const filteredRecords = records.filter(r => 
    r.vehicle_uuid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgSpeed = records.length > 0 
    ? Math.round(records.reduce((sum, r) => sum + (r.speed ?? 0), 0) / records.length) 
    : 0;
  const avgFuel = records.length > 0 
    ? Math.round(records.reduce((sum, r) => sum + (r.fuel ?? 0), 0) / records.length) 
    : 0;

  const openCreate = () => {
    setEditingRecord(null);
    setFormData({ vehicle_uuid: "", speed: 0, rpm: 0, fuel: 100, location: "0, 0", event: "active" });
    setIsSheetOpen(true);
  };

  const openEdit = (record: TelematicsRecord) => {
    setEditingRecord(record);
    const locParts = (record.location || "0,0").split(",");
    setFormData({
      vehicle_uuid: record.vehicle_uuid,
      speed: record.speed ?? 0,
      rpm: record.rpm ?? 0,
      fuel: record.fuel ?? 100,
      location: record.location || "0, 0",
      event: record.event ?? "active",
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.vehicle_uuid) {
      toast({ title: "Error", description: "Vehicle is required.", variant: "destructive" });
      return;
    }
    if (editingRecord) {
      updateRecord.mutate({ id: editingRecord.id, ...formData } as any, {
        onSuccess: () => { toast({ title: "Updated", description: "Record updated." }); setIsSheetOpen(false); },
      });
    } else {
      createRecord.mutate(formData as any, {
        onSuccess: () => { toast({ title: "Created", description: "Telematics record added." }); setIsSheetOpen(false); },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRecord.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Deleted", description: "Record removed." }); setDeleteId(null); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-telematics-title">Telematics</h1>
            <p className="text-muted-foreground">Vehicle telematics data including speed, fuel, and position.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-record">
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive text-sm">
            Failed to load data. Please try again.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-records">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSpeed} km/h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Fuel</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgFuel}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search by vehicle..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-telematics"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>RPM</TableHead>
                <TableHead>Fuel</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No telematics records. Add a record to begin.
                  </TableCell>
                </TableRow>
              )}
              {filteredRecords.map((record) => (
                <TableRow key={record.id} data-testid={`row-telematics-${record.id}`}>
                  <TableCell className="font-medium">{record.vehicle_uuid}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{record.speed ?? 0} km/h</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{record.rpm ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-muted-foreground" />
                      <span className={`font-mono ${(record.fuel ?? 0) < 20 ? 'text-red-500 font-bold' : ''}`}>
                        {record.fuel ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">N/A</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {(() => { const parts = (record.location || "0,0").split(","); return `${parseFloat(parts[0] || "0").toFixed(4)}, ${parseFloat(parts[1] || "0").toFixed(4)}`; })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.event === 'Moving' ? 'default' : 'secondary'} className="capitalize">
                      {record.event}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.timestamp ? formatDistanceToNow(new Date(record.timestamp), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(record)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(record.id)}>
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
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingRecord ? "Edit Record" : "Add Telematics Record"}</SheetTitle>
            <SheetDescription>Enter vehicle telematics data.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Vehicle</Label>
              <Select value={formData.vehicle_uuid} onValueChange={(v) => setFormData({ ...formData, vehicle_uuid: v })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Speed (km/h)</Label>
                <Input type="number" value={formData.speed} onChange={(e) => setFormData({ ...formData, speed: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Engine RPM</Label>
                <Input type="number" value={formData.rpm} onChange={(e) => setFormData({ ...formData, rpm: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fuel Level (%)</Label>
                <Input type="number" min={0} max={100} value={formData.fuel} onChange={(e) => setFormData({ ...formData, fuel: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Location (lat, lng)</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Event</Label>
              <Select value={formData.event} onValueChange={(v) => setFormData({ ...formData, event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="parked">Parked</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createRecord.isPending || updateRecord.isPending} data-testid="button-save-telematics">
                {createRecord.isPending || updateRecord.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>Remove this telematics record permanently?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
