export const statusColors = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", dot: "bg-yellow-500" },
  assigned: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500" },
  in_transit: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  delivered: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
  active: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  inactive: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" },
  online: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  offline: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" },
  busy: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" },
  maintenance: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  idle: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
  draft: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
  scheduled: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
  completed: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  open: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  investigating: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  resolved: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  connected: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  available: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" },
  suspended: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
  invited: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  disabled: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" },
  approved: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  rejected: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
  failed: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
  low: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
  medium: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  high: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" },
  critical: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
} as Record<string, { bg: string; text: string; border: string; dot: string }>;

export function getStatusClasses(status: string): string {
  const colors = statusColors[status] || statusColors.inactive;
  return `${colors.bg} ${colors.text} ${colors.border} border-0`;
}

export function getStatusDot(status: string): string {
  return statusColors[status]?.dot || "bg-gray-500";
}

export const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
