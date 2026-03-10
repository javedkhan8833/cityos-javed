import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ordersApi, driversApi } from "@/lib/api";
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
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignatureCanvas from 'react-signature-canvas';
import { 
  Plus, 
  Filter, 
  Download, 
  MoreHorizontal, 
  MapPin, 
  User, 
  Calendar,
  CreditCard,
  Package,
  Upload,
  LayoutGrid,
  List as ListIcon,
  Map as MapIcon,
  Printer,
  QrCode,
  Camera,
  PenTool,
  X,
  Check,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet Icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function OrdersPage() {
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [signatureRef, setSignatureRef] = useState<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: orders = [] } = ordersApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const updateOrder = ordersApi.useUpdate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board" | "map">("list");

  const handleAssignDriver = () => {
    if (!assignOrderId || !selectedDriverId) return;
    updateOrder.mutate({ id: assignOrderId, driver_assigned_uuid: selectedDriverId, status: "assigned" } as any, {
      onSuccess: () => {
        toast({ title: "Driver Assigned", description: "Order has been assigned to the driver." });
        setIsAssignOpen(false);
        setAssignOrderId(null);
        setSelectedDriverId("");
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleCancelOrder = () => {
    if (!cancelOrderId) return;
    updateOrder.mutate({ id: cancelOrderId, status: "cancelled" } as any, {
      onSuccess: () => {
        toast({ title: "Order Cancelled", description: "The order has been cancelled." });
        setIsCancelOpen(false);
        setCancelOrderId(null);
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleExportOrders = () => {
    const csv = [
      ["tracking_number", "customer_uuid", "status", "total_amount", "currency", "created_at"].join(","),
      ...orders.map(o => [o.tracking_number, o.customer_uuid ?? "", o.status, o.total_amount ?? "0", o.currency, o.created_at ?? ""].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Orders exported as CSV." });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (order.customer_uuid || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "outline";
      case "assigned": return "secondary";
      case "in_transit": return "default"; // blue/primary
      case "delivered": return "success"; // we'll use a custom class for green
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getStatusBadgeClass = (status: string) => {
     switch (status) {
      case "delivered": return "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
      case "in_transit": return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      case "assigned": return "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200";
      case "cancelled": return "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
      default: return "";
    }
  }

  // Group orders for Kanban
  const columns = {
    pending: filteredOrders.filter(o => o.status === "pending"),
    assigned: filteredOrders.filter(o => o.status === "assigned"),
    in_transit: filteredOrders.filter(o => o.status === "in_transit"),
    delivered: filteredOrders.filter(o => o.status === "delivered"),
  };

  return (
    <MainLayout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Manage deliveries and dispatch assignments.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted p-1 rounded-lg border">
                <Button 
                    variant={viewMode === "list" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => setViewMode("list")}
                >
                    <ListIcon className="h-4 w-4 mr-2" /> List
                </Button>
                <Button 
                    variant={viewMode === "board" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => setViewMode("board")}
                >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Board
                </Button>
                <Button 
                    variant={viewMode === "map" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => setViewMode("map")}
                >
                    <MapIcon className="h-4 w-4 mr-2" /> Map
                </Button>
            </div>
            <Button asChild>
                <a href="/operations/orders/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Order
                </a>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Search orders..." 
              className="w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("assigned")}>Assigned</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_transit")}>In Transit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("delivered")}>Delivered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
                <a href="/operations/orders/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                </a>
            </Button>
            <Button variant="outline" onClick={handleExportOrders} data-testid="button-export-orders">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
          </div>
        </div>

        {/* Views */}
        <div className="flex-1 min-h-0">
            {viewMode === "list" && (
                <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium font-mono">
                            <Button variant="link" className="p-0 h-auto font-mono" onClick={() => setSelectedOrder(order)}>
                                {order.tracking_number}
                            </Button>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {order.customer_uuid || "—"}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`capitalize border-0 ${getStatusBadgeClass(order.status)}`}>
                            {order.status.replace("_", " ")}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {order.created_at ? format(new Date(order.created_at), "MMM d, HH:mm") : "—"}
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            ${order.total_amount ?? "0"}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setAssignOrderId(order.id); setIsAssignOpen(true); }}>Assign Driver</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>Track Order</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { setCancelOrderId(order.id); setIsCancelOpen(true); }}>Cancel Order</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            )}

            {viewMode === "board" && (
                <div className="h-full overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-[1000px]">
                        {Object.entries(columns).map(([columnId, columnOrders]) => (
                            <div key={columnId} className="flex-1 min-w-[300px] flex flex-col bg-muted/30 rounded-lg border h-full">
                                <div className="p-3 border-b bg-muted/50 font-medium capitalize flex items-center justify-between sticky top-0 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            columnId === 'pending' ? 'bg-yellow-500' :
                                            columnId === 'assigned' ? 'bg-purple-500' :
                                            columnId === 'in_transit' ? 'bg-blue-500' :
                                            'bg-green-500'
                                        }`} />
                                        {columnId.replace("_", " ")}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">{columnOrders.length}</Badge>
                                </div>
                                <ScrollArea className="flex-1 p-3">
                                    <div className="space-y-3">
                                        {columnOrders.map(order => (
                                            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
                                                <CardContent className="p-3 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-mono text-xs text-muted-foreground">{order.tracking_number}</span>
                                                        <span className="font-semibold text-sm">${order.total_amount ?? "0"}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm truncate">{order.customer_uuid || "—"}</div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                                                        <div className="text-xs text-muted-foreground">
                                                            {order.created_at ? format(new Date(order.created_at), "MMM d") : "—"}
                                                        </div>
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[10px]">DR</AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === "map" && (
                <div className="h-full w-full rounded-md border overflow-hidden relative">
                     <MapContainer 
                        center={[24.7136, 46.6753]} 
                        zoom={11} 
                        zoomControl={false}
                        className="h-full w-full z-0"
                    >
                        <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                        />
                        {filteredOrders.map((order, idx) => (
                            <Marker 
                                key={order.id} 
                                position={[24.7136 + (idx * 0.008 - filteredOrders.length * 0.004), 46.6753 + (idx * 0.012 - filteredOrders.length * 0.006)]}
                            >
                                <Popup>
                                    <div className="font-medium">{order.tracking_number}</div>
                                    <div className="text-sm">{order.customer_uuid || "—"}</div>
                                    <Badge variant="outline" className={`mt-2 ${getStatusBadgeClass(order.status)}`}>
                                        {order.status.replace("_", " ")}
                                    </Badge>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur p-2 rounded-md shadow border text-xs space-y-1">
                        <div className="font-medium mb-1">Status Legend</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"/> Pending</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"/> Assigned</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> In Transit</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/> Delivered</div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>Select a driver to assign to this order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger data-testid="select-assign-driver">
                  <SelectValue placeholder="Select a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === "online" || d.status === "active").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.status})</SelectItem>
                  ))}
                  {drivers.filter(d => d.status !== "online" && d.status !== "active").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignDriver} disabled={!selectedDriverId || updateOrder.isPending} data-testid="button-confirm-assign">
              {updateOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this order? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Keep Order</Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={updateOrder.isPending} data-testid="button-confirm-cancel">
              {updateOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-xl">
            {selectedOrder && (
                <>
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            Order {selectedOrder.tracking_number}
                        </SheetTitle>
                        <SheetDescription>
                            Created on {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), "PPP p") : "—"}
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="mt-8 space-y-6">
                        {/* Status Section */}
                        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge variant="outline" className={`text-base capitalize px-3 py-1 border-0 ${getStatusBadgeClass(selectedOrder.status)}`}>
                                    {selectedOrder.status.replace("_", " ")}
                                </Badge>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                                <p className="text-xl font-bold">${selectedOrder.total_amount ?? "0"}</p>
                            </div>
                        </div>

                        {/* Customer & Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4" /> Customer
                                </h3>
                                <div className="text-sm space-y-1">
                                    <p className="font-medium">{selectedOrder.customer_uuid || "—"}</p>
                                    <p className="text-muted-foreground">+1 (555) 000-0000</p>
                                    <p className="text-muted-foreground">customer@example.com</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Destination
                                </h3>
                                <div className="text-sm space-y-1">
                                    <p className="font-medium">Delivery Address</p>
                                    <p className="text-muted-foreground">{selectedOrder.notes || "—"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline / Activity */}
                         <div className="space-y-4 pt-4 border-t">
                             <h3 className="font-semibold">Activity Timeline</h3>
                             <div className="space-y-4 ml-2 border-l-2 border-muted pl-4">
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary" />
                                    <p className="text-sm font-medium">Order Created</p>
                                    <p className="text-xs text-muted-foreground">{selectedOrder.created_at ? format(new Date(selectedOrder.created_at), "p") : "—"}</p>
                                </div>
                                {selectedOrder.status !== 'pending' && (
                                     <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted-foreground" />
                                        <p className="text-sm font-medium">Assigned to Driver</p>
                                        <p className="text-xs text-muted-foreground">Pending assignment...</p>
                                    </div>
                                )}
                             </div>
                         </div>
                         <div className="space-y-4 pt-4 border-t">
                             <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Proof of Delivery</h3>
                                <Badge variant="outline" className="text-xs">Required</Badge>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
                                     <DialogTrigger asChild>
                                        <div className="border rounded-md p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors min-h-[100px]">
                                            <PenTool className="h-6 w-6" />
                                            <span className="text-xs">Capture Signature</span>
                                        </div>
                                     </DialogTrigger>
                                     <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Customer Signature</DialogTitle>
                                            <DialogDescription>Ask the customer to sign below to confirm receipt.</DialogDescription>
                                        </DialogHeader>
                                        <div className="border rounded-md bg-gray-50 h-[200px] relative overflow-hidden">
                                            <SignatureCanvas 
                                                penColor="black"
                                                canvasProps={{className: 'w-full h-full'}}
                                                ref={(ref: any) => setSignatureRef(ref)}
                                            />
                                            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground pointer-events-none">
                                                Sign above
                                            </div>
                                        </div>
                                        <DialogFooter className="flex justify-between sm:justify-between w-full">
                                            <Button variant="ghost" size="sm" onClick={() => signatureRef?.clear()}>
                                                <RefreshCw className="h-3 w-3 mr-2" /> Clear
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button variant="outline" onClick={() => setIsSignatureOpen(false)}>Cancel</Button>
                                                <Button onClick={() => setIsSignatureOpen(false)}>Save Signature</Button>
                                            </div>
                                        </DialogFooter>
                                     </DialogContent>
                                 </Dialog>

                                 <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                                     <DialogTrigger asChild>
                                        <div className="border rounded-md p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors min-h-[100px]">
                                            <Camera className="h-6 w-6" />
                                            <span className="text-xs">Take Photo</span>
                                        </div>
                                     </DialogTrigger>
                                     <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Proof of Delivery Photo</DialogTitle>
                                            <DialogDescription>Capture a photo of the delivered package.</DialogDescription>
                                        </DialogHeader>
                                        <div className="bg-black rounded-md h-[300px] flex items-center justify-center relative overflow-hidden group">
                                            {capturedPhoto ? (
                                                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-white/50 flex flex-col items-center gap-2">
                                                    <Camera className="h-12 w-12 opacity-50" />
                                                    <span className="text-sm">Camera Preview</span>
                                                </div>
                                            )}
                                            
                                            {!capturedPhoto && (
                                                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                                    <Button 
                                                        size="icon" 
                                                        className="h-12 w-12 rounded-full border-4 border-white/30 bg-white hover:bg-white/90"
                                                        onClick={() => setCapturedPhoto("https://images.unsplash.com/photo-1566576912902-192f85723363?auto=format&fit=crop&q=80&w=1000")}
                                                    >
                                                        <div className="h-10 w-10 rounded-full border-2 border-black" />
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {capturedPhoto && (
                                                <div className="absolute top-2 right-2">
                                                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => setCapturedPhoto(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                                            <Button disabled={!capturedPhoto} onClick={() => setIsCameraOpen(false)}>Use Photo</Button>
                                        </DialogFooter>
                                     </DialogContent>
                                 </Dialog>
                             </div>
                         </div>
                         
                         {/* Actions */}
                         <div className="flex gap-3 pt-4">
                             <Button className="flex-1" data-testid="button-dispatch-order" onClick={() => {
                               if (selectedOrder) {
                                 updateOrder.mutate({ id: selectedOrder.id, status: "in_transit" } as any, {
                                   onSuccess: () => {
                                     toast({ title: "Order Dispatched", description: `Order ${selectedOrder.tracking_number} has been dispatched.` });
                                     setSelectedOrder(null);
                                   },
                                   onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                                 });
                               }
                             }}>Dispatch Order</Button>
                             <Button variant="outline" className="gap-2" data-testid="button-print-labels" onClick={() => {
                               toast({ title: "Printing Labels", description: `Generating shipping labels for ${selectedOrder?.tracking_number}.` });
                             }}>
                                <Printer className="h-4 w-4" /> Labels
                             </Button>
                             <Button variant="outline" size="icon" data-testid="button-qr-code" onClick={() => {
                               toast({ title: "QR Code", description: `QR code generated for ${selectedOrder?.tracking_number}.` });
                             }}>
                                <QrCode className="h-4 w-4" />
                             </Button>
                         </div>
                    </div>
                </>
            )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
