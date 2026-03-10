import ReactFlow, { 
    Background, 
    Controls, 
    MiniMap,
    ReactFlowProvider,
    useNodesState,
    useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useState, useCallback } from "react";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Settings, Loader2, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { orderConfigsApi } from "@/lib/api";
import type { OrderConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const defaultNodes = [
  { id: '1', position: { x: 250, y: 0 }, data: { label: 'Order Created' }, type: 'input' as const, style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: '500' } },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'Assigned to Driver' }, style: { background: '#fff', border: '1px solid #94a3b8', borderRadius: '8px', padding: '10px', fontSize: '12px' } },
  { id: '3', position: { x: 100, y: 200 }, data: { label: 'Pickup En Route' }, style: { background: '#fff', border: '1px solid #94a3b8', borderRadius: '8px', padding: '10px', fontSize: '12px' } },
  { id: '4', position: { x: 400, y: 200 }, data: { label: 'Delivery En Route' }, style: { background: '#fff', border: '1px solid #94a3b8', borderRadius: '8px', padding: '10px', fontSize: '12px' } },
  { id: '5', position: { x: 250, y: 300 }, data: { label: 'Delivered (POD Required)' }, type: 'output' as const, style: { background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 'bold', color: '#15803d' } },
];

const defaultEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
];

interface CustomField {
  name: string;
  type: string;
  required: boolean;
  editable: boolean;
  customerVisible: boolean;
}

interface FormState {
  name: string;
  description: string;
  type: string;
  status: string;
  fields: CustomField[];
  steps: any[];
  options: Record<string, boolean>;
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    type: "transport",
    status: "draft",
    fields: [],
    steps: [],
    options: { requirePod: true, enableTracking: true },
  };
}

function configToForm(config: OrderConfig): FormState {
  const fields = Array.isArray(config.fields) ? config.fields as CustomField[] : [];
  const steps = Array.isArray(config.steps) ? config.steps as any[] : [];
  const options = (config.options && typeof config.options === 'object' && !Array.isArray(config.options))
    ? config.options as Record<string, boolean>
    : { requirePod: true, enableTracking: true };
  return {
    name: config.name,
    description: config.description,
    type: config.type,
    status: config.status,
    fields,
    steps,
    options,
  };
}

