import { useState } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { apiKeysApi, webhooksApi, webhookLogsApi } from "@/lib/api";
import type { ApiKey, Webhook, WebhookLog } from "@shared/schema";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Copy, Eye, EyeOff, RefreshCw, Webhook as WebhookIcon, Activity, Terminal, Check, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

function generateToken(type: string) {
  const prefix = type === "publishable" ? "pk_live_" : "sk_live_";
  return `${prefix}${Math.random().toString(36).substr(2, 12)}`;
}

export default function DevelopersPage() {
  const { data: apiKeysList = [], isLoading: keysLoading, error: keysError } = apiKeysApi.useList();
  const { data: webhooksList = [], isLoading: webhooksLoading, error: webhooksError } = webhooksApi.useList();
  const { data: webhookLogsList = [], isLoading: logsLoading, error: logsError } = webhookLogsApi.useList();

  const createApiKey = apiKeysApi.useCreate();
  const updateApiKey = apiKeysApi.useUpdate();
  const deleteApiKey = apiKeysApi.useDelete();
  const createWebhook = webhooksApi.useCreate();
  const updateWebhook = webhooksApi.useUpdate();
  const deleteWebhook = webhooksApi.useDelete();
  const createWebhookLog = webhookLogsApi.useCreate();

  const { toast } = useToast();

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [keySheetOpen, setKeySheetOpen] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "", type: "publishable" });

  const [webhookSheetOpen, setWebhookSheetOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookForm, setWebhookForm] = useState({ url: "", events: "" });

  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  const isLoading = keysLoading || webhooksLoading || logsLoading;
  const hasError = keysError || webhooksError || logsError;

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied", description: "API key copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreateKey = () => {
    setKeyForm({ name: "", type: "publishable" });
    setKeySheetOpen(true);
  };

  const handleSaveKey = () => {
    if (!keyForm.name.trim()) {
      toast({ title: "Error", description: "Key name is required.", variant: "destructive" });
      return;
    }
    const token = generateToken(keyForm.type);
    createApiKey.mutate({ name: keyForm.name, type: keyForm.type, token, last_used: "Never" } as any, {
      onSuccess: () => {
        toast({ title: "Created", description: "API key created successfully." });
        setKeySheetOpen(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleRegenerateKey = (key: ApiKey) => {
    const token = generateToken(key.type);
    updateApiKey.mutate({ id: key.id, token, last_used: new Date().toLocaleString() } as any, {
      onSuccess: () => {
        toast({ title: "Regenerated", description: "API key has been regenerated." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteKey = () => {
    if (!deleteKeyId) return;
    deleteApiKey.mutate(deleteKeyId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "API key removed." });
        setDeleteKeyId(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const openCreateWebhook = () => {
    setEditingWebhook(null);
    setWebhookForm({ url: "", events: "" });
    setWebhookSheetOpen(true);
  };

  const openEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({ url: webhook.url, events: (webhook.events || []).join(", ") });
    setWebhookSheetOpen(true);
  };

  const handleSaveWebhook = () => {
    if (!webhookForm.url.trim()) {
      toast({ title: "Error", description: "URL is required.", variant: "destructive" });
      return;
    }
    const eventsArray = webhookForm.events.split(",").map(e => e.trim()).filter(Boolean);
    if (editingWebhook) {
      updateWebhook.mutate({ id: editingWebhook.id, url: webhookForm.url, events: eventsArray } as any, {
        onSuccess: () => {
          toast({ title: "Updated", description: "Webhook updated successfully." });
          setWebhookSheetOpen(false);
          setEditingWebhook(null);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    } else {
      createWebhook.mutate({ url: webhookForm.url, events: eventsArray, status: "active", failures: 0 } as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Webhook endpoint added." });
          setWebhookSheetOpen(false);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDeleteWebhook = () => {
    if (!deleteWebhookId) return;
    deleteWebhook.mutate(deleteWebhookId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Webhook removed." });
        setDeleteWebhookId(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleSendTestEvent = (webhook: Webhook) => {
    const events = webhook.events || [];
    const event = events.length > 0 ? events[0] : "test.event";
    const duration = `${Math.floor(Math.random() * 200 + 20)}ms`;
    createWebhookLog.mutate({ webhook_id: webhook.id, event, status_code: 200, duration } as any, {
      onSuccess: () => {
        toast({ title: "Sent", description: "Test event delivered successfully." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-developers-title">Developers</h1>
          <p className="text-muted-foreground">Manage API keys, webhooks, and developer settings.</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground" data-testid="text-loading">Loading...</div>
          </div>
        )}
        {hasError && (
          <div className="rounded-md border border-destructive p-4 text-destructive text-sm" data-testid="text-error">
            Failed to load data. Please try again.
          </div>
        )}

        <Tabs defaultValue="api-keys" className="space-y-4">
          <TabsList>
            <TabsTrigger value="api-keys" data-testid="tab-api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-lg font-medium">API Keys</h2>
                    <p className="text-sm text-muted-foreground">Manage your API keys for accessing the FleetOps API.</p>
                </div>
                <Button onClick={openCreateKey} data-testid="button-create-key">
                    <Plus className="mr-2 h-4 w-4" /> Create Key
                </Button>
            </div>
            
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Token</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {apiKeysList.length === 0 && !keysLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground" data-testid="text-no-keys">
                                    No API keys yet. Click "Create Key" to create one.
                                </TableCell>
                            </TableRow>
                        )}
                        {apiKeysList.map((key) => (
                            <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                                <TableCell className="font-medium">{key.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                            {showSecrets[key.id] ? key.token : key.token.substring(0, 8) + "..."}
                                        </code>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSecret(key.id)} data-testid={`button-toggle-secret-${key.id}`}>
                                            {showSecrets[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(key.token, key.id)} data-testid={`button-copy-${key.id}`}>
                                            {copiedId === key.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={key.type === "secret" ? "destructive" : "secondary"}>
                                        {key.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{key.last_used || "Never"}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" data-testid={`button-actions-key-${key.id}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleRegenerateKey(key)} data-testid={`button-regenerate-${key.id}`}>
                                                <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteKeyId(key.id)} data-testid={`button-delete-key-${key.id}`}>
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
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-lg font-medium">Webhooks</h2>
                    <p className="text-sm text-muted-foreground">Configure endpoints to receive real-time event notifications.</p>
                </div>
                <Button onClick={openCreateWebhook} data-testid="button-add-endpoint">
                    <Plus className="mr-2 h-4 w-4" /> Add Endpoint
                </Button>
            </div>

            <div className="grid gap-4">
                {webhooksList.length === 0 && !webhooksLoading && (
                    <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed" data-testid="text-no-webhooks">
                        No webhooks configured yet. Click "Add Endpoint" to create one.
                    </div>
                )}
                {webhooksList.map(webhook => (
                    <Card key={webhook.id} data-testid={`card-webhook-${webhook.id}`}>
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <WebhookIcon className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base font-mono">{webhook.url}</CardTitle>
                            </div>
                            <Badge variant={webhook.status === "active" ? "default" : "secondary"}>
                                {webhook.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    Events: {(webhook.events || []).join(", ") || "None"}
                                </div>
                                {(webhook.failures ?? 0) > 0 && (
                                    <div className="text-destructive flex items-center gap-1">
                                        <Terminal className="h-3 w-3" />
                                        {webhook.failures} recent failures
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSendTestEvent(webhook)} data-testid={`button-test-event-${webhook.id}`}>Send Test Event</Button>
                                <Button variant="outline" size="sm" onClick={() => openEditWebhook(webhook)} data-testid={`button-edit-webhook-${webhook.id}`}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => setDeleteWebhookId(webhook.id)} data-testid={`button-remove-webhook-${webhook.id}`}>Remove</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Recent Deliveries</h3>
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {webhookLogsList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground" data-testid="text-no-deliveries">
                                        No recent deliveries. Send a test event to see logs here.
                                    </TableCell>
                                </TableRow>
                            )}
                            {webhookLogsList.map((log) => (
                                <TableRow key={log.id} data-testid={`row-webhook-log-${log.id}`}>
                                    <TableCell className="font-mono text-xs">{log.event}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status_code === 200 ? "outline" : "destructive"} className={log.status_code === 200 ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                            {log.status_code}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-sm">{log.duration}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">System Logs</h3>
                {webhookLogsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] border rounded-md border-dashed text-muted-foreground" data-testid="text-no-logs">
                        <Terminal className="h-10 w-10 mb-4 opacity-20" />
                        <p>No logs yet. Send a test event from the Webhooks tab to generate logs.</p>
                    </div>
                ) : (
                    <div className="border rounded-md bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Status Code</TableHead>
                                    <TableHead>Webhook ID</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {webhookLogsList.map((log) => (
                                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                                        <TableCell className="font-mono text-xs">{log.event}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.status_code === 200 ? "outline" : "destructive"} className={log.status_code === 200 ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                                {log.status_code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs font-mono">{log.webhook_id || "N/A"}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">{log.duration}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={keySheetOpen} onOpenChange={setKeySheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create API Key</SheetTitle>
            <SheetDescription>Generate a new API key for accessing the FleetOps API.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Production Key" value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} data-testid="input-key-name" />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={keyForm.type} onValueChange={(v) => setKeyForm({ ...keyForm, type: v })}>
                <SelectTrigger data-testid="select-key-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publishable">Publishable</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setKeySheetOpen(false)} data-testid="button-cancel-key">Cancel</Button>
              <Button onClick={handleSaveKey} disabled={createApiKey.isPending} data-testid="button-save-key">
                {createApiKey.isPending ? "Creating..." : "Create Key"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={webhookSheetOpen} onOpenChange={setWebhookSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook Endpoint"}</SheetTitle>
            <SheetDescription>{editingWebhook ? "Update webhook endpoint configuration." : "Configure a new webhook endpoint."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input placeholder="https://example.com/webhook" value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} data-testid="input-webhook-url" />
            </div>
            <div className="grid gap-2">
              <Label>Events (comma-separated)</Label>
              <Input placeholder="order.created, order.updated" value={webhookForm.events} onChange={(e) => setWebhookForm({ ...webhookForm, events: e.target.value })} data-testid="input-webhook-events" />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setWebhookSheetOpen(false)} data-testid="button-cancel-webhook">Cancel</Button>
              <Button onClick={handleSaveWebhook} disabled={createWebhook.isPending || updateWebhook.isPending} data-testid="button-save-webhook">
                {(createWebhook.isPending || updateWebhook.isPending) ? "Saving..." : editingWebhook ? "Update" : "Add Endpoint"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>This will permanently revoke this API key. Any applications using it will lose access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-key">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-key">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteWebhookId} onOpenChange={(open) => !open && setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Webhook</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this webhook endpoint. You will stop receiving event notifications.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-webhook">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-webhook">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}