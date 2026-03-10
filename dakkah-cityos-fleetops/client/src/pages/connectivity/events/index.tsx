import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { eventsApi } from "@/lib/api";
import type { Event } from "@shared/schema";
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
import { Plus, Bell, Info, AlertTriangle, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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

export default function EventsPage() {
  const { data: eventsList = [], isLoading, error } = eventsApi.useList();
  const createEvent = eventsApi.useCreate();
  const deleteEvent = eventsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "system",
    severity: "info",
    message: "",
    source: "System",
  });

  const filteredEvents = eventsList.filter(e => 
    e.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (severity: string) => {
      switch(severity) {
          case 'info': return <Info className="h-4 w-4 text-blue-500" />;
          case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
          case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
          case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
          default: return <Bell className="h-4 w-4" />;
      }
  };

  const openCreate = () => {
    setFormData({ type: "system", severity: "info", message: "", source: "System" });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.message.trim()) {
      toast({ title: "Error", description: "Event message is required.", variant: "destructive" });
      return;
    }
    createEvent.mutate(formData as any, {
      onSuccess: () => { toast({ title: "Logged", description: "Event logged successfully." }); setIsSheetOpen(false); },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteEvent.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Deleted", description: "Event removed from log." }); setDeleteId(null); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-events-title">Event Log</h1>
            <p className="text-muted-foreground">Audit trail of all system and operational events.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-log-event">
            <Plus className="mr-2 h-4 w-4" />
            Log Event
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

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search log..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-events"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No events logged yet.
                  </TableCell>
                </TableRow>
              )}
              {filteredEvents.map((event) => (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {getIcon(event.severity)}
                        <span className="capitalize text-sm">{event.severity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.source}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{event.message}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(event.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <SheetTitle>Log Event</SheetTitle>
            <SheetDescription>Manually log a system or operational event.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="device">Device</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Input placeholder="e.g. Auth Service" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} data-testid="input-event-source" />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea placeholder="Describe the event..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} data-testid="input-event-message" />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createEvent.isPending} data-testid="button-save-event">
                {createEvent.isPending ? "Logging..." : "Log Event"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Remove this event from the log permanently?</AlertDialogDescription>
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
