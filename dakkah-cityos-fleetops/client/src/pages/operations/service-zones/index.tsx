import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { serviceZonesApi } from "@/lib/api";
import type { ServiceZone } from "@shared/schema";
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
import { Plus, Filter, Layers, Trash2, Edit } from "lucide-react";
import { MapContainer, TileLayer, Polygon, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
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

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function ServiceZonesPage() {
  const { data: zones = [] } = serviceZonesApi.useList();
  const createZone = serviceZonesApi.useCreate();
  const updateZone = serviceZonesApi.useUpdate();
  const deleteZone = serviceZonesApi.useDelete();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    type: "primary",
    color: "blue",
    status: "active",
    service_area_uuid: "",
    stroke_color: "",
    description: "",
    boundary: [] as any[],
  });

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingZone(null);
    setFormData({ name: "", type: "primary", color: "blue", status: "active", service_area_uuid: "", stroke_color: "", description: "", boundary: [[51.505, -0.09], [51.51, -0.1], [51.51, -0.08]] });
    setIsSheetOpen(true);
  };

  const openEdit = (zone: ServiceZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      type: (zone as any).type ?? "primary",
      color: zone.color ?? "blue",
      status: zone.status,
      service_area_uuid: zone.service_area_uuid ?? "",
      stroke_color: zone.stroke_color ?? "",
      description: zone.description ?? "",
      boundary: (zone.boundary as any[]) || [],
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Zone name is required.", variant: "destructive" });
      return;
    }
    if (editingZone) {
      updateZone.mutate({ id: editingZone.id, ...formData } as any, {
        onSuccess: () => {
          toast({ title: "Updated", description: "Service zone updated." });
          setIsSheetOpen(false);
        },
      });
    } else {
      createZone.mutate(formData as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Service zone created." });
          setIsSheetOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteZone.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Service zone deleted." });
        setDeleteId(null);
      },
    });
  };

  const getZoneColor = (color: string) => {
    switch (color) {
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'red': return '#ef4444';
      case 'purple': return '#a855f7';
      case 'orange': return '#f97316';
      default: return '#3b82f6';
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
        <div className="w-full md:w-[400px] border-r bg-card flex flex-col h-full">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight" data-testid="text-service-zones-title">Service Zones</h1>
                        <p className="text-xs text-muted-foreground">Manage operational boundaries</p>
                    </div>
                    <Button size="sm" onClick={openCreate} data-testid="button-new-zone">
                        <Plus className="mr-2 h-4 w-4" />
                        New Zone
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search zones..."
                      className="h-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-zones"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50%]">Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredZones.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No zones found. Create a new zone to get started.
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredZones.map((zone) => (
                            <TableRow key={zone.id} className="cursor-pointer hover:bg-muted/50" data-testid={`row-zone-${zone.id}`}>
                                <TableCell>
                                    <div className="font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getZoneColor(zone.color ?? 'blue') }} />
                                        {zone.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{zone.description || zone.status}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={zone.status === "active" ? "outline" : "secondary"} className="text-xs">
                                        {zone.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(zone)} data-testid={`button-edit-zone-${zone.id}`}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(zone.id)} data-testid={`button-delete-zone-${zone.id}`}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>

        <div className="flex-1 h-full relative bg-muted/20">
             <MapContainer 
                center={[51.505, -0.09]} 
                zoom={11} 
                zoomControl={false}
                className="h-full w-full z-0"
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                
                {zones.map((zone) => {
                    const pts = (zone.boundary as any[]) || [];
                    if (pts.length < 3) return null;
                    return (
                      <Polygon 
                          key={zone.id}
                          positions={pts as LatLngExpression[]}
                          pathOptions={{ color: zone.stroke_color || getZoneColor(zone.color ?? "blue"), fillOpacity: 0.2 }}
                      >
                          <Tooltip sticky>{zone.name}</Tooltip>
                          <Popup>
                              <div className="space-y-2 min-w-[150px]">
                                  <h3 className="font-semibold">{zone.name}</h3>
                                  <div className="text-sm">
                                      <p>Status: <span className="capitalize">{zone.status}</span></p>
                                      {zone.description && <p>{zone.description}</p>}
                                  </div>
                              </div>
                          </Popup>
                      </Polygon>
                    );
                })}
            </MapContainer>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingZone ? "Edit Zone" : "Create Zone"}</SheetTitle>
            <SheetDescription>Define a service zone boundary and configuration.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Zone Name</Label>
              <Input
                placeholder="e.g. Downtown Core"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-zone-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger data-testid="select-zone-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                  <SelectTrigger data-testid="select-zone-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="select-zone-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Stroke Color</Label>
                <Input
                  placeholder="e.g. #3b82f6"
                  value={formData.stroke_color}
                  onChange={(e) => setFormData({ ...formData, stroke_color: e.target.value })}
                  data-testid="input-zone-stroke-color"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                placeholder="Zone description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-zone-description"
              />
            </div>
            <div className="grid gap-2">
              <Label>Service Area UUID</Label>
              <Input
                placeholder="Service area UUID..."
                value={formData.service_area_uuid}
                onChange={(e) => setFormData({ ...formData, service_area_uuid: e.target.value })}
                data-testid="input-zone-service-area-uuid"
              />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createZone.isPending || updateZone.isPending} data-testid="button-save-zone">
                {createZone.isPending || updateZone.isPending ? "Saving..." : "Save Zone"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Zone</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this zone. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-zone">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
