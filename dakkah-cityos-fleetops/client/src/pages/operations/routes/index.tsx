import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { routesApi, driversApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Filter, MoreHorizontal, Route as RouteIcon, Play, MapPin, Settings2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import L from "leaflet";

// Fix Leaflet Icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function RoutesPage() {
  const { data: routes = [] } = routesApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [zone, setZone] = useState("");
  const [driverId, setDriverId] = useState("");
  const [optimizationGoal, setOptimizationGoal] = useState("balanced");
  const [isCreating, setIsCreating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoute = routesApi.useCreate();
  const deleteRoute = routesApi.useDelete();

  const optimizeMutation = useMutation({
    mutationFn: (routeId: string) =>
      fetch(`/api/routes/${routeId}/optimize`, { method: "POST" }).then(res => {
        if (!res.ok) throw new Error("Optimize failed");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route optimized" });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (routeId: string) =>
      fetch(`/api/routes/${routeId}/dispatch`, { method: "POST" }).then(res => {
        if (!res.ok) throw new Error("Dispatch failed");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route dispatched" });
    },
  });

  const handleGeneratePlan = () => {
    setIsCreating(true);
    createRoute.mutate(
      {
        tracking_id: routeName || "RT-" + Date.now(),
        driver_uuid: driverId || undefined,
        status: "draft",
        distance: "0 km",
        duration: "0 min",
        stops: 0,
      } as any,
      {
        onSuccess: () => {
          toast({ title: "Route plan created" });
          setSheetOpen(false);
          setRouteName("");
          setZone("");
          setDriverId("");
          setOptimizationGoal("balanced");
          setIsCreating(false);
        },
        onError: () => {
          toast({ title: "Failed to create route", variant: "destructive" });
          setIsCreating(false);
        },
      }
    );
  };

  const handleOptimize = (routeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    optimizeMutation.mutate(routeId);
  };

  const handleDispatch = (routeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatchMutation.mutate(routeId);
  };

  const handleDelete = (routeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteRoute.mutate(routeId, {
      onSuccess: () => {
        toast({ title: "Route deleted" });
        if (selectedRoute?.id === routeId) setSelectedRoute(null);
      },
    });
  };

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRouteId, setAssignRouteId] = useState<string | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");

  const updateRoute = routesApi.useUpdate();

  const handleAssignDriver = () => {
    if (!assignRouteId || !assignDriverId) return;
    updateRoute.mutate(
      { id: assignRouteId, driver_uuid: assignDriverId } as any,
      {
        onSuccess: () => {
          const driver = drivers.find(d => d.id === assignDriverId);
          toast({ title: "Driver assigned", description: `${driver?.name || "Driver"} assigned to route.` });
          setAssignDialogOpen(false);
          setAssignRouteId(null);
          setAssignDriverId("");
        },
        onError: () => {
          toast({ title: "Failed to assign driver", variant: "destructive" });
        },
      }
    );
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredRoutes = routes.filter(r => {
    const matchesSearch = (r.driver_uuid || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.tracking_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="p-6 pb-0 space-y-4">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Route Optimization</h1>
                <p className="text-muted-foreground">Plan, optimize, and dispatch multi-stop routes.</p>
            </div>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button data-testid="button-new-route">
                        <Plus className="mr-2 h-4 w-4" />
                        New Route Plan
                    </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Create Route Plan</SheetTitle>
                        <SheetDescription>Configure parameters for a new optimized route.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label>Route Name / ID</Label>
                            <Input
                              placeholder="Auto-generated if empty"
                              value={routeName}
                              onChange={(e) => setRouteName(e.target.value)}
                              data-testid="input-route-name"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Service Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Service Zone</Label>
                            <Select value={zone} onValueChange={setZone}>
                                <SelectTrigger data-testid="select-zone">
                                    <SelectValue placeholder="Select zone..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="downtown">Downtown Core</SelectItem>
                                    <SelectItem value="north">North Suburbs</SelectItem>
                                    <SelectItem value="airport">Airport Region</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Assign Driver (Optional)</Label>
                            <Select value={driverId} onValueChange={setDriverId}>
                                <SelectTrigger data-testid="select-driver">
                                    <SelectValue placeholder="Select driver..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.name} ({driver.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                         <div className="space-y-2">
                            <Label>Optimization Goal</Label>
                            <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                                <SelectTrigger data-testid="select-optimization-goal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="balanced">Balanced (Time & Distance)</SelectItem>
                                    <SelectItem value="fastest">Fastest Time</SelectItem>
                                    <SelectItem value="shortest">Shortest Distance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                              className="w-full"
                              onClick={handleGeneratePlan}
                              disabled={isCreating}
                              data-testid="button-generate-plan"
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                {isCreating ? "Generating..." : "Generate Plan"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Driver</DialogTitle>
                  <DialogDescription>Select a driver to assign to this route.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Driver</Label>
                    <Select value={assignDriverId} onValueChange={setAssignDriverId}>
                      <SelectTrigger data-testid="select-assign-driver">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                  <Button data-testid="button-confirm-assign" onClick={handleAssignDriver} disabled={!assignDriverId || updateRoute.isPending}>
                    {updateRoute.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
            <div className="flex items-center gap-4 pb-4">
            <Input 
                placeholder="Search routes..." 
                className="max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-routes"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-filter-routes">
                    <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("optimized")}>Optimized</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("dispatched")}>Dispatched</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 overflow-hidden px-6 pb-6">
            <ResizablePanelGroup direction="horizontal" className="rounded-lg border">
                {/* List Panel */}
                <ResizablePanel defaultSize={selectedRoute ? 40 : 100} minSize={30}>
                    <div className="h-full bg-card overflow-y-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Route ID</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Stops</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredRoutes.map((route) => (
                                <TableRow 
                                    key={route.id} 
                                    className={`cursor-pointer ${selectedRoute?.id === route.id ? 'bg-muted/50' : ''}`}
                                    onClick={() => setSelectedRoute(route)}
                                    data-testid={`row-route-${route.id}`}
                                >
                                <TableCell className="font-mono font-medium">
                                    <div className="flex items-center gap-2">
                                        <RouteIcon className="h-4 w-4 text-muted-foreground" />
                                        {route.tracking_id}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {route.driver_uuid || "Unassigned"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={route.status === "active" ? "default" : route.status === "draft" ? "secondary" : "outline"} className="capitalize">
                                    {route.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {route.stops ?? 0}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedRoute(route); }}>View Map</DropdownMenuItem>
                                        <DropdownMenuItem
                                          data-testid="button-optimize"
                                          onClick={(e) => handleOptimize(route.id, e)}
                                        >
                                          Optimize
                                        </DropdownMenuItem>
                                        <DropdownMenuItem data-testid="button-assign-driver" onClick={(e) => {
                                          e.stopPropagation();
                                          setAssignRouteId(route.id);
                                          setAssignDriverId(route.driver_uuid || "");
                                          setAssignDialogOpen(true);
                                        }}>Assign Driver</DropdownMenuItem>
                                        {route.status === 'draft' && (
                                            <DropdownMenuItem
                                              className="text-primary font-medium"
                                              data-testid="button-dispatch"
                                              onClick={(e) => handleDispatch(route.id, e)}
                                            >
                                                <Play className="h-3 w-3 mr-2" /> Dispatch
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          data-testid="button-delete"
                                          onClick={(e) => handleDelete(route.id, e)}
                                        >
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
                </ResizablePanel>

                <ResizableHandle />

                {/* Detail/Map Panel */}
                {selectedRoute && (
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col">
                            <div className="border-b p-4 bg-muted/10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {selectedRoute.tracking_id} 
                                        <Badge variant="outline">{selectedRoute.distance}</Badge>
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <CalendarIcon className="h-3 w-3" /> {format(new Date(selectedRoute.date), "PPP")}
                                        <span className="text-muted-foreground/50">•</span>
                                        {selectedRoute.stops ?? 0} Stops
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      data-testid="button-optimize"
                                      disabled={optimizeMutation.isPending}
                                      onClick={() => handleOptimize(selectedRoute.id)}
                                    >
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        {optimizeMutation.isPending ? "Optimizing..." : "Optimize"}
                                    </Button>
                                    <Button size="sm" onClick={() => setSelectedRoute(null)}>Close</Button>
                                </div>
                            </div>
                            
                            <div className="flex-1 relative bg-muted/20">
                                <MapContainer 
                                    center={[51.505, -0.09]} 
                                    zoom={12} 
                                    zoomControl={false}
                                    className="h-full w-full z-0"
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                    />
                                    {/* Mock Stops Markers */}
                                    <Marker position={[51.505, -0.09]}>
                                        <Popup>Stop 1: Warehouse</Popup>
                                    </Marker>
                                    <Marker position={[51.51, -0.1]}>
                                        <Popup>Stop 2: Customer A</Popup>
                                    </Marker>
                                     <Marker position={[51.515, -0.08]}>
                                        <Popup>Stop 3: Customer B</Popup>
                                    </Marker>
                                    
                                    {/* Mock Polyline */}
                                    {/* @ts-ignore */}
                                    <Polyline 
                                        positions={[[51.505, -0.09], [51.51, -0.1], [51.515, -0.08]]}
                                        pathOptions={{ color: '#2563eb' }}
                                    />
                                </MapContainer>
                                
                                <Card className="absolute bottom-4 left-4 right-4 z-[400] bg-white/95 backdrop-blur shadow-lg border-0">
                                    <CardContent className="p-4 flex items-center gap-4 overflow-x-auto">
                                        {[1, 2, 3].map(step => (
                                            <div key={step} className="flex items-center gap-2 min-w-[150px]">
                                                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                                    {step}
                                                </div>
                                                <div className="text-sm">
                                                    <div className="font-medium">Stop #{step}</div>
                                                    <div className="text-xs text-muted-foreground">10:30 AM</div>
                                                </div>
                                                {step < 3 && <div className="h-[2px] w-8 bg-muted mx-2" />}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </ResizablePanel>
                )}
            </ResizablePanelGroup>
        </div>
      </div>
    </MainLayout>
  );
}
