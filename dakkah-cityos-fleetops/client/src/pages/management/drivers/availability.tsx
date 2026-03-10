import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { timeOffRequestsApi, driversApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { TimeOffRequest } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Calendar, Check, X, Clock, Plus, MoreHorizontal, Trash2, Loader2 } from "lucide-react";

export default function AvailabilityPage() {
  const { toast } = useToast();
  const { data: requests = [], isLoading, error } = timeOffRequestsApi.useList();
  const { data: drivers = [] } = driversApi.useList();
  const createMutation = timeOffRequestsApi.useCreate();
  const updateMutation = timeOffRequestsApi.useUpdate();
  const deleteMutation = timeOffRequestsApi.useDelete();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    driver_uuid: "",
    driver_name: "",
    type: "vacation",
    start_date: "",
    end_date: "",
    reason: "",
  });

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  }

  function handleDriverSelect(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    setNewRequest((prev) => ({
      ...prev,
      driver_uuid: driverId,
      driver_name: driver?.name || "",
    }));
  }

  function handleCreateRequest() {
    if (!newRequest.driver_uuid || !newRequest.start_date || !newRequest.end_date) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        driver_uuid: newRequest.driver_uuid,
        driver_name: newRequest.driver_name,
        type: newRequest.type,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        reason: newRequest.reason,
        status: "pending",
      },
      {
        onSuccess: () => {
          toast({ title: "Request created", description: "Time-off request has been submitted." });
          setDialogOpen(false);
          setNewRequest({ driver_uuid: "", driver_name: "", type: "vacation", start_date: "", end_date: "", reason: "" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  function handleApprove(request: TimeOffRequest) {
    updateMutation.mutate(
      { id: request.id, status: "approved" },
      {
        onSuccess: () => toast({ title: "Approved", description: `Request for ${request.driver_name} has been approved.` }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleReject(request: TimeOffRequest) {
    updateMutation.mutate(
      { id: request.id, status: "rejected" },
      {
        onSuccess: () => toast({ title: "Rejected", description: `Request for ${request.driver_name} has been rejected.` }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete(request: TimeOffRequest) {
    deleteMutation.mutate(request.id, {
      onSuccess: () => toast({ title: "Deleted", description: "Time-off request has been deleted." }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64" data-testid="loading-state">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-destructive" data-testid="error-state">
          Failed to load time-off requests.
        </div>
      </MainLayout>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Driver Availability</h1>
            <p className="text-muted-foreground">Manage shift schedules and time-off requests.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-request">
                <Plus className="h-4 w-4 mr-2" />
                Add Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Time-Off Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Driver</Label>
                  <Select value={newRequest.driver_uuid} onValueChange={handleDriverSelect} data-testid="select-driver">
                    <SelectTrigger data-testid="select-driver-trigger">
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id} data-testid={`select-driver-${driver.id}`}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newRequest.type} onValueChange={(v) => setNewRequest((p) => ({ ...p, type: v }))} data-testid="select-type">
                    <SelectTrigger data-testid="select-type-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest((p) => ({ ...p, start_date: e.target.value }))}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest((p) => ({ ...p, end_date: e.target.value }))}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Optional reason for the request"
                    data-testid="input-reason"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-request">
                  Cancel
                </Button>
                <Button onClick={handleCreateRequest} disabled={createMutation.isPending} data-testid="button-submit-request">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-pending">No pending requests.</p>
                )}
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between border p-3 rounded-lg" data-testid={`card-pending-${request.id}`}>
                    <div>
                      <div className="font-medium">{request.driver_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </div>
                      <Badge variant="outline" className="mt-1 capitalize text-xs">{request.type}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(request)}
                        disabled={updateMutation.isPending}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(request)}
                        disabled={updateMutation.isPending}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    08
                  </div>
                  <div>
                    <div className="font-medium">Morning Shift</div>
                    <div className="text-sm text-muted-foreground">08:00 AM - 04:00 PM • 12 Drivers</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                    16
                  </div>
                  <div>
                    <div className="font-medium">Evening Shift</div>
                    <div className="text-sm text-muted-foreground">04:00 PM - 12:00 AM • 8 Drivers</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8" data-testid="text-no-requests">
                    No time-off requests found.
                  </TableCell>
                </TableRow>
              )}
              {requests.map((request) => (
                <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                  <TableCell className="font-medium">{request.driver_name}</TableCell>
                  <TableCell className="capitalize">{request.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                    {request.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={request.status === "approved" ? "default" : request.status === "pending" ? "secondary" : "outline"}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${request.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {request.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(request)} data-testid={`menu-approve-${request.id}`}>
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReject(request)} data-testid={`menu-reject-${request.id}`}>
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(request)}
                          className="text-destructive"
                          data-testid={`menu-delete-${request.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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
    </MainLayout>
  );
}
