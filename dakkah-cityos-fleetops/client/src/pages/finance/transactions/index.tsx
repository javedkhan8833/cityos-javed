import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { transactionsApi } from "@/lib/api";
import type { Transaction } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, Trash2, MoreHorizontal, Pencil, Eye } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function TransactionsPage() {
  const { data: txns = [], isLoading, error } = transactionsApi.useList();
  const createTxn = transactionsApi.useCreate();
  const deleteTxn = transactionsApi.useDelete();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null);
  const [editMode, setEditMode] = useState(false);
  const updateTxn = transactionsApi.useUpdate();

  const [formData, setFormData] = useState({
    description: "",
    amount: "0",
    type: "debit",
    method: "wallet",
    status: "completed",
    reference: "",
  });

  const filteredTxns = txns.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.reference ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCredits = txns.filter(t => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalDebits = txns.filter(t => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const balance = totalCredits - totalDebits;

  const openCreate = () => {
    setViewTxn(null);
    setEditMode(false);
    setFormData({ description: "", amount: "0", type: "debit", method: "wallet", status: "completed", reference: "" });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.description.trim()) {
      toast({ title: "Error", description: "Description is required.", variant: "destructive" });
      return;
    }
    createTxn.mutate(formData as any, {
      onSuccess: () => { toast({ title: "Recorded", description: "Transaction recorded." }); setIsSheetOpen(false); },
    });
  };

  const handleViewDetails = (txn: Transaction) => {
    setViewTxn(txn);
    setEditMode(false);
    setFormData({
      description: txn.description,
      amount: txn.amount,
      type: txn.type,
      method: txn.method,
      status: txn.status,
      reference: txn.reference ?? "",
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (txn: Transaction) => {
    setViewTxn(txn);
    setEditMode(true);
    setFormData({
      description: txn.description,
      amount: txn.amount,
      type: txn.type,
      method: txn.method,
      status: txn.status,
      reference: txn.reference ?? "",
    });
    setIsSheetOpen(true);
  };

  const handleUpdate = () => {
    if (!viewTxn) return;
    updateTxn.mutate(
      { id: viewTxn.id, ...formData } as any,
      {
        onSuccess: () => {
          toast({ title: "Updated", description: "Transaction updated." });
          setIsSheetOpen(false);
          setViewTxn(null);
          setEditMode(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTxn.mutate(deleteId, {
      onSuccess: () => { toast({ title: "Deleted", description: "Transaction removed." }); setDeleteId(null); },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-transactions-title">Finance & Transactions</h1>
            <p className="text-muted-foreground">Track wallet balances, payments, and settlements.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-transaction">
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-balance">${balance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{txns.length} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-credits">+${totalCredits.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-debits">-${totalDebits.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search transactions..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-transactions"
          />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTxns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions yet. Click "New Transaction" to record one.
                  </TableCell>
                </TableRow>
              )}
              {filteredTxns.map((txn) => (
                <TableRow key={txn.id} data-testid={`row-txn-${txn.id}`}>
                  <TableCell className="font-medium">{txn.description}</TableCell>
                  <TableCell>
                    <Badge variant={txn.type === "credit" ? "default" : "secondary"} className="capitalize">
                      {txn.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{txn.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{txn.reference || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {txn.created_at ? formatDistanceToNow(new Date(txn.created_at), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={txn.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {txn.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${txn.type === 'credit' ? 'text-green-600' : ''}`}>
                    {txn.type === 'credit' ? '+' : '-'}${parseFloat(txn.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`menu-view-txn-${txn.id}`} onClick={() => handleViewDetails(txn)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid={`menu-edit-txn-${txn.id}`} onClick={() => handleEdit(txn)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" data-testid={`menu-delete-txn-${txn.id}`} onClick={() => setDeleteId(txn.id)}>
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
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if (!open) { setViewTxn(null); setEditMode(false); } }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{viewTxn ? (editMode ? "Edit Transaction" : "Transaction Details") : "New Transaction"}</SheetTitle>
            <SheetDescription>{viewTxn ? (editMode ? "Update this transaction." : "View transaction information.") : "Record a financial transaction."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input placeholder="e.g. Driver payout - March" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={viewTxn !== null && !editMode} data-testid="input-txn-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} disabled={viewTxn !== null && !editMode} data-testid="input-txn-amount" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })} disabled={viewTxn !== null && !editMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })} disabled={viewTxn !== null && !editMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={viewTxn !== null && !editMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Reference</Label>
              <Input placeholder="e.g. INV-001 or PO-2024" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} disabled={viewTxn !== null && !editMode} data-testid="input-txn-reference" />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => { setIsSheetOpen(false); setViewTxn(null); setEditMode(false); }}>
                {viewTxn && !editMode ? "Close" : "Cancel"}
              </Button>
              {viewTxn && !editMode && (
                <Button onClick={() => setEditMode(true)} data-testid="button-edit-transaction">
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
              )}
              {viewTxn && editMode && (
                <Button onClick={handleUpdate} disabled={updateTxn.isPending} data-testid="button-update-transaction">
                  {updateTxn.isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
              {!viewTxn && (
                <Button onClick={handleSave} disabled={createTxn.isPending} data-testid="button-save-transaction">
                  {createTxn.isPending ? "Saving..." : "Record Transaction"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>Remove this transaction permanently?</AlertDialogDescription>
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