export default function OrderConfigPage() {
  const { toast } = useToast();
  const { data: configs, isLoading, error } = orderConfigsApi.useList();
  const createMutation = orderConfigsApi.useCreate();
  const updateMutation = orderConfigsApi.useUpdate();
  const deleteMutation = orderConfigsApi.useDelete();

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<OrderConfig | null>(null);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const openNewConfig = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }, []);

  const openEditConfig = useCallback((config: OrderConfig) => {
    setEditingId(config.id);
    setForm(configToForm(config));
    setSheetOpen(true);
  }, []);

  const handleDuplicate = useCallback((config: OrderConfig) => {
    const dupForm = configToForm(config);
    createMutation.mutate(
      {
        name: dupForm.name + " (Copy)",
        description: dupForm.description,
        type: dupForm.type,
        status: "draft",
        fields: dupForm.fields as any,
        steps: dupForm.steps as any,
        options: dupForm.options as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Configuration duplicated" });
        },
      }
    );
  }, [createMutation, toast]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Configuration deleted" });
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteMutation, toast]);

  const handleSave = useCallback(() => {
    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      status: form.status,
      fields: form.fields as any,
      steps: form.steps as any,
      options: form.options as any,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Configuration updated" });
            setSheetOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Configuration created" });
          setSheetOpen(false);
        },
      });
    }
  }, [editingId, form, createMutation, updateMutation, toast]);

  const addField = useCallback(() => {
    if (!newFieldName.trim()) return;
    setForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        { name: newFieldName.trim(), type: newFieldType, required: false, editable: true, customerVisible: false },
      ],
    }));
    setNewFieldName("");
    setNewFieldType("text");
  }, [newFieldName, newFieldType]);

  const removeField = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }, []);

  const addStep = useCallback(() => {
    const id = String(nodes.length + 1);
    const newNode = {
      id,
      position: { x: 250, y: nodes.length * 100 },
      data: { label: `Step ${id}` },
      style: { background: '#fff', border: '1px solid #94a3b8', borderRadius: '8px', padding: '10px', fontSize: '12px' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Order Configuration</h1>
            <p className="text-muted-foreground" data-testid="text-page-description">Define custom order flows, data fields, and service types.</p>
          </div>
          <Button data-testid="button-new-config" onClick={openNewConfig}>
            <Plus className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12" data-testid="status-loading">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4" data-testid="status-error">
            <p className="text-sm text-destructive">Failed to load configurations: {(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="rounded-md border bg-card" data-testid="table-configs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Custom Fields</TableHead>
                  <TableHead>Flow Steps</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs && configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
                      No configurations yet. Create your first one.
                    </TableCell>
                  </TableRow>
                )}
                {configs?.map((config) => {
                  const fieldsArr = Array.isArray(config.fields) ? config.fields : [];
                  const stepsArr = Array.isArray(config.steps) ? config.steps : [];
                  return (
                    <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-config-name-${config.id}`}>{config.name}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-config-desc-${config.id}`}>{config.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize" data-testid={`badge-config-type-${config.id}`}>{config.type}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-config-fields-${config.id}`}>{fieldsArr.length}</TableCell>
                      <TableCell data-testid={`text-config-steps-${config.id}`}>{stepsArr.length}</TableCell>
                      <TableCell>
                        <Badge variant={config.status === "active" ? "default" : "secondary"} data-testid={`badge-config-status-${config.id}`}>
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-config-actions-${config.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-testid={`button-edit-config-${config.id}`} onClick={() => openEditConfig(config)}>Edit Configuration</DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-duplicate-config-${config.id}`} onClick={() => handleDuplicate(config)}>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-delete-config-${config.id}`} className="text-destructive" onClick={() => setDeleteTarget(config)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="button-delete-confirm" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="sheet-config">
          <SheetHeader>
            <SheetTitle data-testid="text-sheet-title">{editingId ? "Edit Configuration" : "New Configuration"}</SheetTitle>
            <SheetDescription>
              Customize how this order type behaves, collects data, and progresses.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Tabs defaultValue="general">
              <TabsList className="w-full grid grid-cols-3" data-testid="tabs-config">
                <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
                <TabsTrigger value="fields" data-testid="tab-fields">Custom Fields</TabsTrigger>
                <TabsTrigger value="flow" data-testid="tab-flow">Activity Flow</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label>Configuration Name</Label>
                  <Input
                    data-testid="input-config-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Express Delivery"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    data-testid="input-config-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Internal description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Service Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger data-testid="select-config-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger data-testid="select-config-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Options</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Proof of Delivery</Label>
                      <p className="text-xs text-muted-foreground">Driver must submit POD to complete order.</p>
                    </div>
                    <Switch
                      data-testid="switch-require-pod"
                      checked={form.options.requirePod ?? true}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, options: { ...f.options, requirePod: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Real-time Tracking</Label>
                      <p className="text-xs text-muted-foreground">Share tracking link with customer.</p>
                    </div>
                    <Switch
                      data-testid="switch-enable-tracking"
                      checked={form.options.enableTracking ?? true}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, options: { ...f.options, enableTracking: v } }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fields" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Data Collection Fields</h3>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="grid gap-1 flex-1">
                    <Label className="text-xs">Field Name</Label>
                    <Input
                      data-testid="input-new-field-name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="e.g. Package ID"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                      <SelectTrigger data-testid="select-new-field-type" className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" data-testid="button-add-field" onClick={addField}>
                    <Plus className="h-3 w-3 mr-1" /> Add Field
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-fields">No custom fields added yet.</p>
                  )}
                  {form.fields.map((field, idx) => (
                    <Card key={idx} data-testid={`card-field-${idx}`}>
                      <CardHeader className="p-3 pb-0">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">{field.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{field.type}</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              data-testid={`button-remove-field-${idx}`}
                              onClick={() => removeField(idx)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 text-xs text-muted-foreground">
                        {field.required ? "Required" : "Optional"}{field.editable ? " • Editable" : ""}{field.customerVisible ? " • Customer Visible" : ""}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="flow" className="space-y-4 pt-4 h-[500px] flex flex-col">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-medium">Workflow Builder</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" data-testid="button-add-step" onClick={addStep}>
                      <Plus className="h-3 w-3 mr-1" /> Add Step
                    </Button>
                    <Badge variant="secondary">Visual Editor</Badge>
                  </div>
                </div>
                <div className="flex-1 border rounded-md bg-slate-50 relative overflow-hidden">
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      fitView
                      attributionPosition="bottom-right"
                      data-testid="reactflow-canvas"
                    >
                      <Background color="#ccc" gap={20} />
                      <Controls />
                      <MiniMap style={{height: 100, width: 150}} zoomable pannable />
                    </ReactFlow>
                  </ReactFlowProvider>
                  <div className="absolute top-2 left-2 z-10 bg-white/80 p-2 rounded shadow-sm text-xs border">
                    <p className="font-semibold text-slate-700">Drag to reorder</p>
                    <p className="text-slate-500">Connect nodes to define flow</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t gap-2">
              <Button variant="outline" data-testid="button-cancel" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button data-testid="button-save" onClick={handleSave} disabled={isSaving || !form.name.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
