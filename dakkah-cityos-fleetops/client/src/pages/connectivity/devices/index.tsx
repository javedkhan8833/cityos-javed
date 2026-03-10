import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { devicesApi } from "@/lib/api";
import type { Device } from "@shared/schema";
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
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, MoreHorizontal, Wifi, Battery, Activity, Trash2 } from "lucide-react";
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

export default function DevicesPage() {
  const { data: devices = [] } = devicesApi.useList();
  const createDevice = devicesApi.useCreate();
  const updateDevice = devicesApi.useUpdate();
  const deleteDevice = devicesApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serial: "",
    type: "gps_tracker",
    status: "online",
    battery_level: 100,
  });

  const filteredDevices = devices.filter(d => 
    d.serial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingDevice(null);
    setFormData({ serial: "", type: "gps_tracker", status: "online", battery_level: 100 });
    setIsSheetOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      serial: device.serial,
      type: device.type,
      status: device.status,
      battery_level: device.battery_level ?? 100,
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.serial.trim()) {
      toast({ title: "Error", description: "Serial number is required.", variant: "destructive" });
      return;
    }
    if (editingDevice) {
      updateDevice.mutate({ id: editingDevice.id, ...formData } as any, {
        onSuccess: () => {
          toast({ title: "Updated", description: "Device updated successfully." });
          setIsSheetOpen(false);
        },
      });
    } else {
      createDevice.mutate(formData as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Device registered successfully." });
          setIsSheetOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDevice.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Device removed." });
        setDeleteId(null);
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-devices-title">Devices</h1>
            <p className="text-muted-foreground">Manage IoT devices, sensors, and telematics hardware.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-device">
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search by serial..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-devices"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial / ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No devices found. Click "Add Device" to register one.
                  </TableCell>
                </TableRow>
              )}
              {filteredDevices.map((device) => (
                <TableRow key={device.id} data-testid={`row-device-${device.id}`}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        {device.serial}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                        {device.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="capitalize">{device.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                        {device.last_heartbeat ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true }) : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="w-[150px]">
                     <div className="flex items-center gap-2">
                        <Battery className={`h-4 w-4 ${(device.battery_level ?? 0) < 20 ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <Progress value={device.battery_level ?? 0} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{device.battery_level ?? 0}%</span>
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-device-actions-${device.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(device)}>Configure</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(device.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Unlink
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
            <SheetTitle>{editingDevice ? "Configure Device" : "Register Device"}</SheetTitle>
            <SheetDescription>
              {editingDevice ? "Update device configuration." : "Register a new IoT device to the fleet."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Serial Number</Label>
              <Input
                placeholder="e.g. DEV-001-ABC"
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                data-testid="input-device-serial"
              />
            </div>
            <div className="grid gap-2">
              <Label>Device Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger data-testid="select-device-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gps_tracker">GPS Tracker</SelectItem>
                  <SelectItem value="obd_dongle">OBD Dongle</SelectItem>
                  <SelectItem value="dash_cam">Dash Cam</SelectItem>
                  <SelectItem value="temperature_sensor">Temperature Sensor</SelectItem>
                  <SelectItem value="door_sensor">Door Sensor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger data-testid="select-device-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Battery Level (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.battery_level}
                onChange={(e) => setFormData({ ...formData, battery_level: parseInt(e.target.value) || 0 })}
                data-testid="input-device-battery"
              />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createDevice.isPending || updateDevice.isPending} data-testid="button-save-device">
                {createDevice.isPending || updateDevice.isPending ? "Saving..." : "Save Device"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink and remove this device from the system. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-device">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
