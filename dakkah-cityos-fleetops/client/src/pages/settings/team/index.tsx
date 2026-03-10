import { useState } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { usersApi } from "@/lib/api";
import type { User } from "@shared/schema";
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
import { Plus, MoreHorizontal, Shield, Trash2 } from "lucide-react";
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

export default function TeamPage() {
  const { data: members = [], isLoading, error } = usersApi.useList();
  const createUser = usersApi.useCreate();
  const updateUser = usersApi.useUpdate();
  const deleteUser = usersApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "viewer",
    status: "active",
  });

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ username: "", password: "", name: "", email: "", role: "viewer", status: "active" });
    setIsSheetOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: "Error", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    if (editingUser) {
      const updateData: any = { name: formData.name, email: formData.email, role: formData.role, status: formData.status };
      if (formData.password) updateData.password = formData.password;
      updateUser.mutate({ id: editingUser.id, ...updateData }, {
        onSuccess: () => { toast({ title: "Updated", description: "Team member updated." }); setIsSheetOpen(false); },
      });
    } else {
      if (!formData.username.trim() || !formData.password.trim()) {
        toast({ title: "Error", description: "Username and password are required for new members.", variant: "destructive" });
        return;
      }
      createUser.mutate(formData as any, {
        onSuccess: () => { toast({ title: "Invited", description: "Team member added." }); setIsSheetOpen(false); },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteUser.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Removed", description: "Team member removed." }); setDeleteId(null); },
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-team-title">Team & Permissions</h1>
            <p className="text-muted-foreground">Manage users, roles, and access controls.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-invite-member">
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
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
            placeholder="Search members..." 
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-members"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No team members yet.
                  </TableCell>
                </TableRow>
              )}
              {filteredMembers.map((member) => (
                <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium">
                        {member.name.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{member.name || member.username}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 capitalize">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      {member.role}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "active" ? "default" : "secondary"} className="capitalize">
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.last_active ? formatDistanceToNow(new Date(member.last_active), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(member)}>Edit Role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(member.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Remove User
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

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingUser ? "Edit Team Member" : "Invite Team Member"}</SheetTitle>
            <SheetDescription>{editingUser ? "Update role and permissions." : "Add a new member to your organization."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Ahmad Al-Farsi" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-member-name" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" placeholder="colleague@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-member-email" />
            </div>
            {!editingUser && (
              <>
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input placeholder="e.g. ahmad.alfarsi" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} data-testid="input-member-username" />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="Set initial password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} data-testid="input-member-password" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createUser.isPending || updateUser.isPending} data-testid="button-save-member">
                {createUser.isPending || updateUser.isPending ? "Saving..." : editingUser ? "Update Member" : "Send Invitation"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>This will revoke their access. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
