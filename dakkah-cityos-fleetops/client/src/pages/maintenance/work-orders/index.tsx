import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { workOrdersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, MoreHorizontal, Wrench, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import type { WorkOrder } from "@shared/schema";

function generateTrackingId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "WO-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const defaultFormData = {
  tracking_id: "",
  vehicle_uuid: "",
  type: "maintenance",
  priority: "medium",
  status: "pending",
  due_date: "",
  cost: "0",
};

export default function WorkOrdersPage() {
  const { data: workOrders = [] } = workOrdersApi.useList();
  const createMutation = workOrdersApi.useCreate();
  const updateMutation = workOrdersApi.useUpdate();
  const deleteMutation = workOrdersApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch = wo.vehicle_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.tracking_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const openCreateSheet = () => {
    setEditingOrder(null);
    setFormData({ ...defaultFormData, tracking_id: generateTrackingId() });
    setSheetOpen(true);
  };

  const openEditSheet = (wo: WorkOrder) => {
    setEditingOrder(wo);
    setFormData({
      tracking_id: wo.tracking_id,
      vehicle_uuid: wo.vehicle_uuid,
      type: wo.type,
      priority: wo.priority,
      status: wo.status,
      due_date: wo.due_date ? format(new Date(wo.due_date), "yyyy-MM-dd") : "",
      cost: wo.cost,
    });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.vehicle_uuid.trim()) {
      toast({ title: "Validation Error", description: "Vehicle ID is required.", variant: "destructive" });
      return;
    }
    if (!formData.tracking_id.trim()) {
      toast({ title: "Validation Error", description: "Tracking ID is required.", variant: "destructive" });
      return;
    }

    const payload: any = {
      tracking_id: formData.tracking_id,
      vehicle_uuid: formData.vehicle_uuid,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      cost: formData.cost || "0",
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    };

    if (editingOrder) {
      updateMutation.mutate(
        { id: editingOrder.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Work Order Updated", description: `${formData.tracking_id} has been updated.` });
            setSheetOpen(false);
          },
          onError: (err: any) => {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Work Order Created", description: `${formData.tracking_id} has been created.` });
          setSheetOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleUpdateStatus = (wo: WorkOrder) => {
    const statusCycle: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    const newStatus = statusCycle[wo.status] || "pending";
    updateMutation.mutate(
      { id: wo.id, status: newStatus } as any,
      {
        onSuccess: () => {
          toast({
            title: "Status Updated",
            description: `${wo.tracking_id} status changed to ${newStatus.replace("_", " ")}.`,
          });
        },
        onError: (err: any) => {
          toast({ title: "Status Update Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const openDeleteDialog = (wo: WorkOrder) => {
    setOrderToDelete(wo);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    deleteMutation.mutate(orderToDelete.id, {
      onSuccess: () => {
        toast({ title: "Work Order Deleted", description: `${orderToDelete.tracking_id} has been deleted.` });
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
      },
      onError: (err: any) => {
        toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const exportCSV = () => {
    const headers = ["Tracking ID", "Vehicle", "Type", "Priority", "Status", "Due Date", "Cost"];
    const rows = filteredOrders.map((wo) => [
      wo.tracking_id,
      wo.vehicle_uuid,
      wo.type,
      wo.priority,
      wo.status,
      wo.due_date ? format(new Date(wo.due_date), "yyyy-MM-dd") : "",
      wo.cost,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "work-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredOrders.length} work orders to CSV.` });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Work Orders</h1>
            <p className="text-muted-foreground">Track vehicle maintenance and repairs.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} data-testid="button-export-csv">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={openCreateSheet} data-testid="button-create-work-order">
              <Plus className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search work orders..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-work-orders"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((wo) => (
                <TableRow key={wo.id} data-testid={`row-work-order-${wo.id}`}>
                  <TableCell className="font-mono font-medium" data-testid={`text-tracking-id-${wo.id}`}>
                    {wo.tracking_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`text-vehicle-id-${wo.id}`}>
                      {wo.vehicle_uuid}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 capitalize" data-testid={`text-type-${wo.id}`}>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      {wo.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getPriorityColor(wo.priority) as any}
                      className="capitalize"
                      data-testid={`text-priority-${wo.id}`}
                    >
                      {wo.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-due-date-${wo.id}`}>
                      <Calendar className="h-4 w-4" />
                      {wo.due_date ? format(new Date(wo.due_date), "MMM d, yyyy") : "No date"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={wo.status === "completed" ? "default" : "secondary"}
                      className="capitalize"
                      data-testid={`text-status-${wo.id}`}
                    >
                      {wo.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${wo.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditSheet(wo)}
                          data-testid={`button-edit-${wo.id}`}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(wo)}
                          data-testid={`button-update-status-${wo.id}`}
                        >
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteDialog(wo)}
                          data-testid={`button-delete-${wo.id}`}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent data-testid="sheet-work-order-form">
          <SheetHeader>
            <SheetTitle>{editingOrder ? "Edit Work Order" : "Create Work Order"}</SheetTitle>
            <SheetDescription>
              {editingOrder ? "Update the work order details below." : "Fill in the details to create a new work order."}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tracking_id">Tracking ID</Label>
              <Input
                id="tracking_id"
                value={formData.tracking_id}
                onChange={(e) => setFormData({ ...formData, tracking_id: e.target.value })}
                readOnly={!!editingOrder}
                data-testid="input-tracking-id"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicle_uuid">Vehicle Plate</Label>
              <Input
                id="vehicle_uuid"
                value={formData.vehicle_uuid}
                onChange={(e) => setFormData({ ...formData, vehicle_uuid: e.target.value })}
                placeholder="e.g. ABC-1234"
                data-testid="input-vehicle-id"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                data-testid="input-due-date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0"
                data-testid="input-cost"
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-work-order"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingOrder
                ? "Update Work Order"
                : "Create Work Order"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-confirmation">
          <DialogHeader>
            <DialogTitle>Delete Work Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete work order {orderToDelete?.tracking_id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
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
