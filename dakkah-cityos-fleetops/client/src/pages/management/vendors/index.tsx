import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { vendorsApi } from "@/lib/api";
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, MoreHorizontal, Building, Phone, Mail, FileText, CheckCircle, AlertTriangle, ExternalLink, Pencil, Trash2, Globe } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SERVICE_TYPES = ["Freight", "Last Mile", "Courier", "Haulage"];
const STATUSES = ["active", "inactive"];

function VendorForm({
  form,
  setForm,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  form: { name: string; type: string; email: string; phone: string; status: string; website_url: string; country: string };
  setForm: (f: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="vendor-name">Name *</Label>
        <Input
          id="vendor-name"
          data-testid="input-vendor-name"
          placeholder="Vendor name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(val) => setForm({ ...form, type: val })}
        >
          <SelectTrigger data-testid="select-vendor-service-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((t) => (
              <SelectItem key={t} value={t} data-testid={`select-service-type-${t.toLowerCase().replace(/ /g, "-")}`}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-email">Email</Label>
        <Input
          id="vendor-email"
          data-testid="input-vendor-email"
          type="email"
          placeholder="vendor@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-phone">Phone</Label>
        <Input
          id="vendor-phone"
          data-testid="input-vendor-phone"
          placeholder="+1 555-0123"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-website">Website URL</Label>
        <Input
          id="vendor-website"
          data-testid="input-vendor-website"
          placeholder="https://example.com"
          value={form.website_url}
          onChange={(e) => setForm({ ...form, website_url: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-country">Country</Label>
        <Input
          id="vendor-country"
          data-testid="input-vendor-country"
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(val) => setForm({ ...form, status: val })}
        >
          <SelectTrigger data-testid="select-vendor-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} data-testid={`select-status-${s}`}>
                <span className="capitalize">{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        data-testid="button-submit-vendor"
        className="w-full mt-4"
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

export default function VendorsPage() {
  const { data: vendors = [] } = vendorsApi.useList();
  const createMutation = vendorsApi.useCreate();
  const updateMutation = vendorsApi.useUpdate();
  const deleteMutation = vendorsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteVendor, setDeleteVendor] = useState<any | null>(null);

  const emptyForm = { name: "", type: "Freight", email: "", phone: "", status: "active", website_url: "", country: "" };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleCreate() {
    if (!createForm.name.trim()) {
      toast({ title: "Validation Error", description: "Vendor name is required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(createForm, {
      onSuccess: () => {
        toast({ title: "Vendor Created", description: `${createForm.name} has been added.` });
        setCreateOpen(false);
        setCreateForm(emptyForm);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to create vendor.", variant: "destructive" });
      },
    });
  }

  function handleEdit() {
    if (!editForm.name.trim()) {
      toast({ title: "Validation Error", description: "Vendor name is required.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: selectedVendor.id, ...editForm }, {
      onSuccess: () => {
        toast({ title: "Vendor Updated", description: `${editForm.name} has been updated.` });
        setEditMode(false);
        setSelectedVendor(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update vendor.", variant: "destructive" });
      },
    });
  }

  function handleToggleStatus(vendor: any) {
    const newStatus = vendor.status === "active" ? "inactive" : "active";
    updateMutation.mutate({ id: vendor.id, status: newStatus }, {
      onSuccess: () => {
        toast({
          title: newStatus === "inactive" ? "Vendor Suspended" : "Vendor Activated",
          description: `${vendor.name} is now ${newStatus}.`,
        });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
      },
    });
  }

  function handleDelete() {
    if (!deleteVendor) return;
    deleteMutation.mutate(deleteVendor.id, {
      onSuccess: () => {
        toast({ title: "Vendor Deleted", description: `${deleteVendor.name} has been removed.` });
        setDeleteVendor(null);
        if (selectedVendor?.id === deleteVendor.id) {
          setSelectedVendor(null);
        }
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to delete vendor.", variant: "destructive" });
      },
    });
  }

  function openEdit(vendor: any) {
    setEditForm({
      name: vendor.name,
      type: vendor.type || "Freight",
      email: vendor.email || "",
      phone: vendor.phone || "",
      status: vendor.status || "active",
      website_url: vendor.website_url || "",
      country: vendor.country || "",
    });
    setEditMode(true);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-vendors-title">Vendors</h1>
            <p className="text-muted-foreground">Manage 3rd-party logistics providers and contractors.</p>
          </div>
          <Button data-testid="button-add-vendor" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search vendors..." 
            className="max-w-sm"
            data-testid="input-search-vendors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter-vendors">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Suspended</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 cursor-pointer hover:underline" onClick={() => { setSelectedVendor(vendor); setEditMode(false); }} data-testid={`link-vendor-${vendor.id}`}>
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Building className="h-4 w-4" />
                        </div>
                        {vendor.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-service-type-${vendor.id}`}>{vendor.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground gap-1">
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {vendor.email}
                        </div>
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {vendor.phone}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{vendor.country || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={vendor.status === "active" ? "default" : "secondary"} className="capitalize" data-testid={`badge-status-${vendor.id}`}>
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${vendor.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`menu-view-${vendor.id}`} onClick={() => { setSelectedVendor(vendor); setEditMode(false); }}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menu-edit-${vendor.id}`} onClick={() => { setSelectedVendor(vendor); openEdit(vendor); }}>Edit Vendor</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menu-suspend-${vendor.id}`} onClick={() => handleToggleStatus(vendor)}>
                          {vendor.status === "active" ? "Suspend Vendor" : "Activate Vendor"}
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menu-delete-${vendor.id}`} className="text-destructive" onClick={() => setDeleteVendor(vendor)}>
                          Delete Vendor
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

      {/* Create Vendor Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setCreateForm(emptyForm); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto" data-testid="sheet-create-vendor">
          <SheetHeader>
            <SheetTitle>Add Vendor</SheetTitle>
            <SheetDescription>Create a new vendor partner.</SheetDescription>
          </SheetHeader>
          <VendorForm
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
            submitLabel="Create Vendor"
          />
        </SheetContent>
      </Sheet>

      {/* Vendor Details / Edit Sheet */}
      <Sheet open={!!selectedVendor} onOpenChange={(open) => { if (!open) { setSelectedVendor(null); setEditMode(false); } }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto" data-testid="sheet-vendor-details">
            {selectedVendor && !editMode && (
                <>
                    <SheetHeader>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                                {selectedVendor.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-2xl" data-testid="text-vendor-detail-name">{selectedVendor.name}</SheetTitle>
                                <SheetDescription className="flex items-center gap-2">
                                    <Badge variant="outline">{selectedVendor.type}</Badge>
                                    <span className="text-muted-foreground">•</span>
                                    <span>{selectedVendor.country || 'N/A'}</span>
                                </SheetDescription>
                            </div>
                            <Button variant="outline" size="sm" data-testid="button-edit-vendor" onClick={() => openEdit(selectedVendor)}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                        </div>
                    </SheetHeader>

                    <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold capitalize">{selectedVendor.status}</div>
                                    <div className="text-xs text-muted-foreground">Status</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold">{selectedVendor.type}</div>
                                    <div className="text-xs text-muted-foreground">Type</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-secondary/10 border-0">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold">{selectedVendor.country || 'N/A'}</div>
                                    <div className="text-xs text-muted-foreground">Country</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="overview">
                            <TabsList className="w-full">
                                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                                <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
                                <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6 pt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Contact Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Email</span>
                                            <a href={`mailto:${selectedVendor.email}`} className="font-medium hover:underline text-primary" data-testid="text-vendor-email">{selectedVendor.email}</a>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Phone</span>
                                            <a href={`tel:${selectedVendor.phone}`} className="font-medium hover:underline text-primary" data-testid="text-vendor-phone">{selectedVendor.phone}</a>
                                        </div>
                                        {selectedVendor.website_url && (
                                          <div className="col-span-2">
                                              <span className="text-muted-foreground block mb-1">Website</span>
                                              <a href={selectedVendor.website_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline text-primary flex items-center gap-1" data-testid="text-vendor-website">
                                                <Globe className="h-3 w-3" /> {selectedVendor.website_url}
                                              </a>
                                          </div>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Integration Status</h3>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">API Connected</p>
                                                <p className="text-xs text-muted-foreground">Last sync: 5 mins ago</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" data-testid="button-configure-integration" onClick={() => toast({ title: "API Configuration", description: `Opening API settings for ${selectedVendor?.name}.` })}>Configure</Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="services" className="space-y-4 pt-4">
                                <h3 className="font-semibold text-sm">Active Services</h3>
                                <div className="space-y-2">
                                    <Card className="p-3 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Building className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium text-sm">Last Mile Delivery</p>
                                                <p className="text-xs text-muted-foreground">Zone: North America</p>
                                            </div>
                                        </div>
                                        <Badge>Active</Badge>
                                    </Card>
                                    <Card className="p-3 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Building className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium text-sm">Warehousing</p>
                                                <p className="text-xs text-muted-foreground">Capacity: 5000 units</p>
                                            </div>
                                        </div>
                                        <Badge>Active</Badge>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="documents" className="space-y-4 pt-4">
                                <h3 className="font-semibold text-sm">Contracts & Compliance</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer" data-testid="doc-sla" onClick={() => toast({ title: "Opening Document", description: "Opening Service Level Agreement..." })}>
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium text-sm">Service Level Agreement</p>
                                                <p className="text-xs text-muted-foreground">Renewed Jan 2024</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline">Active</Badge>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}

            {selectedVendor && editMode && (
                <>
                    <SheetHeader>
                        <SheetTitle>Edit Vendor</SheetTitle>
                        <SheetDescription>Update vendor details.</SheetDescription>
                    </SheetHeader>
                    <VendorForm
                        form={editForm}
                        setForm={setEditForm}
                        onSubmit={handleEdit}
                        isLoading={updateMutation.isPending}
                        submitLabel="Update Vendor"
                    />
                </>
            )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVendor} onOpenChange={(open) => !open && setDeleteVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteVendor?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-vendor">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-vendor"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
