import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { contactsApi, ordersApi } from "@/lib/api";
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Filter, Download, MoreHorizontal, Phone, Mail, Building2, User, History, MessageSquare, Edit, Copy, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type ContactFormData = {
  name: string;
  type: string;
  phone: string;
  phone_country_code: string;
  email: string;
};

const emptyForm: ContactFormData = {
  name: "",
  type: "customer",
  phone: "",
  phone_country_code: "",
  email: "",
};

export default function ContactsPage() {
  const [, navigate] = useLocation();
  const { data: contacts = [] } = contactsApi.useList();
  const { data: allOrders = [] } = ordersApi.useList();
  const createMutation = contactsApi.useCreate();
  const updateMutation = contactsApi.useUpdate();
  const deleteMutation = contactsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any | null>(null);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  function openCreateForm() {
    setEditingContact(null);
    setFormData(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(contact: any) {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      type: contact.type,
      phone: contact.phone,
      phone_country_code: contact.phone_country_code || "",
      email: contact.email,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    if (editingContact) {
      updateMutation.mutate(
        { id: editingContact.id, ...formData },
        {
          onSuccess: () => {
            toast({ title: "Contact Updated", description: `${formData.name} has been updated.` });
            setFormOpen(false);
            setEditingContact(null);
            if (selectedContact?.id === editingContact.id) {
              setSelectedContact(null);
            }
          },
          onError: (err: any) => {
            toast({ title: "Error", description: err.message || "Failed to update contact.", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast({ title: "Contact Created", description: `${formData.name} has been added.` });
          setFormOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to create contact.", variant: "destructive" });
        },
      });
    }
  }

  function handleDelete() {
    if (!contactToDelete) return;
    deleteMutation.mutate(contactToDelete.id, {
      onSuccess: () => {
        toast({ title: "Contact Deleted", description: `${contactToDelete.name} has been deleted.` });
        setDeleteDialogOpen(false);
        setContactToDelete(null);
        if (selectedContact?.id === contactToDelete.id) {
          setSelectedContact(null);
        }
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to delete contact.", variant: "destructive" });
      },
    });
  }

  function exportCSV() {
    const headers = ["Name", "Type", "Phone", "Phone Country Code", "Email"];
    const rows = contacts.map(c => [c.name, c.type, c.phone, c.phone_country_code || '', c.email]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `${contacts.length} contacts exported as CSV.` });
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      toast({ title: "Copied", description: "Email copied to clipboard." });
    });
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Contacts</h1>
            <p className="text-muted-foreground">Manage customers, vendors, and partners.</p>
          </div>
          <Button data-testid="button-add-contact" onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input 
            placeholder="Search contacts..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-contacts"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("customer")}>Customer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("partner")}>Partner</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("vendor")}>Supplier</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" data-testid="button-export" onClick={exportCSV}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3 cursor-pointer hover:underline" onClick={() => setSelectedContact(contact)} data-testid={`link-contact-${contact.id}`}>
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{contact.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contact.type === "customer" ? "default" : "secondary"} className="capitalize" data-testid={`badge-type-${contact.id}`}>
                      {contact.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {contact.phone_country_code ? `${contact.phone_country_code} ` : ''}{contact.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {contact.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${contact.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`menuitem-view-${contact.id}`} onClick={() => setSelectedContact(contact)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menuitem-edit-${contact.id}`} onClick={() => openEditForm(contact)}>Edit Contact</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menuitem-delete-${contact.id}`} className="text-destructive" onClick={() => { setContactToDelete(contact); setDeleteDialogOpen(true); }}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Contact Sheet */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingContact(null); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="text-form-title">{editingContact ? "Edit Contact" : "Add Contact"}</SheetTitle>
            <SheetDescription>{editingContact ? "Update the contact details below." : "Fill in the details to create a new contact."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                data-testid="input-contact-name"
                placeholder="Contact name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-type">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
                <SelectTrigger data-testid="select-contact-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer" data-testid="option-customer">Customer</SelectItem>
                  <SelectItem value="vendor" data-testid="option-vendor">Vendor</SelectItem>
                  <SelectItem value="partner" data-testid="option-partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="contact-phone-code">Code</Label>
                <Input
                  id="contact-phone-code"
                  data-testid="input-contact-phone-code"
                  placeholder="+1"
                  value={formData.phone_country_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_country_code: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  data-testid="input-contact-phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                data-testid="input-contact-email"
                placeholder="Email address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" data-testid="button-cancel-form" onClick={() => { setFormOpen(false); setEditingContact(null); }}>Cancel</Button>
              <Button
                data-testid="button-submit-contact"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingContact ? "Update Contact" : "Create Contact"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setContactToDelete(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-title">Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{contactToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" data-testid="button-cancel-delete" onClick={() => { setDeleteDialogOpen(false); setContactToDelete(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              data-testid="button-confirm-delete"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Details Sheet */}
      <Sheet open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedContact && (
                <>
                    <SheetHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                    {selectedContact.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-2xl" data-testid="text-detail-name">{selectedContact.name}</SheetTitle>
                                <SheetDescription className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">{selectedContact.type}</Badge>
                                    <span className="text-muted-foreground">•</span>
                                    <span>ID: {selectedContact.id.substring(0, 8)}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Button className="w-full" data-testid="button-new-order" onClick={() => { setSelectedContact(null); navigate('/operations/orders/new'); }}>
                                <Plus className="h-4 w-4 mr-2" /> New Order
                            </Button>
                            <Button variant="outline" className="w-full" data-testid="button-edit-profile" onClick={() => { setSelectedContact(null); openEditForm(selectedContact); }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit Profile
                            </Button>
                        </div>

                        <Tabs defaultValue="details">
                            <TabsList className="w-full">
                                <TabsTrigger value="details" className="flex-1" data-testid="tab-details">Details</TabsTrigger>
                                <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
                                <TabsTrigger value="orders" className="flex-1" data-testid="tab-orders">Orders</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-6 pt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4" /> Contact Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg bg-card">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Phone</p>
                                                    <p className="text-sm text-muted-foreground" data-testid="text-detail-phone">
                                                      {selectedContact.phone_country_code ? `${selectedContact.phone_country_code} ` : ''}{selectedContact.phone}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-message-phone" onClick={() => { navigator.clipboard.writeText(selectedContact.phone || ''); toast({ title: "Phone Copied", description: `${selectedContact.phone} copied to clipboard.` }); }}><MessageSquare className="h-4 w-4" /></Button>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Email</p>
                                                    <p className="text-sm text-muted-foreground" data-testid="text-detail-email">{selectedContact.email}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-copy-email" onClick={() => copyEmail(selectedContact.email)}><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity" className="space-y-4 pt-4">
                                <h3 className="font-semibold text-sm">Recent Interactions</h3>
                                <div className="space-y-4 border-l-2 border-muted pl-4 ml-2">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500" />
                                        <div className="text-sm font-medium">Order #ORD-1234 Created</div>
                                        <div className="text-xs text-muted-foreground">Today, 10:30 AM</div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500" />
                                        <div className="text-sm font-medium">Order #ORD-9876 Delivered</div>
                                        <div className="text-xs text-muted-foreground">Yesterday, 2:15 PM</div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="orders" className="space-y-4 pt-4">
                                {(() => {
                                  const contactOrders = allOrders.filter(o => o.customer_uuid === selectedContact?.id);
                                  return (
                                    <div className="border rounded-md">
                                      <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                                        <span className="text-sm font-medium">Total Orders</span>
                                        <Badge variant="secondary">{contactOrders.length}</Badge>
                                      </div>
                                      {contactOrders.length > 0 ? (
                                        <div className="divide-y">
                                          {contactOrders.slice(0, 10).map(order => (
                                            <div key={order.id} className="p-3 flex justify-between items-center text-sm">
                                              <div>
                                                <p className="font-medium">{order.tracking_number}</p>
                                                <p className="text-xs text-muted-foreground">{order.notes || ''}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-medium">${order.total_amount}</p>
                                                <Badge variant="outline" className="text-[10px] h-5 capitalize">{order.status.replace("_", " ")}</Badge>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="p-6 text-center text-sm text-muted-foreground">
                                          No orders found for this contact.
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
