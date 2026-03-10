import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { sensorsApi, devicesApi } from "@/lib/api";
import type { Sensor } from "@shared/schema";
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
import { Plus, MoreHorizontal, Activity, Cpu, Thermometer, Wifi, Battery, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SensorsPage() {
  const { data: sensors = [], isLoading, error } = sensorsApi.useList();
  const { data: devices = [] } = devicesApi.useList();
  const createSensor = sensorsApi.useCreate();
  const updateSensor = sensorsApi.useUpdate();
  const deleteSensor = sensorsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "temperature",
    value: "0",
    status: "normal",
    battery: 100,
    device_id: "",
  });

  const filteredSensors = sensors.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSensors = sensors.filter(s => s.status !== "offline").length;
  const warningCount = sensors.filter(s => s.status === "warning").length;

  const openCreate = () => {
    setEditingSensor(null);
    setFormData({ name: "", type: "temperature", value: "0", status: "normal", battery: 100, device_id: "" });
    setIsSheetOpen(true);
  };

  const openEdit = (sensor: Sensor) => {
    setEditingSensor(sensor);
    setFormData({
      name: sensor.name,
      type: sensor.type,
      value: sensor.value,
      status: sensor.status,
      battery: sensor.battery ?? 100,
      device_id: sensor.device_id,
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Sensor name is required.", variant: "destructive" });
      return;
    }
    if (editingSensor) {
      updateSensor.mutate({ id: editingSensor.id, ...formData } as any, {
        onSuccess: () => { toast({ title: "Updated", description: "Sensor updated." }); setIsSheetOpen(false); },
      });
    } else {
      createSensor.mutate(formData as any, {
        onSuccess: () => { toast({ title: "Created", description: "Sensor added." }); setIsSheetOpen(false); },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteSensor.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Deleted", description: "Sensor removed." }); setDeleteId(null); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-sensors-title">Sensors</h1>
            <p className="text-muted-foreground">Monitor environmental conditions and cargo status.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-sensor">
            <Plus className="mr-2 h-4 w-4" />
            Add Sensor
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
                    <CardTitle className="text-sm font-medium">Active Sensors</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-sensors">{activeSensors}</div>
                    <p className="text-xs text-muted-foreground">{sensors.length - activeSensors} offline</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600" data-testid="text-warning-count">{warningCount}</div>
                    <p className="text-xs text-muted-foreground">Deviations detected</p>
                </CardContent>
            </Card>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search sensors..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-sensors"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Linked Device</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSensors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sensors found. Click "Add Sensor" to register one.
                  </TableCell>
                </TableRow>
              )}
              {filteredSensors.map((sensor) => (
                <TableRow key={sensor.id} data-testid={`row-sensor-${sensor.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        {sensor.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{sensor.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono font-bold ${sensor.status === 'warning' ? 'text-yellow-600' : ''}`}>
                        {sensor.value}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Wifi className="h-3 w-3" /> {sensor.device_id || "Unlinked"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                        {sensor.last_update ? formatDistanceToNow(new Date(sensor.last_update), { addSuffix: true }) : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-1 text-sm">
                        <Battery className="h-3 w-3 text-muted-foreground" />
                        {sensor.battery ?? 0}%
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(sensor)}>Configure</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(sensor.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
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
            <SheetTitle>{editingSensor ? "Edit Sensor" : "Add Sensor"}</SheetTitle>
            <SheetDescription>Configure sensor parameters and link to a device.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Sensor Name</Label>
              <Input placeholder="e.g. Cargo Temp A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-sensor-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temperature">Temperature</SelectItem>
                    <SelectItem value="humidity">Humidity</SelectItem>
                    <SelectItem value="contact">Contact/Door</SelectItem>
                    <SelectItem value="pressure">Pressure</SelectItem>
                    <SelectItem value="motion">Motion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Current Value</Label>
                <Input placeholder="e.g. -18.5°C" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} data-testid="input-sensor-value" />
              </div>
              <div className="grid gap-2">
                <Label>Battery (%)</Label>
                <Input type="number" min={0} max={100} value={formData.battery} onChange={(e) => setFormData({ ...formData, battery: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Linked Device</Label>
              <Select value={formData.device_id} onValueChange={(v) => setFormData({ ...formData, device_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select device..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={d.serial}>{d.serial}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createSensor.isPending || updateSensor.isPending} data-testid="button-save-sensor">
                {createSensor.isPending || updateSensor.isPending ? "Saving..." : "Save Sensor"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sensor</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this sensor. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
