import { useState } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { customFieldsApi } from "@/lib/api";
import type { CustomField } from "@shared/schema";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreHorizontal, GripVertical, Trash2, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

export default function CustomFieldsPage() {
  const { data: fields = [], isLoading, error } = customFieldsApi.useList();
  const createField = customFieldsApi.useCreate();
  const updateField = customFieldsApi.useUpdate();
  const deleteField = customFieldsApi.useDelete();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("order");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: "",
    type: "text",
    model: "order",
    required: false,
    sort_order: 0,
  });

  const filteredFields = fields.filter(f => f.model === activeTab);

  const openCreate = () => {
    setEditingField(null);
    setFormData({ label: "", type: "text", model: activeTab, required: false, sort_order: 0 });
    setIsSheetOpen(true);
  };

  const openEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      label: field.label,
      type: field.type,
      model: field.model,
      required: field.required ?? false,
      sort_order: field.sort_order ?? 0,
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      toast({ title: "Error", description: "Label is required.", variant: "destructive" });
      return;
    }
    if (editingField) {
      updateField.mutate({ id: editingField.id, ...formData } as any, {
        onSuccess: () => {
          toast({ title: "Updated", description: "Custom field updated successfully." });
          setIsSheetOpen(false);
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message || "Failed to update field.", variant: "destructive" });
        },
      });
    } else {
      createField.mutate(formData as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Custom field created successfully." });
          setIsSheetOpen(false);
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message || "Failed to create field.", variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteField.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Custom field removed." });
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast({ title: "Error", description: err.message || "Failed to delete field.", variant: "destructive" });
        setDeleteId(null);
      },
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-custom-fields-title">Custom Fields</h1>
            <p className="text-muted-foreground">Extend your data models with business-specific attributes.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-field">
            <Plus className="mr-2 h-4 w-4" />
            Add Field
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

        <Tabs defaultValue="order" onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger value="order" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3" data-testid="tab-orders">Orders</TabsTrigger>
                <TabsTrigger value="driver" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3" data-testid="tab-drivers">Drivers</TabsTrigger>
                <TabsTrigger value="vehicle" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3" data-testid="tab-vehicles">Vehicles</TabsTrigger>
                <TabsTrigger value="place" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3" data-testid="tab-places">Places</TabsTrigger>
            </TabsList>

            <div className="mt-6 rounded-md border bg-card">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredFields.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground" data-testid="text-empty-fields">
                                No custom fields configured for this resource.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredFields.map((field) => (
                            <TableRow key={field.id} data-testid={`row-field-${field.id}`}>
                            <TableCell>
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-label-${field.id}`}>
                                {field.label}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-mono text-xs uppercase" data-testid={`text-type-${field.id}`}>
                                    {field.type}
                                </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-required-${field.id}`}>
                                {field.required ? (
                                    <Badge>Required</Badge>
                                ) : (
                                    <span className="text-muted-foreground text-sm">Optional</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <span className="text-muted-foreground font-mono" data-testid={`text-sort-order-${field.id}`}>{field.sort_order ?? 0}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-actions-${field.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(field)} data-testid={`button-edit-${field.id}`}>
                                        <Pencil className="h-4 w-4 mr-2" /> Edit Field
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(field.id)} data-testid={`button-delete-${field.id}`}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            </div>
        </Tabs>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle data-testid="text-sheet-title">{editingField ? "Edit Custom Field" : "Add Custom Field"}</SheetTitle>
            <SheetDescription>{editingField ? "Update the field configuration." : "Create a new custom field for your data model."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g. Customer Reference"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                data-testid="input-field-label"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Select value={formData.model} onValueChange={(v) => setFormData({ ...formData, model: v })}>
                <SelectTrigger data-testid="select-field-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="place">Place</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                data-testid="switch-field-required"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                data-testid="input-field-sort-order"
              />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)} data-testid="button-cancel-field">Cancel</Button>
              <Button onClick={handleSave} disabled={createField.isPending || updateField.isPending} data-testid="button-save-field">
                {createField.isPending || updateField.isPending ? "Saving..." : editingField ? "Update Field" : "Create Field"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this custom field. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
