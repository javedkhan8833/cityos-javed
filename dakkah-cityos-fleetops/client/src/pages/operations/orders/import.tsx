import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedRow {
  customer: string;
  address: string;
  price: string;
  notes: string;
}

export default function OrderImportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setImportedCount(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        setError("CSV file must have a header row and at least one data row.");
        setParsedRows([]);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        rows.push({
          customer: cols[headers.indexOf("customer")] || "",
          address: cols[headers.indexOf("address")] || "",
          price: cols[headers.indexOf("price")] || "",
          notes: cols[headers.indexOf("notes")] || "",
        });
      }
      setParsedRows(rows);
      toast({ title: "File parsed", description: `${rows.length} orders ready to import.` });
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      const count = data.count ?? data.imported ?? parsedRows.length;
      setImportedCount(count);
      setParsedRows([]);
      setFileName("");
      toast({ title: "Import successful", description: `${count} orders have been created.` });
    } catch (err: any) {
      const msg = err.message || "Import failed";
      setError(msg);
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = "customer,address,price,notes\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "order-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    setImportedCount(null);
    setError(null);
  };

  const showUploadArea = importedCount === null;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Bulk Order Import</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Upload CSV files to create multiple orders at once.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-file-csv"
        />

        <Card>
          <CardContent className="pt-6">
            {showUploadArea ? (
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center space-y-4 hover:bg-muted/5 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-area"
                >
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Drag & Drop or Click to Upload</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Supported formats: .csv (Max 10MB)
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md" data-testid="text-error-message">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {parsedRows.length > 0 && (
                  <div className="text-center space-y-4" data-testid="text-parsed-count">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{parsedRows.length}</span> orders ready to import from <span className="font-medium">{fileName}</span>
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button variant="outline" onClick={handleReset} data-testid="button-cancel-import">
                        Cancel
                      </Button>
                      <Button onClick={handleImport} disabled={isImporting} data-testid="button-import-orders">
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          "Import Orders"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-import-success">Import Successful</h3>
                  <p className="text-muted-foreground" data-testid="text-imported-count">{importedCount} orders have been created successfully.</p>
                </div>
                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" onClick={handleReset} data-testid="button-import-another">Import Another</Button>
                  <Button onClick={() => setLocation("/operations/orders")} data-testid="button-view-orders">View Orders</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileUp className="h-4 w-4" /> Template Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">Ensure your CSV follows the standard schema to avoid errors.</p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadTemplate} data-testid="button-download-template">
                <Download className="h-4 w-4 mr-2" /> Download Template
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>'Customer Name' is required</li>
                <li>'Address' must include city and zip</li>
                <li>'Date' format should be ISO 8601</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
