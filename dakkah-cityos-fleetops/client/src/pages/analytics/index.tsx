import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { reportsApi, ordersApi, driversApi } from "@/lib/api";
import type { Report } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, TrendingUp, Trash2, MoreHorizontal } from "lucide-react";
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
  DropdownMenuTrigger,
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

export default function AnalyticsPage() {
  const { data: reportsList = [], isLoading, error } = reportsApi.useList();
  const { data: orders = [] } = ordersApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const createReport = reportsApi.useCreate();
  const deleteReport = reportsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "operations",
    format: "pdf",
    size: "0 KB",
    status: "ready",
  });

  const filteredReports = reportsList.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const onTimeRate = orders.length > 0 ? ((deliveredOrders / orders.length) * 100).toFixed(1) : "0";
  const activeDrivers = drivers.filter(d => d.status === "active").length;

  const openCreate = () => {
    setFormData({ name: "", category: "operations", format: "pdf", size: "0 KB", status: "ready" });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Report name is required.", variant: "destructive" });
      return;
    }
    createReport.mutate(formData as any, {
      onSuccess: () => { toast({ title: "Generated", description: "Report created." }); setIsSheetOpen(false); },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteReport.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Deleted", description: "Report removed." }); setDeleteId(null); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-analytics-title">Analytics & Reports</h1>
            <p className="text-muted-foreground">Deep dive into your fleet's operational performance.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-generate-report">
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivery Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2" data-testid="text-delivery-rate">
                {onTimeRate}%
                <span className="text-xs text-green-500 font-normal flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> live
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{deliveredOrders} of {orders.length} orders delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-drivers">{activeDrivers}</div>
              <p className="text-xs text-muted-foreground">of {drivers.length} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reports Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-reports-count">{reportsList.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search reports..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-reports"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reports generated yet. Click "Generate Report" to create one.
                  </TableCell>
                </TableRow>
              )}
              {filteredReports.map((report) => (
                <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {report.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{report.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {report.generated_at ? formatDistanceToNow(new Date(report.generated_at), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge className="uppercase font-mono text-xs">{report.format}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{report.size}</TableCell>
                  <TableCell>
                    <Badge variant={report.status === "ready" ? "default" : "secondary"} className="capitalize">
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
                          const headers = ["Name", "Category", "Format", "Size", "Status", "Generated At"];
                          const row = [report.name, report.category, report.format, report.size, report.status, report.generated_at ? new Date(report.generated_at).toISOString() : "N/A"];
                          const csv = [headers.join(","), row.map(escape).join(",")].join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${report.name.replace(/\s+/g, "_")}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast({ title: "Downloaded", description: `${report.name} exported as CSV.` });
                        }}>
                          <Download className="h-4 w-4 mr-2" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(report.id)}>
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
            <SheetTitle>Generate Report</SheetTitle>
            <SheetDescription>Create a new analytics report.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Report Name</Label>
              <Input placeholder="e.g. Monthly Fleet Summary" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-report-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="fleet">Fleet</SelectItem>
                    <SelectItem value="drivers">Drivers</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Format</Label>
                <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createReport.isPending} data-testid="button-save-report">
                {createReport.isPending ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>Remove this report permanently?</AlertDialogDescription>
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
