import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { partsApi } from "@/lib/api";
import type { Part } from "@shared/schema";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, MoreHorizontal, Package, AlertTriangle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["engine", "tires", "fluids", "electronics", "body"] as const;

const emptyForm = { name: "", sku: "", category: "engine", stock: 0, min_stock: 5, cost: "0", location: "" };

export default function PartsPage() {
  const { data: parts = [] } = partsApi.useList();
  const createPart = partsApi.useCreate();
  const updatePart = partsApi.useUpdate();
  const deletePart = partsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);
  const [stockTarget, setStockTarget] = useState<Part | null>(null);
  const [stockAdjust, setStockAdjust] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const filteredParts = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
      (categoryFilter === "low_stock" ? (p.stock ?? 0) <= (p.min_stock ?? 0) : p.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (part: Part) => {
    setForm({
      name: part.name,
      sku: part.sku,
      category: part.category,
      stock: part.stock ?? 0,
      min_stock: part.min_stock ?? 5,
      cost: part.cost,
      location: part.location,
    });
    setEditPart(part);
  };

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Part name is required.", variant: "destructive" });
      return;
    }
    if (!form.sku.trim()) {
      toast({ title: "Validation Error", description: "SKU is required.", variant: "destructive" });
      return;
    }
    createPart.mutate(
      { name: form.name, sku: form.sku, category: form.category, stock: form.stock, min_stock: form.min_stock, cost: form.cost, location: form.location },
      {
        onSuccess: () => {
          toast({ title: "Part Created", description: `${form.name} has been added to inventory.` });
          setCreateOpen(false);
          setForm(emptyForm);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editPart) return;
    updatePart.mutate(
      { id: editPart.id, name: form.name, sku: form.sku, category: form.category, stock: form.stock, min_stock: form.min_stock, cost: form.cost, location: form.location },
      {
        onSuccess: () => {
          toast({ title: "Part Updated", description: `${form.name} has been updated.` });
          setEditPart(null);
          setForm(emptyForm);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePart.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Part Deleted", description: `${deleteTarget.name} has been removed.` });
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleStockAdjust = () => {
    if (!stockTarget) return;
    const newStock = (stockTarget.stock ?? 0) + stockAdjust;
    updatePart.mutate(
      { id: stockTarget.id, stock: newStock < 0 ? 0 : newStock },
      {
        onSuccess: () => {
          toast({ title: "Stock Updated", description: `${stockTarget.name} stock adjusted by ${stockAdjust >= 0 ? "+" : ""}${stockAdjust}.` });
          setStockTarget(null);
          setStockAdjust(0);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleExport = () => {
    const csv = [
      ["SKU", "Name", "Category", "Location", "Stock", "Min Stock", "Cost"].join(","),
      ...parts.map(p => [p.sku, p.name, p.category, p.location, p.stock ?? 0, p.min_stock ?? 0, p.cost].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Parts exported as CSV." });
  };

  const formFields = (
    <div className="space-y-4 py-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input placeholder="Oil Filter" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-part-name" />
      </div>
      <div className="space-y-2">
        <Label>SKU</Label>
        <Input placeholder="PRT-001" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} data-testid="input-part-sku" />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
          <SelectTrigger data-testid="select-part-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stock</Label>
          <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} data-testid="input-part-stock" />
        </div>
        <div className="space-y-2">
          <Label>Min Stock</Label>
          <Input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: parseInt(e.target.value) || 0 }))} data-testid="input-part-min-stock" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Unit Cost</Label>
        <Input placeholder="12.99" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} data-testid="input-part-cost" />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input placeholder="Warehouse A, Shelf 3" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} data-testid="input-part-location" />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parts & Inventory</h1>
            <p className="text-muted-foreground">Manage spare parts, stock levels, and procurement.</p>
          </div>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-add-part" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Part
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add New Part</SheetTitle>
                <SheetDescription>Add a new part to your inventory.</SheetDescription>
              </SheetHeader>
              {formFields}
              <div className="flex justify-end">
                <Button className="w-full" onClick={handleCreate} disabled={createPart.isPending} data-testid="button-create-part-submit">
                  {createPart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Part
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search parts by name or SKU..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-parts"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter-parts">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("low_stock")}>Low Stock</DropdownMenuItem>
              {CATEGORIES.map(c => (
                <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)} className="capitalize">{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={handleExport} data-testid="button-export-parts">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.map((part) => (
                <TableRow key={part.id} data-testid={`row-part-${part.id}`}>
                  <TableCell className="font-mono text-xs" data-testid={`text-sku-${part.id}`}>
                    {part.sku}
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-name-${part.id}`}>
                    {part.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize" data-testid={`text-category-${part.id}`}>
                      {part.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" data-testid={`text-location-${part.id}`}>{part.location}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${(part.stock ?? 0) <= (part.min_stock ?? 0) ? 'text-destructive' : ''}`} data-testid={`text-stock-${part.id}`}>
                        {part.stock}
                      </span>
                      {(part.stock ?? 0) <= (part.min_stock ?? 0) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-cost-${part.id}`}>
                    ${part.cost}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${part.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`button-adjust-stock-${part.id}`} onClick={() => { setStockTarget(part); setStockAdjust(0); }}>
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid={`button-edit-${part.id}`} onClick={() => openEdit(part)}>
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" data-testid={`button-delete-${part.id}`} onClick={() => setDeleteTarget(part)}>
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

      <Sheet open={!!editPart} onOpenChange={(open) => { if (!open) { setEditPart(null); setForm(emptyForm); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Part</SheetTitle>
            <SheetDescription>Update the details of this part.</SheetDescription>
          </SheetHeader>
          {formFields}
          <div className="flex justify-end">
            <Button className="w-full" onClick={handleUpdate} disabled={updatePart.isPending} data-testid="button-update-part-submit">
              {updatePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Part</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePart.isPending} data-testid="button-confirm-delete">
              {deletePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockTarget} onOpenChange={(open) => { if (!open) { setStockTarget(null); setStockAdjust(0); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Current stock for <span className="font-semibold">{stockTarget?.name}</span>: {stockTarget?.stock ?? 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Adjustment (positive to add, negative to remove)</Label>
            <Input type="number" value={stockAdjust} onChange={e => setStockAdjust(parseInt(e.target.value) || 0)} data-testid="input-stock-adjust" />
            <p className="text-sm text-muted-foreground">
              New stock will be: {Math.max(0, (stockTarget?.stock ?? 0) + stockAdjust)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStockTarget(null); setStockAdjust(0); }} data-testid="button-cancel-stock">Cancel</Button>
            <Button onClick={handleStockAdjust} disabled={updatePart.isPending} data-testid="button-confirm-stock">
              {updatePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
