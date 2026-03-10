import { ReactNode, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
  separator?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowActions?: RowAction<T>[];
  searchPlaceholder?: string;
  searchField?: keyof T;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  filterContent?: ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  rowActions,
  searchPlaceholder = "Search...",
  searchField,
  onRowClick,
  isLoading = false,
  emptyMessage = "No records found.",
  pageSize = 20,
  filterContent,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const filteredData = searchField && searchTerm
    ? data.filter(row => {
        const val = row[searchField];
        return String(val).toLowerCase().includes(searchTerm.toLowerCase());
      })
    : data;

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="rounded-md border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
              {columns.map((_, ci) => (
                <Skeleton key={ci} className="h-5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="data-table">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          {searchField && (
            <Input
              placeholder={searchPlaceholder}
              className="w-[300px]"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              data-testid="input-search"
            />
          )}
          {filterContent}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableHead className="text-right w-[60px]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={(row as any).id || idx}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(row)}
                  data-testid={`row-${(row as any).id || idx}`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>{col.cell(row)}</TableCell>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} data-testid={`button-actions-${(row as any).id || idx}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action, ai) => (
                            <span key={ai}>
                              {action.separator && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                className={action.variant === "destructive" ? "text-destructive" : ""}
                                onClick={(e) => { e.stopPropagation(); action.onClick(row); }}
                              >
                                {action.label}
                              </DropdownMenuItem>
                            </span>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
