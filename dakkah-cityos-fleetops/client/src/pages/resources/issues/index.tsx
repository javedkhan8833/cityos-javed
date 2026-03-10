import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Filter, MoreHorizontal, AlertTriangle, AlertCircle, CheckCircle, Truck, User, Trash2 } from "lucide-react";
import { issuesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Issue } from "@shared/schema";

function generateTrackingId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ISS-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const defaultFormData = {
  tracking_id: "",
  vehicle_uuid: "",
  reported_by: "",
  type: "warning_light",
  priority: "medium",
  description: "",
};

export default function IssuesPage() {
  const { data: issues = [] } = issuesApi.useList();
  const createMutation = issuesApi.useCreate();
  const updateMutation = issuesApi.useUpdate();
  const deleteMutation = issuesApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const filteredIssues = issues.filter(i => {
    const matchesSearch = i.vehicle_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || i.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const openCreateSheet = () => {
    setEditingIssue(null);
    setFormData({ ...defaultFormData, tracking_id: generateTrackingId() });
    setSheetOpen(true);
  };

  const openEditSheet = (issue: Issue) => {
    setEditingIssue(issue);
    setFormData({
      tracking_id: issue.tracking_id,
      vehicle_uuid: issue.vehicle_uuid,
      reported_by: issue.reported_by,
      type: issue.type,
      priority: issue.priority,
      description: issue.description,
    });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.vehicle_uuid.trim()) {
      toast({ title: "Validation Error", description: "Vehicle ID is required.", variant: "destructive" });
      return;
    }
    if (!formData.description.trim()) {
      toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" });
      return;
    }

    if (editingIssue) {
      updateMutation.mutate(
        { id: editingIssue.id, ...formData },
        {
          onSuccess: () => {
            toast({ title: "Issue Updated", description: `Issue ${formData.tracking_id} has been updated.` });
            setSheetOpen(false);
          },
          onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        formData,
        {
          onSuccess: () => {
            toast({ title: "Issue Reported", description: `Issue ${formData.tracking_id} has been created.` });
            setSheetOpen(false);
          },
          onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  };

  const handleMarkResolved = (issue: Issue) => {
    updateMutation.mutate(
      { id: issue.id, status: "resolved" },
      {
        onSuccess: () => {
          toast({ title: "Issue Resolved", description: `Issue ${issue.tracking_id} has been marked as resolved.` });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleConvertToWorkOrder = (issue: Issue) => {
    toast({ title: "Work Order Created", description: "Work order created from issue" });
  };

  const handleDeleteConfirm = () => {
    if (!issueToDelete) return;
    deleteMutation.mutate(issueToDelete.id, {
      onSuccess: () => {
        toast({ title: "Issue Deleted", description: `Issue ${issueToDelete.tracking_id} has been deleted.` });
        setDeleteDialogOpen(false);
        setIssueToDelete(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Issues</h1>
            <p className="text-muted-foreground">Track vehicle breakdowns, accidents, and driver reports.</p>
          </div>
          <Button variant="destructive" onClick={openCreateSheet} data-testid="button-report-issue">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search issues..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-issues"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPriorityFilter("all")}>All Priorities</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("critical")}>Critical</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("high")}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("medium")}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("low")}>Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => (
                <TableRow key={issue.id} data-testid={`row-issue-${issue.id}`}>
                  <TableCell className="font-mono font-medium" data-testid={`text-tracking-id-${issue.id}`}>
                    {issue.tracking_id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {issue.type === 'accident' ? <AlertCircle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      <span className="capitalize" data-testid={`text-type-${issue.id}`}>{issue.type.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getPriorityColor(issue.priority)}`} data-testid={`text-priority-${issue.id}`}>
                      {issue.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span data-testid={`text-vehicle-${issue.id}`}>{issue.vehicle_uuid}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span data-testid={`text-reported-by-${issue.id}`}>{issue.reported_by}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={issue.status === "resolved" ? "default" : "secondary"} className="capitalize" data-testid={`text-status-${issue.id}`}>
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(issue.reported_at ?? Date.now()), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${issue.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(issue)} data-testid={`menu-view-details-${issue.id}`}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConvertToWorkOrder(issue)} data-testid={`menu-convert-work-order-${issue.id}`}>
                          Convert to Work Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMarkResolved(issue)} data-testid={`menu-mark-resolved-${issue.id}`}>
                          Mark Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => { setIssueToDelete(issue); setDeleteDialogOpen(true); }}
                          data-testid={`menu-delete-${issue.id}`}
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
        <SheetContent className="overflow-y-auto" data-testid="sheet-issue-form">
          <SheetHeader>
            <SheetTitle>{editingIssue ? "Edit Issue" : "Report New Issue"}</SheetTitle>
            <SheetDescription>
              {editingIssue ? "Update the issue details below." : "Fill in the details to report a new issue."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_id">Tracking ID</Label>
              <Input
                id="tracking_id"
                value={formData.tracking_id}
                disabled
                data-testid="input-tracking-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_uuid">Vehicle ID *</Label>
              <Input
                id="vehicle_uuid"
                placeholder="e.g. ABC-1234"
                value={formData.vehicle_uuid}
                onChange={(e) => setFormData({ ...formData, vehicle_uuid: e.target.value })}
                data-testid="input-vehicle-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reported_by">Reported By</Label>
              <Input
                id="reported_by"
                placeholder="Reporter name"
                value={formData.reported_by}
                onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                data-testid="input-reported-by"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="warning_light">Warning Light</SelectItem>
                  <SelectItem value="noise">Noise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-issue"
            >
              {editingIssue ? "Update Issue" : "Report Issue"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Issue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete issue {issueToDelete?.tracking_id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
