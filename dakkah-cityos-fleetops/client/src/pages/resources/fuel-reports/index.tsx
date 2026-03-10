import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, Download, Fuel, TrendingUp, TrendingDown, DollarSign, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { fuelReportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function generateTrackingId() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `FUEL-${num}`;
}

export default function FuelReportsPage() {
  const { data: reports = [] } = fuelReportsApi.useList();
  const createMutation = fuelReportsApi.useCreate();
  const deleteMutation = fuelReportsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<typeof reports[0] | null>(null);

  const [formData, setFormData] = useState({
    tracking_id: "",
    vehicle_uuid: "",
    driver_uuid: "",
    volume: "",
    cost: "",
    odometer: "",
    station: "",
    date: new Date().toISOString().slice(0, 16),
  });

  const uniqueVehicles = useMemo(() => {
    const vehicles = new Set(reports.map(r => r.vehicle_uuid));
    return Array.from(vehicles).sort();
  }, [reports]);

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.vehicle_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.driver_uuid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = vehicleFilter === "all" || r.vehicle_uuid === vehicleFilter;
    return matchesSearch && matchesVehicle;
  });

  const totalFuelCost = useMemo(() => {
    return reports.reduce((sum, r) => sum + parseFloat(r.cost || "0"), 0);
  }, [reports]);

  const totalVolume = useMemo(() => {
    return reports.reduce((sum, r) => sum + (r.volume ?? 0), 0);
  }, [reports]);

  const avgConsumption = useMemo(() => {
    if (reports.length === 0) return 0;
    const totalOdometer = reports.reduce((sum, r) => sum + (r.odometer ?? 0), 0);
    if (totalOdometer === 0) return 0;
    return (totalVolume / (totalOdometer / 100));
  }, [reports, totalVolume]);

  function openCreateSheet() {
    setFormData({
      tracking_id: generateTrackingId(),
      vehicle_uuid: "",
      driver_uuid: "",
      volume: "",
      cost: "",
      odometer: "",
      station: "",
      date: new Date().toISOString().slice(0, 16),
    });
    setSheetOpen(true);
  }

  function handleCreate() {
    if (!formData.vehicle_uuid.trim()) {
      toast({ title: "Validation Error", description: "Vehicle ID is required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        tracking_id: formData.tracking_id,
        vehicle_uuid: formData.vehicle_uuid,
        driver_uuid: formData.driver_uuid,
        volume: parseFloat(formData.volume) || 0,
        cost: formData.cost || "0",
        odometer: parseInt(formData.odometer) || 0,
        station: formData.station,
        date: new Date(formData.date).toISOString(),
      } as any,
      {
        onSuccess: () => {
          toast({ title: "Fuel Entry Created", description: `Entry ${formData.tracking_id} has been logged.` });
          setSheetOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to create fuel entry.", variant: "destructive" });
        },
      }
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    deleteMutation.mutate(deleteTargetId, {
      onSuccess: () => {
        toast({ title: "Fuel Entry Deleted", description: "The fuel report has been removed." });
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to delete fuel entry.", variant: "destructive" });
      },
    });
  }

  function exportCSV() {
    if (reports.length === 0) {
      toast({ title: "No Data", description: "There are no fuel reports to export.", variant: "destructive" });
      return;
    }
    const headers = ["Tracking ID", "Date", "Vehicle", "Driver", "Volume (L)", "Cost", "Odometer (km)", "Station"];
    const rows = reports.map(r => [
      r.tracking_id,
      format(new Date(r.date ?? Date.now()), "yyyy-MM-dd HH:mm"),
      r.vehicle_uuid,
      r.driver_uuid,
      (r.volume ?? 0).toFixed(1),
      r.cost,
      (r.odometer ?? 0).toString(),
      r.station,
    ]);
    const csv = [headers.join(","), ...rows.map(row => row.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fuel-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: "Fuel reports have been downloaded as CSV." });
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Fuel Reports</h1>
            <p className="text-muted-foreground">Track fuel consumption, costs, and efficiency across your fleet.</p>
          </div>
          <Button data-testid="button-log-fuel-entry" onClick={openCreateSheet}>
            <Plus className="mr-2 h-4 w-4" />
            Log Fuel Entry
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fuel Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-fuel-cost">
                ${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground flex items-center text-red-500">
                <TrendingUp className="h-3 w-3 mr-1" /> +5.4% this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Consumption</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-consumption">
                {avgConsumption > 0 ? `${avgConsumption.toFixed(1)} L/100km` : "—"}
              </div>
              <p className="text-xs text-muted-foreground flex items-center text-green-500">
                <TrendingDown className="h-3 w-3 mr-1" /> -1.2% improved
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-volume">
                {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search by vehicle or driver..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-fuel-reports"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setVehicleFilter("all")}>All Vehicles</DropdownMenuItem>
              {uniqueVehicles.map(v => (
                <DropdownMenuItem key={v} onClick={() => setVehicleFilter(v)}>{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" data-testid="button-export-csv" onClick={exportCSV}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id} data-testid={`row-fuel-report-${report.id}`}>
                  <TableCell className="font-medium text-xs">
                    {format(new Date(report.date ?? Date.now()), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.vehicle_uuid}</Badge>
                  </TableCell>
                  <TableCell>{report.driver_uuid}</TableCell>
                  <TableCell>{(report.volume ?? 0).toFixed(1)} L</TableCell>
                  <TableCell>${report.cost}</TableCell>
                  <TableCell className="font-mono text-xs">{(report.odometer ?? 0).toLocaleString()} km</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{report.station}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${report.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          data-testid={`button-view-${report.id}`}
                          onClick={() => setViewReport(report)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`button-delete-${report.id}`}
                          className="text-red-600"
                          onClick={() => {
                            setDeleteTargetId(report.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent data-testid="sheet-create-fuel-entry">
          <SheetHeader>
            <SheetTitle>Log Fuel Entry</SheetTitle>
            <SheetDescription>Record a new fuel fill-up for a vehicle.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tracking_id">Tracking ID</Label>
              <Input id="tracking_id" value={formData.tracking_id} disabled data-testid="input-tracking-id" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicle_uuid">Vehicle Plate *</Label>
              <Input
                id="vehicle_uuid"
                placeholder="e.g. ABC-1234"
                value={formData.vehicle_uuid}
                onChange={(e) => setFormData(f => ({ ...f, vehicle_uuid: e.target.value }))}
                data-testid="input-vehicle-id"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="driver_uuid">Driver Name</Label>
              <Input
                id="driver_uuid"
                placeholder="e.g. John Doe"
                value={formData.driver_uuid}
                onChange={(e) => setFormData(f => ({ ...f, driver_uuid: e.target.value }))}
                data-testid="input-driver-id"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="volume">Volume (L)</Label>
                <Input
                  id="volume"
                  type="number"
                  placeholder="0"
                  value={formData.volume}
                  onChange={(e) => setFormData(f => ({ ...f, volume: e.target.value }))}
                  data-testid="input-volume"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData(f => ({ ...f, cost: e.target.value }))}
                  data-testid="input-cost"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="odometer">Odometer (km)</Label>
              <Input
                id="odometer"
                type="number"
                placeholder="0"
                value={formData.odometer}
                onChange={(e) => setFormData(f => ({ ...f, odometer: e.target.value }))}
                data-testid="input-odometer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="station">Station</Label>
              <Input
                id="station"
                placeholder="e.g. Shell Main St."
                value={formData.station}
                onChange={(e) => setFormData(f => ({ ...f, station: e.target.value }))}
                data-testid="input-station"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                data-testid="input-date"
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-fuel-entry"
            >
              {createMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
        <SheetContent data-testid="sheet-view-fuel-entry">
          <SheetHeader>
            <SheetTitle>Fuel Report Details</SheetTitle>
            <SheetDescription>{viewReport?.tracking_id}</SheetDescription>
          </SheetHeader>
          {viewReport && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Vehicle</Label>
                  <p className="font-medium" data-testid="text-view-vehicle">{viewReport.vehicle_uuid}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Driver</Label>
                  <p className="font-medium" data-testid="text-view-driver">{viewReport.driver_uuid}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Volume</Label>
                  <p className="font-medium" data-testid="text-view-volume">{(viewReport.volume ?? 0).toFixed(1)} L</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cost</Label>
                  <p className="font-medium" data-testid="text-view-cost">${viewReport.cost}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Odometer</Label>
                  <p className="font-medium" data-testid="text-view-odometer">{(viewReport.odometer ?? 0).toLocaleString()} km</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Station</Label>
                  <p className="font-medium" data-testid="text-view-station">{viewReport.station}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Date</Label>
                <p className="font-medium" data-testid="text-view-date">
                  {format(new Date(viewReport.date ?? Date.now()), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-fuel-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fuel Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fuel report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
