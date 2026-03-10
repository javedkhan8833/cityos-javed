import { Badge } from "@/components/ui/badge";
import { getStatusClasses } from "@/lib/design-tokens";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "default";
}

export function StatusBadge({ status, className = "", size = "default" }: StatusBadgeProps) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge
      variant="outline"
      data-testid={`status-badge-${status}`}
      className={`capitalize ${getStatusClasses(status)} ${size === "sm" ? "text-xs px-1.5 py-0" : ""} ${className}`}
    >
      {label}
    </Badge>
  );
}
