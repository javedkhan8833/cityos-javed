import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { placesApi } from "@/lib/api";
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
import { Plus, Filter, MoreHorizontal, MapPin, Navigation, Edit, Trash2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const PLACE_TYPES = [
  { value: "warehouse", label: "Warehouse" },
  { value: "hub", label: "Hub" },
  { value: "customer_site", label: "Customer" },
] as const;

function getPlaceAddress(place: any): string {
  return [place.street1, place.city, place.province, place.country].filter(Boolean).join(', ');
}

function getPlaceLat(place: any): number {
  return place.location?.coordinates?.[1] ?? 24.7;
}

function getPlaceLng(place: any): number {
  return place.location?.coordinates?.[0] ?? 46.7;
}

export default function PlacesPage() {
  const { data: places = [] } = placesApi.useList();
  const createMutation = placesApi.useCreate();
  const updateMutation = placesApi.useUpdate();
  const deleteMutation = placesApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("warehouse");
  const [formStreet1, setFormStreet1] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formCountry, setFormCountry] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<any | null>(null);

  const filteredPlaces = places.filter(p => {
    const address = getPlaceAddress(p);
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  function openCreateSheet() {
    setEditingPlace(null);
    setFormName("");
    setFormType("warehouse");
    setFormStreet1("");
    setFormCity("");
    setFormProvince("");
    setFormCountry("");
    setSheetOpen(true);
  }

  function openEditSheet(place: any) {
    setEditingPlace(place);
    setFormName(place.name);
    setFormType(place.type);
    setFormStreet1(place.street1 || "");
    setFormCity(place.city || "");
    setFormProvince(place.province || "");
    setFormCountry(place.country || "");
    setSheetOpen(true);
  }

  function handleSave() {
    if (!formName.trim() || !formStreet1.trim()) {
      toast({ title: "Validation Error", description: "Name and street address are required.", variant: "destructive" });
      return;
    }

    const data = { name: formName.trim(), type: formType, street1: formStreet1.trim(), city: formCity.trim(), province: formProvince.trim(), country: formCountry.trim() };

    if (editingPlace) {
      updateMutation.mutate({ id: editingPlace.id, ...data }, {
        onSuccess: () => {
          toast({ title: "Place updated", description: `"${data.name}" has been updated.` });
          setSheetOpen(false);
          if (selectedPlace?.id === editingPlace.id) {
            setSelectedPlace({ ...selectedPlace, ...data });
          }
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to update place.", variant: "destructive" });
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast({ title: "Place created", description: `"${data.name}" has been added.` });
          setSheetOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to create place.", variant: "destructive" });
        },
      });
    }
  }

  function confirmDelete(place: any) {
    setPlaceToDelete(place);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!placeToDelete) return;
    deleteMutation.mutate(placeToDelete.id, {
      onSuccess: () => {
        toast({ title: "Place deleted", description: `"${placeToDelete.name}" has been removed.` });
        setDeleteDialogOpen(false);
        setPlaceToDelete(null);
        if (selectedPlace?.id === placeToDelete.id) {
          setSelectedPlace(null);
        }
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to delete place.", variant: "destructive" });
      },
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
         {/* Sidebar List */}
         <div className="w-[450px] flex flex-col border-r bg-card z-10 shadow-lg">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Places</h1>
                        <p className="text-muted-foreground text-sm">Manage saved locations.</p>
                    </div>
                    <Button size="sm" data-testid="button-add-place" onClick={openCreateSheet}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        placeholder="Search places..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9"
                        data-testid="input-search-places"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" data-testid="button-filter-places">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTypeFilter("warehouse")}>Warehouse</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTypeFilter("hub")}>Hub</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTypeFilter("customer_site")}>Customer Site</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPlaces.map((place) => (
                            <TableRow 
                                key={place.id} 
                                className={`cursor-pointer ${selectedPlace?.id === place.id ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                                onClick={() => setSelectedPlace(place)}
                                data-testid={`row-place-${place.id}`}
                            >
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium" data-testid={`text-place-name-${place.id}`}>{place.name}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px] mb-1" data-testid={`text-place-address-${place.id}`}>{getPlaceAddress(place)}</div>
                                            <Badge variant="outline" className="text-[10px] h-5 capitalize px-1">{place.type.replace("_", " ")}</Badge>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right align-top pt-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${place.id}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                data-testid={`menu-view-${place.id}`}
                                                onClick={(e) => { e.stopPropagation(); setSelectedPlace(place); }}
                                            >
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                data-testid={`menu-edit-${place.id}`}
                                                onClick={(e) => { e.stopPropagation(); openEditSheet(place); }}
                                            >
                                                Edit Place
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                data-testid={`menu-delete-${place.id}`}
                                                onClick={(e) => { e.stopPropagation(); confirmDelete(place); }}
                                            >
                                                Delete
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

         {/* Map View */}
         <div className="flex-1 relative bg-muted/20">
             {selectedPlace && (
                 <div className="absolute top-4 left-4 z-[400] w-80">
                     <Card className="shadow-lg border-0 bg-white/95 backdrop-blur animate-in fade-in slide-in-from-left-5">
                         <CardHeader className="p-4 pb-2">
                             <div className="flex justify-between items-start">
                                <CardTitle className="text-lg" data-testid="text-selected-place-name">{selectedPlace.name}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2" onClick={() => setSelectedPlace(null)} data-testid="button-close-detail">
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                             </div>
                             <Badge variant="secondary" className="capitalize w-fit">{selectedPlace.type.replace("_", " ")}</Badge>
                         </CardHeader>
                         <CardContent className="p-4 pt-2 space-y-4">
                             <div className="space-y-1 text-sm">
                                 <Label className="text-muted-foreground text-xs">Address</Label>
                                 <p className="font-medium" data-testid="text-selected-place-address">{getPlaceAddress(selectedPlace)}</p>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-xs">
                                 <div className="bg-muted p-2 rounded">
                                     <span className="text-muted-foreground block">Lat</span>
                                     <span className="font-mono" data-testid="text-selected-place-lat">{getPlaceLat(selectedPlace).toFixed(6)}</span>
                                 </div>
                                 <div className="bg-muted p-2 rounded">
                                     <span className="text-muted-foreground block">Lng</span>
                                     <span className="font-mono" data-testid="text-selected-place-lng">{getPlaceLng(selectedPlace).toFixed(6)}</span>
                                 </div>
                             </div>
                             <div className="flex gap-2 pt-2">
                                 <Button
                                     size="sm"
                                     className="flex-1"
                                     variant="outline"
                                     data-testid="button-edit-selected-place"
                                     onClick={() => openEditSheet(selectedPlace)}
                                 >
                                     <Edit className="h-3 w-3 mr-2" /> Edit
                                 </Button>
                                 <Button
                                     size="sm"
                                     className="flex-1"
                                     data-testid="button-directions-selected-place"
                                     onClick={() => toast({ title: "Opening directions...", description: `Getting directions to ${selectedPlace.name}.` })}
                                 >
                                     <Navigation className="h-3 w-3 mr-2" /> Directions
                                 </Button>
                             </div>
                         </CardContent>
                     </Card>
                 </div>
             )}

             <MapContainer 
                center={selectedPlace ? [getPlaceLat(selectedPlace), getPlaceLng(selectedPlace)] : [51.505, -0.09]} 
                zoom={selectedPlace ? 15 : 12} 
                zoomControl={false}
                className="h-full w-full z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {filteredPlaces.map(place => (
                    <div key={place.id}>
                        <Marker 
                            position={[getPlaceLat(place), getPlaceLng(place)]}
                            eventHandlers={{
                                click: () => setSelectedPlace(place),
                            }}
                        >
                            <Popup>
                                <div className="font-bold">{place.name}</div>
                            </Popup>
                        </Marker>
                        {selectedPlace?.id === place.id && (
                            <Circle 
                                center={[getPlaceLat(place), getPlaceLng(place)]}
                                radius={200}
                                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.1 }}
                            />
                        )}
                    </div>
                ))}
            </MapContainer>
         </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="sm:max-w-md">
              <SheetHeader>
                  <SheetTitle data-testid="text-sheet-title">{editingPlace ? "Edit Place" : "Add New Place"}</SheetTitle>
                  <SheetDescription>{editingPlace ? "Update the place details." : "Save a location for easy dispatching."}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label>Place Name</Label>
                      <Input
                          placeholder="e.g. Central Warehouse"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          data-testid="input-place-name"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label>Type</Label>
                      <div className="grid grid-cols-3 gap-2">
                          {PLACE_TYPES.map((t) => (
                              <Button
                                  key={t.value}
                                  type="button"
                                  variant={formType === t.value ? "default" : "outline"}
                                  className="text-xs"
                                  data-testid={`button-type-${t.value}`}
                                  onClick={() => setFormType(t.value)}
                              >
                                  {t.label}
                              </Button>
                          ))}
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                          placeholder="123 Main St"
                          value={formStreet1}
                          onChange={(e) => setFormStreet1(e.target.value)}
                          data-testid="input-place-address"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                              placeholder="City"
                              value={formCity}
                              onChange={(e) => setFormCity(e.target.value)}
                              data-testid="input-place-city"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Province/State</Label>
                          <Input
                              placeholder="Province"
                              value={formProvince}
                              onChange={(e) => setFormProvince(e.target.value)}
                              data-testid="input-place-province"
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                          placeholder="Country"
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          data-testid="input-place-country"
                      />
                  </div>
                  <div className="h-32 bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                      <span className="text-xs text-muted-foreground">Map Preview</span>
                  </div>
                  <div className="flex justify-end pt-2">
                      <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          data-testid="button-save-place"
                      >
                          {isSaving ? "Saving..." : editingPlace ? "Update Place" : "Save Place"}
                      </Button>
                  </div>
              </div>
          </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle data-testid="text-delete-dialog-title">Delete Place</DialogTitle>
                  <DialogDescription>
                      Are you sure you want to delete "{placeToDelete?.name}"? This action cannot be undone.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
                      Cancel
                  </Button>
                  <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      data-testid="button-confirm-delete"
                  >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
