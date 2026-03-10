import { MainLayout } from "@/components/layout/MainLayout";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Truck, 
  User, 
  Navigation, 
  Battery, 
  Signal, 
  Clock, 
  MapPin, 
  Box, 
  ChevronRight 
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { driversApi, ordersApi, vehiclesApi } from "@/lib/api";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function TrackingPage() {
  const { data: allDrivers = [] } = driversApi.useList();
  const { data: allOrders = [] } = ordersApi.useList();
  const { data: allVehicles = [] } = vehiclesApi.useList();
  const [activeTab, setActiveTab] = useState("drivers");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const onlineDrivers = allDrivers.filter(d => d.status !== "offline");
  const activeOrders = allOrders.filter(o => o.status === "in_transit" || o.status === "assigned" || o.status === "dispatched");

  const filteredDrivers = onlineDrivers.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOrders = activeOrders.filter(o =>
    (o.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_uuid || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const driverPositions = filteredDrivers.map((d, i) => {
    const vehicle = allVehicles.find(v => v.driver_uuid === d.id);
    const vLoc = vehicle?.location as any;
    const baseLat = vLoc?.coordinates?.[1] ?? 24.7136 + (i * 0.005);
    const baseLng = vLoc?.coordinates?.[0] ?? 46.6753 + (i * 0.01);
    return {
      ...d,
      lat: baseLat,
      lng: baseLng,
      speed: vehicle ? `${vehicle.speed ?? 0} km/h` : "0 km/h",
      heading: 0,
      battery: 100,
      signal: vehicle ? "Strong" : "Weak",
    };
  });

  const orderPositions = filteredOrders.map((o, i) => {
    const assignedVehicle = o.driver_assigned_uuid ? allVehicles.find(v => v.driver_uuid === o.driver_assigned_uuid) : null;
    return {
      ...o,
      lat: (assignedVehicle?.location as any)?.coordinates?.[1] ?? 24.72 + (i * 0.005),
      lng: (assignedVehicle?.location as any)?.coordinates?.[0] ?? 46.68 + (i * 0.01),
      eta: `${10 + i * 5} mins`,
    };
  });

  const getIcon = (type: string, heading: number = 0) => {
    return new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="
          background-color: ${type === 'driver' ? '#2563eb' : '#16a34a'};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
          transform: rotate(${heading}deg);
        ">
          ${type === 'driver' 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/></svg>'
          }
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <div className="w-[350px] border-r bg-card flex flex-col z-10 shadow-xl">
            <div className="p-4 border-b space-y-4">
                <h1 className="text-xl font-bold tracking-tight" data-testid="text-tracking-title">Live Tracking</h1>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="drivers" className="flex-1" data-testid="tab-drivers">Drivers ({onlineDrivers.length})</TabsTrigger>
                        <TabsTrigger value="orders" className="flex-1" data-testid="tab-orders">Orders ({activeOrders.length})</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input
                      placeholder="Filter..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-tracking-search"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {activeTab === "drivers" && driverPositions.map(driver => (
                        <div 
                            key={driver.id} 
                            className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${selectedItem?.id === driver.id ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                            onClick={() => setSelectedItem(driver)}
                            data-testid={`tracking-driver-${driver.id}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{driver.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Navigation className="h-3 w-3" /> {driver.speed}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={driver.status === 'online' ? 'default' : 'secondary'} className="capitalize">
                                    {driver.status}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <div className="flex items-center gap-1"><Battery className="h-3 w-3" /> {driver.battery}%</div>
                                <div className="flex items-center gap-1"><Signal className="h-3 w-3" /> {driver.signal}</div>
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> 2m ago</div>
                            </div>
                        </div>
                    ))}

                    {activeTab === "drivers" && driverPositions.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No online drivers found.
                      </div>
                    )}

                    {activeTab === "orders" && orderPositions.map(order => (
                        <div 
                            key={order.id} 
                            className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${selectedItem?.id === order.id ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                            onClick={() => setSelectedItem(order)}
                            data-testid={`tracking-order-${order.id}`}
                        >
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Box className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{order.tracking_number}</div>
                                        <div className="text-xs text-muted-foreground">{order.customer_uuid || "—"}</div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                                    {order.status.replace("_", " ")}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-2">
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Truck className="h-3 w-3" /> {order.driver_assigned_uuid ? "Assigned" : "Unassigned"}
                                </div>
                                <div className="font-medium text-green-600">ETA: {order.eta}</div>
                            </div>
                        </div>
                    ))}

                    {activeTab === "orders" && orderPositions.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No active orders to track.
                      </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="flex-1 relative bg-muted/20">
            {selectedItem && (
                <div className="absolute top-4 right-4 z-[400] w-80 animate-in fade-in slide-in-from-right-10 duration-300">
                    <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
                        <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                {selectedItem.customer_uuid ? <Box className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                {selectedItem.name || selectedItem.tracking_number || selectedItem.id}
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedItem(null)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="bg-muted/50 p-2 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1">Speed</div>
                                    <div className="font-mono font-bold">{selectedItem.speed || "N/A"}</div>
                                </div>
                                <div className="bg-muted/50 p-2 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                                    <div className="font-mono font-bold capitalize">{selectedItem.status}</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Last Updated</span>
                                    <span className="font-medium">Just now</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <MapContainer 
                center={[24.7136, 46.6753]} 
                zoom={12} 
                zoomControl={false}
                className="h-full w-full z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {activeTab === "drivers" && driverPositions.map(driver => (
                    <Marker 
                        key={driver.id} 
                        position={[driver.lat, driver.lng]} 
                        icon={getIcon('driver', driver.heading)}
                        eventHandlers={{ click: () => setSelectedItem(driver) }}
                    />
                ))}

                {activeTab === "orders" && orderPositions.map(order => (
                    <Marker 
                        key={order.id} 
                        position={[order.lat, order.lng]} 
                        icon={getIcon('order')}
                        eventHandlers={{ click: () => setSelectedItem(order) }}
                    />
                ))}
            </MapContainer>
        </div>
      </div>
    </MainLayout>
  );
}
