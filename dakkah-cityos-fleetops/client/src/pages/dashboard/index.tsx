import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
  Maximize2, 
  Minimize2, 
  Map as MapIcon, 
  LayoutList, 
  SquareKanban,
  Search,
  Filter,
  Plus,
  Minus,
  Navigation,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  MoreHorizontal,
  Truck,
  Users,
  Package,
  Building,
  Clock,
  Trash2,
  Wrench,
  Pencil,
  Crosshair,
  X,
  Locate
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { vehiclesApi, driversApi, placesApi, ordersApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Fix Leaflet Icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function createTruckIcon(dark: boolean) {
  const fill = dark ? '#60a5fa' : '#1e40af';
  const bg = dark ? '#1e293b' : '#ffffff';
  const stroke = dark ? '#93c5fd' : '#1e3a5f';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/><path d="M3 12h1l1-3h5V6H5a1 1 0 00-1 1v4zm0 0h1m0 0a2 2 0 104 0m-4 0h4m0 0h3m0 0a2 2 0 104 0m-4 0h4" fill="none" stroke="${fill}" stroke-width="0"/><g transform="translate(5,5) scale(0.58)"><rect x="1" y="3" width="15" height="13" rx="1" fill="${fill}" opacity="0.15"/><path d="M16 8h3l3 4v5h-2m-4 0H9m-6 0H1V6a1 1 0 011-1h12v11" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18" r="2" fill="${fill}" stroke="${fill}" stroke-width="1"/><circle cx="18.5" cy="18" r="2" fill="${fill}" stroke="${fill}" stroke-width="1"/></g></svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createPlaceIcon(dark: boolean) {
  const fill = dark ? '#fb923c' : '#ea580c';
  const bg = dark ? '#1e293b' : '#ffffff';
  const stroke = dark ? '#fdba74' : '#9a3412';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/><g transform="translate(4,3) scale(0.67)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${fill}" opacity="0.2"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="none" stroke="${fill}" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="${fill}"/></g></svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const DARK_TILES = new Set(['dark', 'satellite']);

const MAP_TILES: Record<string, { name: string; url: string; attribution: string }> = {
  default: { name: "Default", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: "&copy; CARTO" },
  satellite: { name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "&copy; Esri" },
  dark: { name: "Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "&copy; CARTO" },
  light: { name: "Light", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attribution: "&copy; CARTO" },
  osm: { name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap" },
};

const TRAFFIC_ROUTES = [
  { color: "#ef4444", weight: 4, positions: [[24.7136, 46.6753], [24.7200, 46.6900], [24.7350, 46.7050], [24.7500, 46.7200]] as [number, number][] },
  { color: "#f59e0b", weight: 3, positions: [[24.6900, 46.6500], [24.7000, 46.6700], [24.7136, 46.6753], [24.7250, 46.6600]] as [number, number][] },
  { color: "#22c55e", weight: 3, positions: [[24.7400, 46.6400], [24.7500, 46.6600], [24.7600, 46.6800], [24.7800, 46.7000]] as [number, number][] },
  { color: "#ef4444", weight: 4, positions: [[24.6800, 46.7200], [24.7000, 46.7300], [24.7200, 46.7400], [24.7400, 46.7500]] as [number, number][] },
  { color: "#22c55e", weight: 3, positions: [[24.7600, 46.6200], [24.7700, 46.6400], [24.7800, 46.6600], [24.7900, 46.6800]] as [number, number][] },
  { color: "#f59e0b", weight: 3, positions: [[24.7100, 46.7600], [24.7200, 46.7800], [24.7400, 46.7900], [24.7600, 46.8000]] as [number, number][] },
];

function MapToolButton({ tooltip, active, onClick, children, testId }: { tooltip: string; active?: boolean; onClick: () => void; children: React.ReactNode; testId: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-9 w-9 hover:bg-muted ${active ? 'bg-muted ring-1 ring-primary/30' : ''}`} onClick={onClick} data-testid={testId}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="z-[500]">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface MapControlsProps {
  layers: Record<string, boolean>;
  onToggleLayer: (layer: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  tileKey: string;
  onTileChange: (key: string) => void;
  vehicles: { location?: any }[];
}

function MapZoomControls({ layers, onToggleLayer, searchQuery, onSearchChange, onSearchSubmit, tileKey, onTileChange, vehicles }: MapControlsProps) {
  const map = useMap();
  const [layersOpen, setLayersOpen] = useState(false);

  const handleFitAll = () => {
    const coords = vehicles.filter(v => (v.location as any)?.coordinates).map(v => [(v.location as any).coordinates[1], (v.location as any).coordinates[0]] as [number, number]);
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 14 });
    } else {
      map.setView([24.7136, 46.6753], 12);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute top-4 left-4 z-[400] flex items-start gap-2">
        <div className="flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur shadow-md rounded-lg flex flex-col border border-gray-200/80">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-t-lg rounded-b-none border-b border-gray-200/60 hover:bg-gray-100" onClick={() => map.zoomIn()} data-testid="button-map-zoom-in">
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[500]"><p>Zoom In</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-b-lg rounded-t-none hover:bg-gray-100" onClick={() => map.zoomOut()} data-testid="button-map-zoom-out">
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[500]"><p>Zoom Out</p></TooltipContent>
            </Tooltip>
          </div>

          <div className="bg-white/95 backdrop-blur shadow-md rounded-lg flex flex-col border border-gray-200/80 p-1 gap-0.5">
            <MapToolButton tooltip="Fit All Vehicles" onClick={handleFitAll} testId="button-map-navigate">
              <Locate className="h-4 w-4 text-blue-600" />
            </MapToolButton>

            <MapToolButton tooltip={layers.search ? "Close Search" : "Search Map"} active={layers.search} onClick={() => { onToggleLayer('search'); setLayersOpen(false); }} testId="button-map-search">
              <Search className="h-4 w-4" />
            </MapToolButton>

            <div className="relative">
              <MapToolButton tooltip="Map Style" active={layersOpen} onClick={() => { setLayersOpen(!layersOpen); if (!layersOpen && layers.search) onToggleLayer('search'); }} testId="button-map-layers">
                <Layers className="h-4 w-4" />
              </MapToolButton>
            </div>

            <MapToolButton tooltip={layers.places ? "Hide Places" : "Show Places"} active={layers.places} onClick={() => onToggleLayer('places')} testId="button-map-places">
              <MapPin className={`h-4 w-4 ${layers.places ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </MapToolButton>

            <MapToolButton tooltip={layers.traffic ? "Hide Traffic" : "Show Traffic"} active={layers.traffic} onClick={() => onToggleLayer('traffic')} testId="button-map-traffic">
              {layers.traffic ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </MapToolButton>

            <MapToolButton tooltip="Re-center Map" onClick={() => map.setView([24.7136, 46.6753], 12)} testId="button-map-recenter">
              <Crosshair className="h-4 w-4 text-muted-foreground" />
            </MapToolButton>
          </div>
        </div>

        {layers.search && (
          <div className="bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200/80 p-3 w-72 mt-[52px] animate-in slide-in-from-left-2 duration-200" data-testid="panel-map-search">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Search Map</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0 hover:bg-gray-100" onClick={() => onToggleLayer('search')} data-testid="button-map-search-close">
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="Vehicle plate, place name..."
                className="h-8 text-sm border-gray-200"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                autoFocus
                data-testid="input-map-search"
              />
              <Button variant="default" size="sm" className="h-8 px-3 shrink-0" onClick={onSearchSubmit} data-testid="button-map-search-submit">
                Go
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">Press Enter or click Go to search</p>
          </div>
        )}

        {layersOpen && (
          <div className="bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200/80 p-3 w-52 mt-[52px] animate-in slide-in-from-left-2 duration-200" data-testid="panel-map-layers">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Map Style</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0 hover:bg-gray-100" onClick={() => setLayersOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {Object.entries(MAP_TILES).map(([key, tile]) => (
                <button
                  key={key}
                  className={`w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${tileKey === key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                  onClick={() => { onTileChange(key); setLayersOpen(false); }}
                  data-testid={`button-map-tile-${key}`}
                >
                  {tileKey === key && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  {tileKey !== key && <div className="h-1.5 w-1.5 shrink-0" />}
                  {tile.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState("map");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState("vehicles");
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [mapLayers, setMapLayers] = useState({ search: false, layers: false, places: true, traffic: false });
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [panelFilter, setPanelFilter] = useState("");
  const [mapTileKey, setMapTileKey] = useState("default");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<{ lat: number; lng: number; name: string }[]>([]);
  
  const { data: vehicles = [] } = vehiclesApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const { data: places = [] } = placesApi.useList();
  const { data: orders = [] } = ordersApi.useList();

  const isDarkMap = DARK_TILES.has(mapTileKey);
  const truckIcon = useMemo(() => createTruckIcon(isDarkMap), [isDarkMap]);
  const placeIcon = useMemo(() => createPlaceIcon(isDarkMap), [isDarkMap]);
  
  const deleteVehicle = vehiclesApi.useDelete();
  const updateVehicle = vehiclesApi.useUpdate();
  const deleteDriver = driversApi.useDelete();
  const updateDriver = driversApi.useUpdate();
  const deletePlace = placesApi.useDelete();
  const updatePlace = placesApi.useUpdate();

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editSheet, setEditSheet] = useState<{ type: string; entity: any; mode: 'view' | 'edit' } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const handleToggleLayer = (layer: string) => {
    setMapLayers(prev => {
      const newState = { ...prev, [layer]: !prev[layer as keyof typeof prev] };
      if (layer === 'search') {
        if (!newState.search) setMapSearchResults([]);
      } else {
        const label = layer === 'places' ? (newState.places ? 'Places shown' : 'Places hidden') : 
                      layer === 'traffic' ? (newState.traffic ? 'Traffic overlay shown' : 'Traffic overlay hidden') : '';
        if (label) toast({ title: label });
      }
      return newState;
    });
  };

  const handleMapSearch = () => {
    if (!mapSearchQuery.trim()) return;
    const q = mapSearchQuery.toLowerCase();
    const results: { lat: number; lng: number; name: string }[] = [];
    vehicles.forEach(v => {
      if (v.plate_number?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q)) {
        const lat = (v.location as any)?.coordinates?.[1];
        const lng = (v.location as any)?.coordinates?.[0];
        if (lat && lng) results.push({ lat, lng, name: `${v.plate_number} (${v.model})` });
      }
    });
    places.forEach(p => {
      const pAddress = [p.street1, p.city, p.province, p.country].filter(Boolean).join(', ');
      if (p.name?.toLowerCase().includes(q) || pAddress?.toLowerCase().includes(q)) {
        const lat = (p.location as any)?.coordinates?.[1];
        const lng = (p.location as any)?.coordinates?.[0];
        if (lat && lng) results.push({ lat, lng, name: p.name });
      }
    });
    setMapSearchResults(results);
    if (results.length === 0) {
      toast({ title: "No results", description: `No vehicles or places match "${mapSearchQuery}"` });
    } else {
      toast({ title: `${results.length} result${results.length > 1 ? 's' : ''} found` });
    }
  };

  const filteredPanelVehicles = useMemo(() => {
    if (!panelFilter) return vehicles;
    const q = panelFilter.toLowerCase();
    return vehicles.filter(v => v.plate_number?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q) || v.status?.toLowerCase().includes(q));
  }, [vehicles, panelFilter]);

  const filteredPanelDrivers = useMemo(() => {
    if (!panelFilter) return drivers;
    const q = panelFilter.toLowerCase();
    return drivers.filter(d => d.name?.toLowerCase().includes(q) || d.status?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q));
  }, [drivers, panelFilter]);

  const filteredPanelPlaces = useMemo(() => {
    if (!panelFilter) return places;
    const q = panelFilter.toLowerCase();
    return places.filter(p => p.name?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q));
  }, [places, panelFilter]);

  const filteredTableVehicles = useMemo(() => {
    if (!dashboardSearch) return vehicles;
    const q = dashboardSearch.toLowerCase();
    return vehicles.filter(v => v.plate_number?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q) || v.status?.toLowerCase().includes(q));
  }, [vehicles, dashboardSearch]);

  const filteredTableDrivers = useMemo(() => {
    if (!dashboardSearch) return drivers;
    const q = dashboardSearch.toLowerCase();
    return drivers.filter(d => d.name?.toLowerCase().includes(q) || d.status?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q));
  }, [drivers, dashboardSearch]);

  const positions = vehicles.map(v => ({
      id: v.id,
      plate: v.plate_number,
      lat: (v.location as any)?.coordinates?.[1] ?? 24.7,
      lng: (v.location as any)?.coordinates?.[0] ?? 46.7,
      speed: Math.floor(Math.random() * 80),
      heading: Math.floor(Math.random() * 360),
      timestamp: new Date()
  }));

  const handleEntityClick = (entity: any, type: string) => {
      setSelectedEntity({ ...entity, entityType: type });
      setBottomPanelOpen(true);
  };

  const openViewSheet = (entity: any, type: string) => {
    setEditSheet({ type, entity, mode: 'view' });
    setEditForm({ ...entity });
  };

  const openEditSheet = (entity: any, type: string) => {
    setEditSheet({ type, entity, mode: 'edit' });
    setEditForm({ ...entity });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const { type, id, name } = deleteTarget;
    const mutation = type === 'vehicle' ? deleteVehicle : type === 'driver' ? deleteDriver : deletePlace;
    mutation.mutate(id, {
      onSuccess: () => {
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted`, description: `${name} has been removed.` });
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleSaveEdit = () => {
    if (!editSheet) return;
    const { type, entity } = editSheet;
    const { id, created_at, ...rest } = editForm;
    const callbacks = {
      onSuccess: () => {
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Updated`, description: `${editForm.plate_number || editForm.name} has been updated.` });
        setEditSheet(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    };
    if (type === 'vehicle') {
      updateVehicle.mutate({ id: entity.id, ...rest }, callbacks);
    } else if (type === 'driver') {
      updateDriver.mutate({ id: entity.id, ...rest }, callbacks);
    } else if (type === 'place') {
      updatePlace.mutate({ id: entity.id, ...rest }, callbacks);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] relative overflow-hidden bg-background">
        
        {/* Top Control Bar */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                <Button 
                    variant={viewMode === "map" ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => setViewMode("map")}
                    className="h-8 text-xs font-medium"
                >
                    <MapIcon className="mr-2 h-3.5 w-3.5" /> Map
                </Button>
                <Button 
                    variant={viewMode === "table" ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => setViewMode("table")}
                    className="h-8 text-xs font-medium"
                >
                    <LayoutList className="mr-2 h-3.5 w-3.5" /> Table
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-primary/20 text-primary-foreground">
                        {vehicles.length + drivers.length}
                    </Badge>
                </Button>
                <Button 
                    variant={viewMode === "board" ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => setViewMode("board")}
                    className="h-8 text-xs font-medium"
                >
                    <SquareKanban className="mr-2 h-3.5 w-3.5" /> Board
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-primary/20 text-primary-foreground">
                        {orders.length}
                    </Badge>
                </Button>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search orders, drivers..." className="pl-8 h-9" value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} data-testid="input-dashboard-search" />
                </div>
                <Button size="sm" className="h-9" asChild data-testid="button-create-order-dashboard">
                    <a href="/operations/orders/new">
                      <Plus className="mr-2 h-4 w-4" /> Create Order
                    </a>
                </Button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
            
            {/* View Mode: Map */}
            {viewMode === "map" && (
                <div className="absolute inset-0 z-0">
                    <MapContainer 
                        center={[24.7136, 46.6753]} 
                        zoom={12} 
                        zoomControl={false}
                        className="h-full w-full"
                    >
                        <TileLayer
                            key={mapTileKey}
                            url={MAP_TILES[mapTileKey]?.url || MAP_TILES.default.url}
                            attribution={MAP_TILES[mapTileKey]?.attribution || MAP_TILES.default.attribution}
                        />
                        
                        <MapZoomControls 
                            layers={mapLayers} 
                            onToggleLayer={handleToggleLayer}
                            searchQuery={mapSearchQuery}
                            onSearchChange={setMapSearchQuery}
                            onSearchSubmit={handleMapSearch}
                            tileKey={mapTileKey}
                            onTileChange={setMapTileKey}
                            vehicles={vehicles}
                        />

                        {/* Vehicle Markers */}
                        {vehicles.map(v => (
                             <Marker 
                                key={v.id} 
                                position={[(v.location as any)?.coordinates?.[1] ?? 24.7, (v.location as any)?.coordinates?.[0] ?? 46.7]}
                                icon={truckIcon}
                                eventHandlers={{
                                    click: () => {
                                        handleEntityClick(v, 'vehicle');
                                        setActivePanelTab('vehicles');
                                    },
                                }}
                             >
                                <Popup>
                                    <div className="p-2 min-w-[150px]">
                                        <div className="font-bold flex items-center gap-2">
                                            <Truck className="h-4 w-4" /> {v.plate_number}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">{v.model}</div>
                                        <Badge variant={v.status === 'active' ? 'default' : 'secondary'} className="mt-2 text-[10px] capitalize">
                                            {v.status}
                                        </Badge>
                                    </div>
                                </Popup>
                             </Marker>
                        ))}

                        {/* Place Markers (toggle via layers) */}
                        {mapLayers.places && places.map(p => (
                             <Marker 
                                key={p.id} 
                                position={[(p.location as any)?.coordinates?.[1] ?? 24.7, (p.location as any)?.coordinates?.[0] ?? 46.7]}
                                icon={placeIcon}
                                eventHandlers={{
                                    click: () => {
                                        handleEntityClick(p, 'place');
                                        setActivePanelTab('places');
                                    },
                                }}
                             >
                                <Popup>
                                    <div className="p-2 min-w-[150px]">
                                        <div className="font-bold flex items-center gap-2">
                                            <Building className="h-4 w-4" /> {p.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">{[p.street1, p.city, p.country].filter(Boolean).join(', ')}</div>
                                        <Badge variant="outline" className="mt-2 text-[10px] capitalize">
                                            {p.type.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </Popup>
                             </Marker>
                        ))}

                        {/* Traffic Overlay */}
                        {mapLayers.traffic && TRAFFIC_ROUTES.map((route, i) => (
                            <Polyline key={`traffic-${i}`} positions={route.positions} pathOptions={{ color: route.color, weight: route.weight, opacity: 0.7, dashArray: route.color === '#ef4444' ? '8 4' : undefined }} />
                        ))}

                        {/* Search Result Highlights */}
                        {mapSearchResults.map((r, i) => (
                            <Circle key={`search-${i}`} center={[r.lat, r.lng]} radius={400} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}>
                                <Popup><div className="text-sm font-medium">{r.name}</div></Popup>
                            </Circle>
                        ))}

                    </MapContainer>
                </div>
            )}

            {/* View Mode: Board */}
            {viewMode === "board" && (
                <div className="h-full overflow-auto p-6 bg-muted/10">
                    <div className="flex gap-6 h-full min-w-[1000px]">
                        {['pending', 'assigned', 'in_transit', 'delivered'].map(status => (
                            <div key={status} className="flex-1 flex flex-col min-w-[280px] bg-muted/30 rounded-lg p-3 border">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className="font-semibold capitalize text-sm">{status.replace('_', ' ')}</h3>
                                    <Badge variant="secondary">{orders.filter(o => o.status === status).length}</Badge>
                                </div>
                                <div className="space-y-3 flex-1 overflow-auto pr-2">
                                    {orders.filter(o => o.status === status).map(order => (
                                        <Card key={order.id} className="cursor-move hover:shadow-md transition-shadow">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="font-mono text-[10px]">{order.tracking_number}</Badge>
                                                    <span className="text-xs font-medium text-green-600">${order.total_amount}</span>
                                                </div>
                                                <h4 className="font-medium text-sm truncate">{order.customer_uuid || 'N/A'}</h4>
                                                <p className="text-xs text-muted-foreground truncate mb-2">{order.notes || ''}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {order.created_at ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true }) : ''}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* View Mode: Table (Simplified placeholder) */}
            {viewMode === "table" && (
                 <div className="h-full p-6 overflow-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Entities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Name/Plate</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTableVehicles.map(v => (
                                        <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/management/vehicles')}>
                                            <TableCell className="font-mono">{v.id.substring(0,8)}...</TableCell>
                                            <TableCell><Badge variant="outline">Vehicle</Badge></TableCell>
                                            <TableCell>{v.plate_number}</TableCell>
                                            <TableCell><Badge>{v.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                     {filteredTableDrivers.map(d => (
                                        <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/management/drivers')}>
                                            <TableCell className="font-mono">{d.id.substring(0,8)}...</TableCell>
                                            <TableCell><Badge variant="outline">Driver</Badge></TableCell>
                                            <TableCell>{d.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            )}

            {/* Bottom Panel Overlay (Only visible in Map Mode) */}
            {viewMode === "map" && (
                <div className={`absolute bottom-0 left-0 right-0 z-[500] bg-card border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out flex flex-col ${bottomPanelOpen ? 'h-[40vh]' : 'h-10'}`}>
                    {/* Panel Header / Drag Handle */}
                    <div className="flex items-center justify-between px-4 h-10 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors shrink-0" onClick={() => setBottomPanelOpen(!bottomPanelOpen)}>
                         <div className="flex items-center gap-1">
                             <div className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full" />
                         </div>
                         {bottomPanelOpen ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {/* Tabs Header */}
                    <div className="px-4 border-b bg-card shrink-0">
                        <Tabs value={activePanelTab} onValueChange={setActivePanelTab} className="w-full">
                            <TabsList className="h-10 bg-transparent p-0 gap-6 justify-start">
                                <TabsTrigger 
                                    value="vehicles" 
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2 font-medium"
                                >
                                    <Truck className="mr-2 h-4 w-4" /> Vehicles
                                    <Badge variant="secondary" className="ml-2 h-5 px-1 text-[10px]">{vehicles.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="drivers" 
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2 font-medium"
                                >
                                    <Users className="mr-2 h-4 w-4" /> Drivers
                                    <Badge variant="secondary" className="ml-2 h-5 px-1 text-[10px]">{drivers.length}</Badge>
                                </TabsTrigger>
                                 <TabsTrigger 
                                    value="places" 
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2 font-medium"
                                >
                                    <Building className="mr-2 h-4 w-4" /> Places
                                    <Badge variant="secondary" className="ml-2 h-5 px-1 text-[10px]">{places.length}</Badge>
                                </TabsTrigger>
                                 <TabsTrigger 
                                    value="positions" 
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2 font-medium"
                                >
                                    <Navigation className="mr-2 h-4 w-4" /> Positions
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-auto bg-card">
                        {bottomPanelOpen && (
                            <div className="p-0 h-full flex flex-col">
                                {/* Filter Bar */}
                                <div className="p-2 border-b flex items-center gap-2 bg-muted/10 shrink-0">
                                    <Input 
                                        className="h-8 w-64 bg-background" 
                                        placeholder={`Filter ${activePanelTab} by keyword...`}
                                        value={panelFilter}
                                        onChange={(e) => setPanelFilter(e.target.value)}
                                        data-testid="input-panel-filter"
                                    />
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => setPanelFilter("")} data-testid="button-panel-clear-filter">
                                        <Filter className="h-3 w-3 mr-2" /> {panelFilter ? "Clear" : "Filter"}
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    {activePanelTab === 'vehicles' && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-9">Vehicle</TableHead>
                                                    <TableHead className="h-9">Model</TableHead>
                                                    <TableHead className="h-9">Status</TableHead>
                                                    <TableHead className="h-9">Location</TableHead>
                                                    <TableHead className="h-9 text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPanelVehicles.map(v => (
                                                    <TableRow key={v.id} className="h-10 cursor-pointer hover:bg-muted/50" onClick={() => handleEntityClick(v, 'vehicle')}>
                                                        <TableCell className="py-2 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Truck className="h-3 w-3 text-muted-foreground" />
                                                                {v.plate_number}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-sm">{v.model}</TableCell>
                                                        <TableCell className="py-2">
                                                            <Badge variant={v.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 capitalize">
                                                                {v.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                                            {(v.location as any)?.coordinates ? `${(v.location as any).coordinates[1]?.toFixed(4)}, ${(v.location as any).coordinates[0]?.toFixed(4)}` : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right">
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end" className="z-[600]">
                                                                <DropdownMenuItem data-testid={`menu-view-vehicle-${v.id}`} onClick={(e) => { e.stopPropagation(); openViewSheet(v, 'vehicle'); }}>View Details</DropdownMenuItem>
                                                                <DropdownMenuItem data-testid={`menu-edit-vehicle-${v.id}`} onClick={(e) => { e.stopPropagation(); openEditSheet(v, 'vehicle'); }}>
                                                                  <Pencil className="h-3 w-3 mr-2" /> Edit Vehicle
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem data-testid={`menu-maintenance-vehicle-${v.id}`} onClick={(e) => { e.stopPropagation(); navigate('/maintenance/work-orders'); }}>
                                                                  <Wrench className="h-3 w-3 mr-2" /> Maintenance Log
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" data-testid={`menu-delete-vehicle-${v.id}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'vehicle', id: v.id, name: v.plate_number }); }}>
                                                                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                    {activePanelTab === 'drivers' && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-9">Driver</TableHead>
                                                    <TableHead className="h-9">Status</TableHead>
                                                    <TableHead className="h-9">Assigned Vehicle</TableHead>
                                                    <TableHead className="h-9">Phone</TableHead>
                                                    <TableHead className="h-9 text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPanelDrivers.map(d => (
                                                    <TableRow key={d.id} className="h-10 cursor-pointer hover:bg-muted/50" onClick={() => navigate('/management/drivers')}>
                                                        <TableCell className="py-2 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Users className="h-3 w-3 text-muted-foreground" />
                                                                {d.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                             <Badge variant={d.status === 'online' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 capitalize">
                                                                {d.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-sm text-muted-foreground">
                                                            {d.vehicle_uuid || '-'}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                                            {d.phone}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right">
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end" className="z-[600]">
                                                                <DropdownMenuItem data-testid={`menu-view-driver-${d.id}`} onClick={(e) => { e.stopPropagation(); openViewSheet(d, 'driver'); }}>View Details</DropdownMenuItem>
                                                                <DropdownMenuItem data-testid={`menu-edit-driver-${d.id}`} onClick={(e) => { e.stopPropagation(); openEditSheet(d, 'driver'); }}>
                                                                  <Pencil className="h-3 w-3 mr-2" /> Edit Driver
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" data-testid={`menu-deactivate-driver-${d.id}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'driver', id: d.id, name: d.name }); }}>
                                                                  Deactivate
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                    {activePanelTab === 'places' && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-9">Name</TableHead>
                                                    <TableHead className="h-9">Type</TableHead>
                                                    <TableHead className="h-9">Address</TableHead>
                                                    <TableHead className="h-9 text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPanelPlaces.map(p => (
                                                    <TableRow key={p.id} className="h-10 cursor-pointer hover:bg-muted/50" onClick={() => handleEntityClick(p, 'place')}>
                                                        <TableCell className="py-2 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Building className="h-3 w-3 text-muted-foreground" />
                                                                {p.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <Badge variant="outline" className="capitalize text-[10px]">
                                                                {p.type.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {[p.street1, p.city, p.country].filter(Boolean).join(', ')}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right">
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end" className="z-[600]">
                                                                <DropdownMenuItem data-testid={`menu-view-place-${p.id}`} onClick={(e) => { e.stopPropagation(); openViewSheet(p, 'place'); }}>View Details</DropdownMenuItem>
                                                                <DropdownMenuItem data-testid={`menu-edit-place-${p.id}`} onClick={(e) => { e.stopPropagation(); openEditSheet(p, 'place'); }}>
                                                                  <Pencil className="h-3 w-3 mr-2" /> Edit Place
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive" data-testid={`menu-delete-place-${p.id}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'place', id: p.id, name: p.name }); }}>
                                                                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                    {activePanelTab === 'positions' && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-9">Timestamp</TableHead>
                                                    <TableHead className="h-9">Entity</TableHead>
                                                    <TableHead className="h-9">Coordinates</TableHead>
                                                    <TableHead className="h-9">Speed</TableHead>
                                                    <TableHead className="h-9">Heading</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {positions.map(pos => (
                                                    <TableRow key={pos.id} className="h-10 font-mono text-xs">
                                                        <TableCell className="py-2 text-muted-foreground">
                                                            {formatDistanceToNow(pos.timestamp, { addSuffix: true })}
                                                        </TableCell>
                                                        <TableCell className="py-2 font-medium text-foreground">
                                                            {pos.plate}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {pos.speed} km/h
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {pos.heading}°
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Delete/Deactivate Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.type === 'driver' ? 'Deactivate Driver' : `Delete ${deleteTarget?.type?.charAt(0).toUpperCase()}${deleteTarget?.type?.slice(1)}`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.type === 'driver'
                  ? `Are you sure you want to deactivate "${deleteTarget?.name}"? This will remove them from active duty.`
                  : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
                data-testid="button-confirm-delete"
              >
                {deleteTarget?.type === 'driver' ? 'Deactivate' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View/Edit Sheet */}
        <Sheet open={!!editSheet} onOpenChange={(open) => !open && setEditSheet(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editSheet?.mode === 'edit' ? `Edit ${editSheet?.type?.charAt(0).toUpperCase()}${editSheet?.type?.slice(1)}` : `${editSheet?.type?.charAt(0).toUpperCase()}${editSheet?.type?.slice(1)} Details`}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              {editSheet?.type === 'vehicle' && (
                <>
                  <div className="space-y-2">
                    <Label>Plate</Label>
                    <Input value={editForm.plate_number || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, plate_number: e.target.value })} data-testid="input-edit-plate" />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input value={editForm.model || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} data-testid="input-edit-model" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={editForm.type || 'van'} disabled={editSheet.mode === 'view'} onValueChange={(val) => setEditForm({ ...editForm, type: val })}>
                      <SelectTrigger data-testid="select-edit-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="scooter">Scooter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editForm.status || 'inactive'} disabled={editSheet.mode === 'view'} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                      <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {editSheet?.type === 'driver' && (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editForm.name || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={editForm.phone || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} data-testid="input-edit-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={editForm.email || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="input-edit-email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Badge variant={editForm.status === 'online' ? 'default' : 'secondary'} className="capitalize">{editForm.status}</Badge>
                  </div>
                </>
              )}
              {editSheet?.type === 'place' && (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editForm.name || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={editForm.type || 'warehouse'} disabled={editSheet.mode === 'view'} onValueChange={(val) => setEditForm({ ...editForm, type: val })}>
                      <SelectTrigger data-testid="select-edit-place-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="hub">Hub</SelectItem>
                        <SelectItem value="customer_site">Customer Site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Address (Street)</Label>
                    <Input value={editForm.street1 || ''} disabled={editSheet.mode === 'view'} onChange={(e) => setEditForm({ ...editForm, street1: e.target.value })} data-testid="input-edit-address" />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              {editSheet?.mode === 'view' ? (
                <>
                  <Button variant="outline" onClick={() => setEditSheet(null)} data-testid="button-close-sheet">Close</Button>
                  <Button onClick={() => setEditSheet({ ...editSheet, mode: 'edit' })} data-testid="button-switch-edit">
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditSheet(null)} data-testid="button-cancel-edit">Cancel</Button>
                  <Button onClick={handleSaveEdit} data-testid="button-save-edit">Save Changes</Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
