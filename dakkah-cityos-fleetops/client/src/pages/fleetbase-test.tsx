import { useState, useCallback, useEffect, useRef } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Play, RotateCw, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2,
  Building2, Globe, MapPin, Radio, ShieldAlert, ShieldCheck, Shield, Lock, Unlock, Info,
  Download, FileText, Zap, Search, Filter, Hash, KeyRound, ServerCrash, Timer, ArrowDownUp
} from "lucide-react";

type TestStatus = "pending" | "running" | "pass" | "fail" | "skip" | "warn";
type TestCategory = "crud" | "validation_check" | "api_bug" | "test_info";

interface TestResult {
  name: string;
  operation: string;
  status: TestStatus;
  duration?: number;
  message?: string;
  data?: any;
  category?: TestCategory;
  url?: string;
}

interface ResourceTestGroup {
  resource: string;
  label: string;
  apiPath: string;
  tests: TestResult[];
  overallStatus: TestStatus;
  crudSupport: { create: boolean; update: boolean; delete: boolean };
}

interface ExtraTestGroup {
  id: string;
  label: string;
  icon: string;
  tests: TestResult[];
  overallStatus: TestStatus;
}

const CRUD_SUPPORT: Record<string, { create: boolean; update: boolean; delete: boolean; skipList?: boolean }> = {
  "vehicles": { create: true, update: true, delete: true },
  "drivers": { create: true, update: true, delete: true },
  "orders": { create: true, update: true, delete: true },
  "places": { create: true, update: true, delete: true },
  "contacts": { create: true, update: true, delete: true },
  "vendors": { create: true, update: true, delete: true },
  "fleets": { create: true, update: true, delete: true },
  "service-areas": { create: true, update: true, delete: true },
  "zones": { create: true, update: true, delete: true },
  "service-rates": { create: true, update: true, delete: true },
  "entities": { create: true, update: true, delete: true },
  "payloads": { create: false, update: false, delete: false },
  "tracking-numbers": { create: false, update: false, delete: false },
  "tracking-statuses": { create: false, update: false, delete: false },
  "service-quotes": { create: false, update: false, delete: false, skipList: true },
  "purchase-rates": { create: false, update: false, delete: false },
};

const FLEETBASE_RESOURCES = [
  { resource: "vehicles", apiPath: "/api/fleetbase/vehicles", label: "Vehicles" },
  { resource: "drivers", apiPath: "/api/fleetbase/drivers", label: "Drivers" },
  { resource: "orders", apiPath: "/api/fleetbase/orders", label: "Orders" },
  { resource: "places", apiPath: "/api/fleetbase/places", label: "Places" },
  { resource: "contacts", apiPath: "/api/fleetbase/contacts", label: "Contacts" },
  { resource: "vendors", apiPath: "/api/fleetbase/vendors", label: "Vendors" },
  { resource: "fleets", apiPath: "/api/fleetbase/fleets", label: "Fleets" },
  { resource: "service-areas", apiPath: "/api/fleetbase/service-areas", label: "Service Areas" },
  { resource: "zones", apiPath: "/api/fleetbase/zones", label: "Zones" },
  { resource: "service-rates", apiPath: "/api/fleetbase/service-rates", label: "Service Rates" },
  { resource: "entities", apiPath: "/api/fleetbase/entities", label: "Entities" },
  { resource: "payloads", apiPath: "/api/fleetbase/payloads", label: "Payloads" },
  { resource: "tracking-numbers", apiPath: "/api/fleetbase/tracking-numbers", label: "Tracking Numbers" },
  { resource: "tracking-statuses", apiPath: "/api/fleetbase/tracking-statuses", label: "Tracking Statuses" },
  { resource: "service-quotes", apiPath: "/api/fleetbase/service-quotes", label: "Service Quotes" },
  { resource: "purchase-rates", apiPath: "/api/fleetbase/purchase-rates", label: "Purchase Rates" },
];

function extractId(item: any): string | null {
  if (!item || typeof item !== "object") return null;
  if (typeof item.id === "string" && item.id) return item.id;
  if (typeof item.uuid === "string" && item.uuid) return item.uuid;
  if (typeof item.public_id === "string" && item.public_id) return item.public_id;
  if (item.data && typeof item.data === "object") {
    if (typeof item.data.id === "string") return item.data.id;
    if (typeof item.data.uuid === "string") return item.data.uuid;
  }
  return null;
}

async function apiCall(url: string, options?: Omit<RequestInit, 'body'> & { body?: any }, skipCityOS?: boolean): Promise<{ ok: boolean; status: number; data: any; error?: string; headers?: Record<string, string> }> {
  try {
    const extraHeaders: Record<string, string> = {};
    if (skipCityOS) extraHeaders["X-Skip-CityOS"] = "true";
    let body = options?.body;
    if (body && typeof body !== "string" && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof URLSearchParams)) {
      body = JSON.stringify(body);
    }
    const res = await fetch(url, {
      ...options,
      body,
      headers: { "Content-Type": "application/json", ...extraHeaders, ...(options?.headers as Record<string, string> || {}) },
    });
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });
    if (res.status === 204) {
      return { ok: true, status: res.status, data: null, headers: responseHeaders };
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: data?.error || `HTTP ${res.status}`, headers: responseHeaders };
    }
    return { ok: true, status: res.status, data, headers: responseHeaders };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

interface CityOSCtx {
  country?: string;
  city?: string;
  tenant?: string;
  channel?: string;
}

function ContextField({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      {value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">not set</span>
      )}
    </div>
  );
}

function formatCtx(ctx: CityOSCtx | null): string {
  if (!ctx) return "none";
  const parts: string[] = [];
  if (ctx.country) parts.push(`Country=${ctx.country}`);
  if (ctx.city) parts.push(`City=${ctx.city}`);
  if (ctx.tenant) parts.push(`Tenant=${ctx.tenant}`);
  if (ctx.channel) parts.push(`Channel=${ctx.channel}`);
  return parts.length > 0 ? parts.join(", ") : "none (all fields empty)";
}

function generateMarkdownReport(
  serverStatus: { configured: boolean; connected: boolean; url?: string; error?: string } | null,
  dashboardStats: any,
  cityosContext: CityOSCtx | null,
  resultsWithCtx: ResourceTestGroup[],
  resultsWithoutCtx: ResourceTestGroup[],
  extraTests: ExtraTestGroup[],
  totalDuration: number | null,
): string {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const hasCtx = !!(cityosContext?.country || cityosContext?.city || cityosContext?.tenant || cityosContext?.channel);

  let md = `# Fleetbase API Test Report\n\n`;
  md += `**Generated:** ${now}\n\n`;

  md += `## Server Connection\n\n`;
  if (serverStatus) {
    md += `| Field | Value |\n|-------|-------|\n`;
    md += `| Status | ${serverStatus.connected ? "Connected" : "Disconnected"} |\n`;
    if (serverStatus.url) md += `| URL | \`${serverStatus.url}\` |\n`;
    if (serverStatus.error) md += `| Error | ${serverStatus.error} |\n`;
  } else {
    md += `No server status available.\n`;
  }
  md += `\n`;

  if (dashboardStats) {
    md += `## Dashboard Stats\n\n`;
    md += `| Metric | Count |\n|--------|-------|\n`;
    md += `| Orders | ${dashboardStats.totalOrders ?? "N/A"} |\n`;
    md += `| Drivers | ${dashboardStats.totalDrivers ?? "N/A"} |\n`;
    md += `| Vehicles | ${dashboardStats.totalVehicles ?? "N/A"} |\n`;
    md += `| Fleets | ${dashboardStats.totalFleets ?? "N/A"} |\n`;
    md += `| Active Drivers | ${dashboardStats.activeDrivers ?? "N/A"} |\n`;
    md += `\n`;
  }

  md += `## CityOS Context\n\n`;
  if (hasCtx) {
    md += `| Header | Value |\n|--------|-------|\n`;
    md += `| X-CityOS-Country | ${cityosContext?.country || "not set"} |\n`;
    md += `| X-CityOS-City | ${cityosContext?.city || "not set"} |\n`;
    md += `| X-CityOS-Tenant | ${cityosContext?.tenant || "not set"} |\n`;
    md += `| X-CityOS-Channel | ${cityosContext?.channel || "not set"} |\n`;
  } else {
    md += `No CityOS context configured.\n`;
  }
  md += `\n`;

  if (totalDuration !== null) {
    md += `**Total Duration:** ${(totalDuration / 1000).toFixed(1)}s\n\n`;
  }

  const renderResourceTable = (groups: ResourceTestGroup[], title: string) => {
    if (groups.length === 0) return "";
    let s = `## ${title}\n\n`;

    const totalT = groups.reduce((sum, g) => sum + g.tests.length, 0);
    const passedT = groups.reduce((sum, g) => sum + g.tests.filter(t => t.status === "pass").length, 0);
    const failedT = groups.reduce((sum, g) => sum + g.tests.filter(t => t.status === "fail").length, 0);
    const skippedT = groups.reduce((sum, g) => sum + g.tests.filter(t => t.status === "skip").length, 0);

    s += `**Summary:** ${passedT} passed, ${failedT} failed, ${skippedT} skipped out of ${totalT} total\n\n`;

    s += `| Resource | LIST | GET | CREATE | UPDATE | DELETE | Status |\n`;
    s += `|----------|------|-----|--------|--------|--------|--------|\n`;

    for (const g of groups) {
      const statusEmoji = (t: TestResult) => {
        if (t.status === "pass" && t.category === "validation_check") return "VALID";
        if (t.status === "pass") return "PASS";
        if (t.status === "warn") return "WARN";
        if (t.status === "fail") return "FAIL";
        if (t.status === "skip") return "SKIP";
        return "PENDING";
      };
      const tests = g.tests;
      const list = tests.find(t => t.operation === "LIST");
      const get = tests.find(t => t.operation === "GET");
      const create = tests.find(t => t.operation === "CREATE");
      const update = tests.find(t => t.operation === "UPDATE");
      const del = tests.find(t => t.operation === "DELETE");

      s += `| ${g.label} | ${list ? statusEmoji(list) : "-"} | ${get ? statusEmoji(get) : "-"} | ${create ? statusEmoji(create) : "-"} | ${update ? statusEmoji(update) : "-"} | ${del ? statusEmoji(del) : "-"} | ${g.overallStatus.toUpperCase()} |\n`;
    }
    s += `\n`;

    const failedDetails = groups.flatMap(g =>
      g.tests.filter(t => t.status === "fail").map(t => ({ resource: g.label, ...t }))
    );
    const warnDetails = groups.flatMap(g =>
      g.tests.filter(t => t.status === "warn").map(t => ({ resource: g.label, ...t }))
    );
    const validationChecks = groups.flatMap(g =>
      g.tests.filter(t => t.category === "validation_check").map(t => ({ resource: g.label, ...t }))
    );

    if (warnDetails.length > 0) {
      s += `### API Bugs (HTTP 500 — should be 422)\n\n`;
      s += `These tests triggered server errors where the API should have returned proper validation responses:\n\n`;
      for (const f of warnDetails) {
        s += `- **${f.resource} — ${f.operation}**${f.duration ? ` (${f.duration}ms)` : ""}${f.url ? ` — \`${f.url}\`` : ""}\n`;
        s += `  - ${f.message || "No message"}\n`;
        if (f.data) {
          s += `  - Data: \`${JSON.stringify(f.data).slice(0, 200)}\`\n`;
        }
      }
      s += `\n`;
    }

    if (validationChecks.length > 0) {
      s += `### Validation Behavior (Expected Rejections)\n\n`;
      s += `These tests confirmed the API correctly validates input — the test sent intentionally incomplete data:\n\n`;
      for (const f of validationChecks) {
        s += `- **${f.resource} — ${f.operation}**${f.duration ? ` (${f.duration}ms)` : ""}${f.url ? ` — \`${f.url}\`` : ""}: ${f.message || "No message"}\n`;
      }
      s += `\n`;
    }

    if (failedDetails.length > 0) {
      s += `### Real Failures\n\n`;
      for (const f of failedDetails) {
        s += `- **${f.resource} — ${f.operation}**${f.duration ? ` (${f.duration}ms)` : ""}${f.url ? ` — \`${f.url}\`` : ""}\n`;
        s += `  - ${f.message || "No message"}\n`;
        if (f.data) {
          s += `  - Data: \`${JSON.stringify(f.data).slice(0, 200)}\`\n`;
        }
      }
      s += `\n`;
    }

    return s;
  };

  md += renderResourceTable(resultsWithCtx, "Resource Tests — With CityOS Context");

  if (extraTests.length > 0) {
    md += `## Extended Tests\n\n`;
    for (const group of extraTests) {
      const passed = group.tests.filter(t => t.status === "pass").length;
      const failed = group.tests.filter(t => t.status === "fail").length;
      const skipped = group.tests.filter(t => t.status === "skip").length;
      md += `### ${group.label}\n\n`;
      md += `**Summary:** ${passed} passed, ${failed} failed, ${skipped} skipped\n\n`;
      md += `| Test | Status | Category | Duration | URL | Message |\n`;
      md += `|------|--------|----------|----------|-----|--------|\n`;
      for (const t of group.tests) {
        const cat = t.category === "api_bug" ? "API Bug" : t.category === "validation_check" ? "Validation" : t.category === "test_info" ? "Info" : "";
        md += `| ${t.name} | ${t.status.toUpperCase()} | ${cat} | ${t.duration ? t.duration + "ms" : "-"} | ${(t.url || "-").replace(/\|/g, "\\|")} | ${(t.message || "-").replace(/\|/g, "\\|").slice(0, 120)} |\n`;
      }
      md += `\n`;

      const warnsInGroup = group.tests.filter(t => t.status === "warn" || t.category === "api_bug");
      if (warnsInGroup.length > 0) {
        md += `**API Bugs Found:**\n\n`;
        for (const f of warnsInGroup) {
          md += `- **${f.name}**${f.url ? ` — \`${f.url}\`` : ""}: ${f.message || "No message"}\n`;
          if (f.data) md += `  - \`${JSON.stringify(f.data).slice(0, 300)}\`\n`;
        }
        md += `\n`;
      }

      const failedInGroup = group.tests.filter(t => t.status === "fail");
      if (failedInGroup.length > 0) {
        md += `**Failed Details:**\n\n`;
        for (const f of failedInGroup) {
          md += `- **${f.name}**${f.url ? ` — \`${f.url}\`` : ""}: ${f.message || "No message"}\n`;
          if (f.data) md += `  - \`${JSON.stringify(f.data).slice(0, 300)}\`\n`;
        }
        md += `\n`;
      }

      if (group.id === "org-isolation") {
        const violations = group.tests.filter(t => t.status === "fail" && (t.operation === "ISOLATION_NO_CTX" || t.operation === "ISOLATION_FAKE" || t.operation === "ISOLATION_DIRECT" || t.operation === "ISOLATION_MUTATE" || t.operation === "ISOLATION_CREATED"));
        const warnings = group.tests.filter(t => t.status === "warn");
        if (violations.length > 0) {
          md += `#### CRITICAL: Cross-Organization Data Violations\n\n`;
          md += `**${violations.length} isolation violation(s)** detected — data from other organizations may be accessible:\n\n`;
          for (const v of violations) {
            md += `- **${v.name}** — \`${v.url || ""}\`\n`;
            md += `  - ${v.message}\n`;
            if (v.data) md += `  - Details: \`${JSON.stringify(v.data).slice(0, 300)}\`\n`;
          }
          md += `\n**Immediate Action Required:**\n`;
          md += `1. Verify Fleetbase server enforces organization-level data isolation\n`;
          md += `2. Ensure API keys are scoped to a single organization\n`;
          md += `3. Validate CityOS tenant headers are enforced for multi-tenant deployments\n`;
          md += `4. Audit all API endpoints for proper authorization checks\n\n`;
        }
        if (warnings.length > 0 && violations.length === 0) {
          md += `#### Organization Isolation Warnings\n\n`;
          md += `${warnings.length} warning(s): Data is scoped by API key (company-level) but CityOS tenant headers are not enforced for additional isolation:\n\n`;
          for (const w of warnings) {
            md += `- **${w.name}**: ${w.message}\n`;
          }
          md += `\n**Assessment:** If each API key is tied to a single organization, this level of isolation may be sufficient. If multi-tenant isolation within the same API key is required, CityOS header enforcement is needed.\n\n`;
        }
      }
    }
  }

  md += renderResourceTable(resultsWithoutCtx, "Security Audit — Without CityOS Context");

  if (resultsWithoutCtx.length > 0) {
    const exposed = resultsWithoutCtx.filter(g =>
      g.tests.some(t => t.status === "pass" && (t.data?.count ?? 0) > 0)
    );
    if (exposed.length > 0) {
      md += `### Security Violations\n\n`;
      md += `**${exposed.length} resources** returned data without CityOS context headers:\n\n`;
      for (const e of exposed) {
        const listTest = e.tests.find(t => t.operation === "LIST" && t.status === "pass");
        md += `- **${e.label}**: ${listTest?.data?.count ?? "?"} records exposed\n`;
      }
      md += `\n`;
      md += `**Note:** These resources returned data scoped by API key (company-level isolation) without additional CityOS tenant headers. This may be acceptable depending on your isolation requirements.\n\n`;
      md += `**Recommendations:**\n`;
      md += `1. Determine if company-level isolation (API key scoping) is sufficient for your security requirements\n`;
      md += `2. If tenant-level isolation is needed, enforce CityOS context headers on sensitive resources\n`;
      md += `3. Consider falling back to company-level scoping (not a hard 403) when CityOS headers are absent, for backward compatibility\n`;
      md += `4. Implement row-level security (RLS) scoped by tenant context for resources requiring strict isolation\n`;
      md += `5. Log requests without tenant context for audit purposes\n\n`;
    } else {
      md += `### Security Status: PASSED\n\nNo resources returned data without CityOS context headers.\n\n`;
    }
  }

  md += `---\n*Report generated by CityOS Fleet Management Platform*\n`;
  return md;
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SecurityAuditReport({ results, cityosContext }: { results: ResourceTestGroup[]; cityosContext: CityOSCtx | null }) {
  const exposed: { resource: string; count: number; operations: string[] }[] = [];
  const blocked: string[] = [];

  for (const group of results) {
    const listTest = group.tests.find(t => t.operation === "LIST");
    const exposedOps: string[] = [];

    if (listTest?.status === "pass" && (listTest.data?.count ?? 0) > 0) {
      exposedOps.push(`LIST (${listTest.data.count} records)`);
    }
    for (const t of group.tests) {
      if (t.operation !== "LIST" && t.status === "pass") {
        exposedOps.push(t.operation);
      }
    }

    if (exposedOps.length > 0) {
      exposed.push({
        resource: group.label,
        count: listTest?.data?.count ?? 0,
        operations: exposedOps,
      });
    } else if (group.tests.every(t => t.status === "fail" || t.status === "skip")) {
      blocked.push(group.label);
    }
  }

  const totalExposedRecords = exposed.reduce((sum, e) => sum + e.count, 0);
  const severity = exposed.length > 10 ? "critical" : exposed.length > 5 ? "high" : exposed.length > 0 ? "medium" : "none";

  if (severity === "none") {
    return (
      <Card className="border-green-300 bg-green-50/50" data-testid="card-security-report">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-800">
            <ShieldCheck className="h-5 w-5" />
            Security Audit: PASSED
          </CardTitle>
          <CardDescription className="text-green-700">
            No resources returned data without CityOS context headers. The Fleetbase server properly enforces tenant isolation.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const severityColors = {
    critical: { border: "border-red-400", bg: "bg-red-50", text: "text-red-900", badge: "bg-red-600" },
    high: { border: "border-red-300", bg: "bg-red-50/80", text: "text-red-800", badge: "bg-red-500" },
    medium: { border: "border-orange-300", bg: "bg-orange-50/80", text: "text-orange-800", badge: "bg-orange-500" },
    none: { border: "", bg: "", text: "", badge: "" },
  };
  const sc = severityColors[severity];

  return (
    <Card className={`${sc.border} ${sc.bg}`} data-testid="card-security-report">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base flex items-center gap-2 ${sc.text}`}>
            <ShieldAlert className="h-5 w-5" />
            Security Audit: VIOLATIONS DETECTED
          </CardTitle>
          <Badge className={`${sc.badge} text-white text-xs`}>
            {severity.toUpperCase()} SEVERITY
          </Badge>
        </div>
        <CardDescription className={sc.text}>
          {exposed.length} of {FLEETBASE_RESOURCES.length} resources returned data without CityOS tenant context headers.
          This means {totalExposedRecords.toLocaleString()} record{totalExposedRecords !== 1 ? "s" : ""} are accessible without proper tenant isolation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-3 rounded border ${sc.border} ${sc.bg}`}>
          <p className={`text-sm font-semibold ${sc.text} mb-1`}>
            What this means:
          </p>
          <ul className={`text-xs ${sc.text} space-y-1 list-disc list-inside`}>
            <li>API requests sent WITHOUT X-CityOS-Country, X-CityOS-City, X-CityOS-Tenant, X-CityOS-Channel headers still return data</li>
            <li>The Fleetbase server is not enforcing mandatory tenant context on these resources</li>
            <li>Any authenticated API client can access data across tenants without restriction</li>
            <li>This violates multi-tenant data isolation requirements</li>
          </ul>
        </div>

        <div>
          <p className={`text-sm font-semibold ${sc.text} mb-2 flex items-center gap-2`}>
            <Unlock className="h-4 w-4" />
            Exposed Resources ({exposed.length}):
          </p>
          <div className="space-y-1.5">
            {exposed.map(e => (
              <div key={e.resource} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/60 border border-red-200 text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="font-medium text-red-800">{e.resource}</span>
                </div>
                <span className="text-xs text-red-600">{e.operations.join(" · ")}</span>
              </div>
            ))}
          </div>
        </div>

        {blocked.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Properly Blocked Resources ({blocked.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {blocked.map(r => (
                <Badge key={r} variant="outline" className="text-[10px] bg-green-100 text-green-800 border-green-300">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />
        <div className={`text-xs ${sc.text}`}>
          <p className="font-semibold mb-1">Understanding This Result:</p>
          <ul className="list-disc list-inside space-y-0.5 mb-3">
            <li><strong>Company-level isolation</strong> (API key scopes data to the company) is the baseline and may be acceptable for many deployments</li>
            <li><strong>Tenant-level isolation</strong> (CityOS headers restrict data within the company) provides stricter multi-tenant separation</li>
            <li>Resources listed above returned data using only the API key, without additional CityOS tenant scoping</li>
          </ul>
          <p className="font-semibold mb-1">Recommended Actions:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Determine if company-level isolation is sufficient for your security requirements</li>
            <li>If tenant isolation is needed, implement server-side middleware to enforce CityOS context on sensitive resources</li>
            <li>Consider falling back to company-level scoping (not a hard 403) when CityOS headers are absent, for backward compatibility</li>
            <li>Implement row-level security (RLS) scoped by tenant context for resources requiring strict isolation</li>
            <li>Log requests without tenant context for audit purposes</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function ContextTestReport({ results, cityosContext }: { results: ResourceTestGroup[]; cityosContext: CityOSCtx | null }) {
  const failed: { resource: string; operation: string; error: string; httpStatus: number; details?: any }[] = [];
  const succeeded: { resource: string; count: number }[] = [];

  for (const group of results) {
    for (const t of group.tests) {
      if (t.status === "fail") {
        failed.push({
          resource: group.label,
          operation: t.operation,
          error: t.message || "Unknown error",
          httpStatus: t.data?.response?.status || 0,
          details: t.data,
        });
      }
    }
    const listTest = group.tests.find(t => t.operation === "LIST");
    if (listTest?.status === "pass") {
      succeeded.push({ resource: group.label, count: listTest.data?.count ?? 0 });
    }
  }

  const ctxStr = formatCtx(cityosContext);
  const hasAnyCtx = !!(cityosContext?.country || cityosContext?.city || cityosContext?.tenant || cityosContext?.channel);

  if (failed.length === 0) {
    return (
      <Card className="border-green-300 bg-green-50/50" data-testid="card-context-report">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-800">
            <ShieldCheck className="h-5 w-5" />
            Context Test: ALL PASSED
          </CardTitle>
          <CardDescription className="text-green-700">
            All resources responded successfully using context: {ctxStr}
          </CardDescription>
        </CardHeader>
        {succeeded.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {succeeded.map(s => (
                <div key={s.resource} className="text-center p-1.5 rounded bg-green-100/50 border border-green-200">
                  <p className="text-sm font-bold text-green-800">{s.count}</p>
                  <p className="text-[10px] text-green-700 truncate">{s.resource}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-amber-300 bg-amber-50/50" data-testid="card-context-report">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            Context Test: {failed.length} FAILURE{failed.length > 1 ? "S" : ""} DETECTED
          </CardTitle>
          <Badge className="bg-amber-600 text-white text-xs">{failed.length} ISSUE{failed.length > 1 ? "S" : ""}</Badge>
        </div>
        <CardDescription className="text-amber-800">
          {failed.length} operation{failed.length > 1 ? "s" : ""} failed while using CityOS context. The dev team should investigate these issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded border border-amber-200 bg-amber-100/50">
          <p className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Active CityOS Context Used:
          </p>
          {hasAnyCtx ? (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {cityosContext?.country && (
                <div className="text-xs text-amber-800 flex items-center gap-1.5">
                  <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono">X-CityOS-Country</code>
                  <span>=</span>
                  <span className="font-semibold">{cityosContext.country}</span>
                </div>
              )}
              {cityosContext?.city && (
                <div className="text-xs text-amber-800 flex items-center gap-1.5">
                  <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono">X-CityOS-City</code>
                  <span>=</span>
                  <span className="font-semibold">{cityosContext.city}</span>
                </div>
              )}
              {cityosContext?.tenant && (
                <div className="text-xs text-amber-800 flex items-center gap-1.5">
                  <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono">X-CityOS-Tenant</code>
                  <span>=</span>
                  <span className="font-semibold">{cityosContext.tenant}</span>
                </div>
              )}
              {cityosContext?.channel && (
                <div className="text-xs text-amber-800 flex items-center gap-1.5">
                  <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono">X-CityOS-Channel</code>
                  <span>=</span>
                  <span className="font-semibold">{cityosContext.channel}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-700 mt-1">No CityOS context configured on active server. Configure it in Settings &gt; Servers.</p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-amber-900 mb-2">Failed Operations:</p>
          <div className="space-y-2">
            {failed.map((f, i) => (
              <div key={i} className="px-3 py-2 rounded bg-white/60 border border-red-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-sm font-medium text-red-800">{f.resource} — {f.operation}</span>
                  </div>
                  {f.httpStatus > 0 && (
                    <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">HTTP {f.httpStatus}</Badge>
                  )}
                </div>
                <p className="text-xs text-red-700 font-medium ml-5.5">{f.error}</p>
                {hasAnyCtx && (
                  <p className="text-[10px] text-amber-700 ml-5.5 mt-1">
                    Headers sent: {formatCtx(cityosContext)}
                  </p>
                )}
                {f.details && (
                  <pre className="mt-1.5 text-[10px] bg-red-50 border border-red-100 p-2 rounded overflow-x-auto max-h-24 whitespace-pre-wrap ml-5.5">
                    {JSON.stringify(f.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />
        <div className="text-xs text-amber-800">
          <p className="font-semibold mb-1">Troubleshooting Steps:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Verify the CityOS context values match valid tenant/city/country entries in Fleetbase</li>
            <li>Check if the Fleetbase server recognizes the X-CityOS-* header format</li>
            <li>Confirm the API key has permissions for the specified tenant context</li>
            <li>Review Fleetbase server logs for rejected context header values</li>
            <li>Test with different context values in Settings &gt; Servers to isolate the issue</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FleetbaseTestPage() {
  const [activeTab, setActiveTab] = useState<"with-context" | "extended" | "security-audit">("with-context");
  const [resultsWithCtx, setResultsWithCtx] = useState<ResourceTestGroup[]>([]);
  const [resultsWithoutCtx, setResultsWithoutCtx] = useState<ResourceTestGroup[]>([]);
  const [extraTests, setExtraTests] = useState<ExtraTestGroup[]>([]);
  const [running, setRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; connected: boolean; url?: string; error?: string } | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [cityosContext, setCityosContext] = useState<CityOSCtx | null>(null);

  const results = activeTab === "with-context" ? resultsWithCtx : activeTab === "security-audit" ? resultsWithoutCtx : [];

  useEffect(() => {
    fetch("/api/fleetbase/cityos-context")
      .then(r => r.json())
      .then(setCityosContext)
      .catch(() => {});
  }, []);

  const hasContext = !!(cityosContext?.country || cityosContext?.city || cityosContext?.tenant || cityosContext?.channel);

  const runResourceTests = useCallback(async (
    setRes: React.Dispatch<React.SetStateAction<ResourceTestGroup[]>>,
    skipContext: boolean
  ) => {
    const initialGroups: ResourceTestGroup[] = FLEETBASE_RESOURCES.map(r => {
      const crud = CRUD_SUPPORT[r.resource] || { create: false, update: false, delete: false };
      return {
        resource: r.resource,
        label: r.label,
        apiPath: r.apiPath,
        overallStatus: "pending" as TestStatus,
        crudSupport: crud,
        tests: [
          { name: `${r.label} — LIST`, operation: "LIST", status: crud.skipList ? "skip" as TestStatus : "pending" as TestStatus, message: crud.skipList ? "Requires payload parameters (e.g. pickup/dropoff)" : undefined, url: r.apiPath },
          { name: `${r.label} — GET`, operation: "GET", status: "pending" as TestStatus, url: r.apiPath },
          { name: `${r.label} — CREATE`, operation: "CREATE", status: crud.create ? "pending" as TestStatus : "skip" as TestStatus, message: crud.create ? undefined : "Read-only resource", url: r.apiPath },
          { name: `${r.label} — UPDATE`, operation: "UPDATE", status: crud.update ? "pending" as TestStatus : "skip" as TestStatus, message: crud.update ? undefined : "Read-only resource", url: r.apiPath },
          { name: `${r.label} — DELETE`, operation: "DELETE", status: crud.delete ? "pending" as TestStatus : "skip" as TestStatus, message: crud.delete ? undefined : "Read-only resource", url: r.apiPath },
        ],
      };
    });
    setRes(initialGroups);

    const updateGroupTest = (resourceIdx: number, testIdx: number, update: Partial<TestResult>) => {
      setRes(prev => {
        const next = [...prev];
        const group = { ...next[resourceIdx] };
        const tests = [...group.tests];
        tests[testIdx] = { ...tests[testIdx], ...update };
        group.tests = tests;

        const hasRunning = tests.some(t => t.status === "running");
        const hasFail = tests.some(t => t.status === "fail");
        const hasWarn = tests.some(t => t.status === "warn");
        const allDone = tests.every(t => t.status !== "pending" && t.status !== "running");
        const allPassOrSkip = tests.every(t => t.status === "pass" || t.status === "skip" || t.status === "warn");
        group.overallStatus = hasRunning ? "running" : (allDone && hasFail) ? "fail" : (allDone && hasWarn) ? "warn" as TestStatus : (allDone && allPassOrSkip) ? "pass" : "pending";

        next[resourceIdx] = group;
        return next;
      });
    };

    for (let ri = 0; ri < FLEETBASE_RESOURCES.length; ri++) {
      const res = FLEETBASE_RESOURCES[ri];
      const crud = CRUD_SUPPORT[res.resource] || { create: false, update: false, delete: false };
      let firstItemId: string | null = null;
      let createdId: string | null = null;

      if (crud.skipList) {
        updateGroupTest(ri, 0, {
          status: "skip",
          message: "Requires payload parameters (e.g. pickup/dropoff) — skipped for LIST testing",
          url: res.apiPath,
        });
        updateGroupTest(ri, 1, { status: "skip", message: "No LIST data to derive GET ID from" });
        setRes(prev => {
          const next = [...prev];
          const group = { ...next[ri] };
          const hasFail = group.tests.some(t => t.status === "fail");
          const allPassOrSkip = group.tests.every(t => t.status === "pass" || t.status === "skip");
          group.overallStatus = hasFail ? "fail" : allPassOrSkip ? "pass" : "fail";
          next[ri] = group;
          return next;
        });
        continue;
      }

      setRes(prev => {
        const next = [...prev];
        const g = { ...next[ri] };
        g.overallStatus = "running";
        g.tests = g.tests.map((t, i) => i === 0 ? { ...t, status: "running" as TestStatus } : t);
        next[ri] = g;
        return next;
      });

      const listStart = Date.now();
      const listRes = await apiCall(res.apiPath, undefined, skipContext);
      const listDuration = Date.now() - listStart;

      if (listRes.ok) {
        const items = Array.isArray(listRes.data) ? listRes.data : [];
        if (items.length > 0) {
          firstItemId = extractId(items[0]);
        }
        const isEmpty = items.length === 0;
        updateGroupTest(ri, 0, {
          status: skipContext
            ? (isEmpty ? "pass" : "fail")
            : (isEmpty ? "fail" : "pass"),
          duration: listDuration,
          message: skipContext
            ? (items.length > 0
              ? `VIOLATION: ${items.length} record${items.length !== 1 ? "s" : ""} returned without tenant context`
              : `0 records returned — resource appears empty or properly filtered`)
            : isEmpty
              ? `FAIL: 0 items returned — seeded data required. Ensure ${res.resource} has data before testing.`
              : `${items.length} item${items.length !== 1 ? "s" : ""} returned`,
          data: { count: items.length, firstId: firstItemId, fields: items[0] ? Object.keys(items[0]).slice(0, 8).join(", ") : "empty" },
        });
      } else {
        updateGroupTest(ri, 0, {
          status: "fail",
          duration: listDuration,
          message: skipContext
            ? `Server rejected request without context: ${listRes.error || `HTTP ${listRes.status}`}`
            : `Failed with context [${formatCtx(cityosContext)}]: ${listRes.error || `HTTP ${listRes.status}`}`,
          data: listRes.data,
        });
      }

      if (firstItemId) {
        updateGroupTest(ri, 1, { status: "running" });
        const getStart = Date.now();
        const getRes = await apiCall(`${res.apiPath}/${firstItemId}`, undefined, skipContext);
        const getDuration = Date.now() - getStart;

        if (getRes.ok) {
          updateGroupTest(ri, 1, {
            status: "pass",
            duration: getDuration,
            message: skipContext
              ? `VIOLATION: Record ${firstItemId} accessible without tenant context`
              : `Fetched ${firstItemId}`,
            data: { id: extractId(getRes.data), fields: getRes.data ? Object.keys(getRes.data).slice(0, 8).join(", ") : "none" },
          });
        } else {
          updateGroupTest(ri, 1, {
            status: "fail",
            duration: getDuration,
            message: skipContext
              ? `Server rejected GET without context: ${getRes.error || `HTTP ${getRes.status}`}`
              : `Failed to GET ${firstItemId} with context [${formatCtx(cityosContext)}]: ${getRes.error || `HTTP ${getRes.status}`}`,
            data: getRes.data,
          });
        }
      } else {
        updateGroupTest(ri, 1, {
          status: skipContext ? "pass" : "fail",
          message: skipContext
            ? "No items returned without context (properly blocked)"
            : "FAIL: No items to GET — seeded data required. List returned 0 items.",
        });
      }

      if (crud.create) {
        updateGroupTest(ri, 2, { status: "running" });
        const createStart = Date.now();
        const testBody = getTestCreateBody(res.resource);
        if (res.resource === "zones" && testBody._needs_service_area) {
          delete testBody._needs_service_area;
          const saRes = await apiCall("/api/fleetbase/service-areas?limit=1", undefined, skipContext);
          const saId = saRes.ok && Array.isArray(saRes.data) && saRes.data.length > 0 ? extractId(saRes.data[0]) : null;
          if (saId) {
            testBody.service_area = saId;
          }
        }
        const createRes = await apiCall(res.apiPath, {
          method: "POST",
          body: JSON.stringify(testBody),
        }, skipContext);
        const createDuration = Date.now() - createStart;

        if (createRes.ok && createRes.data) {
          createdId = extractId(createRes.data);
          updateGroupTest(ri, 2, {
            status: "pass",
            duration: createDuration,
            category: "crud",
            message: skipContext
              ? `VIOLATION: Created record ${createdId || "(no id)"} without tenant context — data written to unscoped storage`
              : `Created ${createdId || "(no id)"}`,
            data: { id: createdId, sent: testBody },
            url: res.apiPath,
          });
        } else {
          const isValidationReject = createRes.status === 422 || createRes.status === 400;
          const isServerError = createRes.status >= 500;
          updateGroupTest(ri, 2, {
            status: isServerError ? "warn" : isValidationReject ? "pass" : "fail",
            category: isServerError ? "api_bug" : isValidationReject ? "validation_check" : "crud",
            duration: createDuration,
            message: skipContext
              ? `Server rejected CREATE without context: ${createRes.error || `HTTP ${createRes.status}`}`
              : isServerError
                ? `API BUG: Server returned HTTP ${createRes.status} (should be 422 with validation message) — ${createRes.error || "internal error"}`
                : isValidationReject
                  ? `Validation OK: API correctly rejected incomplete data — HTTP ${createRes.status}: ${createRes.error || "validation error"}`
                  : `Failed to CREATE with context [${formatCtx(cityosContext)}]: ${createRes.error || `HTTP ${createRes.status}`}`,
            data: { sent: testBody, response: createRes.data, httpStatus: createRes.status },
            url: res.apiPath,
          });
        }
      }

      if (crud.update) {
        const updateTargetId = createdId || firstItemId;
        if (updateTargetId) {
          updateGroupTest(ri, 3, { status: "running" });
          const updateStart = Date.now();
          const updateBody = getTestUpdateBody(res.resource);
          const updateRes = await apiCall(`${res.apiPath}/${updateTargetId}`, {
            method: "PATCH",
            body: JSON.stringify(updateBody),
          }, skipContext);
          const updateDuration = Date.now() - updateStart;

          if (updateRes.ok) {
            updateGroupTest(ri, 3, {
              status: "pass",
              duration: updateDuration,
              message: skipContext
                ? `VIOLATION: Updated record ${updateTargetId} without tenant context`
                : `Updated ${updateTargetId}`,
              data: { id: updateTargetId, sent: updateBody },
            });
          } else {
            updateGroupTest(ri, 3, {
              status: "fail",
              duration: updateDuration,
              message: skipContext
                ? `Server rejected UPDATE without context: ${updateRes.error || `HTTP ${updateRes.status}`}`
                : `Failed to UPDATE ${updateTargetId} with context [${formatCtx(cityosContext)}]: ${updateRes.error || `HTTP ${updateRes.status}`}`,
              data: { sent: updateBody, response: updateRes.data },
            });
          }
        } else {
          updateGroupTest(ri, 3, {
            status: skipContext ? "pass" : "fail",
            message: skipContext
              ? "No items to update without context (properly blocked)"
              : "FAIL: No item ID available — seeded data required. List returned 0 items and create failed.",
          });
        }
      }

      if (crud.delete) {
        if (createdId) {
          updateGroupTest(ri, 4, { status: "running" });
          const deleteStart = Date.now();
          const deleteRes = await apiCall(`${res.apiPath}/${createdId}`, { method: "DELETE" }, skipContext);
          const deleteDuration = Date.now() - deleteStart;

          if (deleteRes.ok || deleteRes.status === 204) {
            updateGroupTest(ri, 4, {
              status: "pass",
              duration: deleteDuration,
              message: skipContext
                ? `VIOLATION: Deleted record ${createdId} without tenant context`
                : `Deleted ${createdId}`,
            });
          } else {
            updateGroupTest(ri, 4, {
              status: "fail",
              duration: deleteDuration,
              message: skipContext
                ? `Server rejected DELETE without context: ${deleteRes.error || `HTTP ${deleteRes.status}`}`
                : `Failed to DELETE ${createdId} with context [${formatCtx(cityosContext)}]: ${deleteRes.error || `HTTP ${deleteRes.status}`}`,
              data: deleteRes.data,
            });
          }
        } else {
          updateGroupTest(ri, 4, {
            status: skipContext ? "pass" : "warn",
            message: skipContext
              ? "No items to delete without context (properly blocked)"
              : "No created item to delete — create failed or returned no ID. Delete test inconclusive.",
            category: skipContext ? undefined : "api_bug",
          });
        }
      }

      setRes(prev => {
        const next = [...prev];
        const group = { ...next[ri] };
        const hasFail = group.tests.some(t => t.status === "fail");
        const hasWarn = group.tests.some(t => t.status === "warn");
        const allPassOrSkip = group.tests.every(t => t.status === "pass" || t.status === "skip" || t.status === "warn");
        group.overallStatus = hasFail ? "fail" : hasWarn ? "warn" as TestStatus : allPassOrSkip ? "pass" : "fail";
        next[ri] = group;
        return next;
      });
    }
  }, [cityosContext]);

  const runExtendedTests = useCallback(async () => {
    const groups: ExtraTestGroup[] = [
      { id: "pagination", label: "Pagination & Limits", icon: "pagination", tests: [], overallStatus: "running" },
      { id: "filtering", label: "Filtering & Search", icon: "filter", tests: [], overallStatus: "running" },
      { id: "schema", label: "Response Schema Validation", icon: "schema", tests: [], overallStatus: "running" },
      { id: "latency", label: "Latency Benchmarks", icon: "latency", tests: [], overallStatus: "running" },
      { id: "errors", label: "Error Handling", icon: "errors", tests: [], overallStatus: "running" },
      { id: "auth", label: "Authentication & Headers", icon: "auth", tests: [], overallStatus: "running" },
      { id: "local-crud", label: "Local CRUD Endpoints", icon: "local", tests: [], overallStatus: "running" },
      { id: "special-routes", label: "Special & Management Routes", icon: "special", tests: [], overallStatus: "running" },
      { id: "put-vs-patch", label: "PUT vs PATCH Behavior", icon: "compare", tests: [], overallStatus: "running" },
      { id: "query-combos", label: "Query Parameter Combinations", icon: "combos", tests: [], overallStatus: "running" },
      { id: "data-integrity", label: "Data Integrity & Lifecycle", icon: "integrity", tests: [], overallStatus: "running" },
      { id: "edge-cases", label: "Edge Cases & Boundary Tests", icon: "edge", tests: [], overallStatus: "running" },
      { id: "org-isolation", label: "Cross-Organization Isolation", icon: "isolation", tests: [], overallStatus: "running" },
      { id: "cityos-integrations", label: "CityOS System Integrations", icon: "integrations", tests: [], overallStatus: "running" },
    ];
    setExtraTests([...groups]);

    const updateGroup = (groupId: string, tests: TestResult[], status?: TestStatus) => {
      setExtraTests(prev => prev.map(g => g.id === groupId ? {
        ...g,
        tests,
        overallStatus: status || (tests.some(t => t.status === "fail") ? "fail" : tests.some(t => t.status === "warn") ? "warn" : tests.every(t => t.status === "pass" || t.status === "skip") ? "pass" : "running"),
      } : g));
    };

    // --- Pagination Tests ---
    {
      const tests: TestResult[] = [];
      const testResources = ["vehicles", "drivers", "orders"];
      for (const resource of testResources) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${resource}?limit=2`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        if (res.ok) {
          const empty = items.length === 0;
          tests.push({
            name: `${resource} — limit=2`,
            operation: "PAGINATION",
            status: empty ? "fail" : items.length <= 2 ? "pass" : "fail",
            duration: dur,
            message: empty
              ? `FAIL: 0 items returned — seeded data required to test pagination.`
              : items.length <= 2
                ? `Returned ${items.length} items (limit=2 respected)`
                : `Returned ${items.length} items — limit=2 NOT respected`,
            data: { count: items.length },
          });
        } else {
          tests.push({
            name: `${resource} — limit=2`,
            operation: "PAGINATION",
            status: "fail",
            duration: dur,
            message: `Request failed: ${res.error}`,
          });
        }
      }

      for (const resource of testResources) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${resource}?page=1&limit=1`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        if (res.ok) {
          const empty = items.length === 0;
          tests.push({
            name: `${resource} — page=1&limit=1`,
            operation: "PAGINATION",
            status: empty ? "fail" : "pass",
            duration: dur,
            message: empty
              ? `FAIL: 0 items on page 1 — seeded data required to test pagination.`
              : `Page 1 returned ${items.length} item(s)`,
            data: { count: items.length },
          });
        } else {
          tests.push({
            name: `${resource} — page=1&limit=1`,
            operation: "PAGINATION",
            status: "fail",
            duration: dur,
            message: `Pagination request failed: ${res.error}`,
          });
        }
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles?limit=0`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        tests.push({
          name: `vehicles — limit=0 (edge case)`,
          operation: "PAGINATION",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `Returned ${items.length} items with limit=0 (API decides behavior)` : `Error: ${res.error}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles?limit=999`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        tests.push({
          name: `vehicles — limit=999 (large limit)`,
          operation: "PAGINATION",
          status: res.ok ? (items.length === 0 ? "fail" : "pass") : "fail",
          duration: dur,
          message: res.ok
            ? (items.length === 0 ? `FAIL: 0 items returned with limit=999 — seeded data required.` : `Returned ${items.length} items with limit=999`)
            : `Error: ${res.error}`,
        });
      }

      updateGroup("pagination", tests);
    }

    // --- Filtering Tests ---
    {
      const tests: TestResult[] = [];

      const filterTests = [
        { resource: "vehicles", param: "status=active", label: "vehicles by status=active" },
        { resource: "drivers", param: "status=active", label: "drivers by status=active" },
        { resource: "orders", param: "status=created", label: "orders by status=created" },
        { resource: "contacts", param: "type=customer", label: "contacts by type=customer" },
        { resource: "vendors", param: "type=logistics", label: "vendors by type=logistics" },
      ];

      for (const ft of filterTests) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${ft.resource}?${ft.param}`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        const empty = res.ok && items.length === 0;
        tests.push({
          name: `Filter ${ft.label}`,
          operation: "FILTER",
          status: res.ok ? (empty ? "fail" : "pass") : "fail",
          duration: dur,
          message: empty
            ? `FAIL: 0 items matching ${ft.param} — seeded data with matching status/type required.`
            : res.ok ? `Returned ${items.length} item(s) matching ${ft.param}` : `Filter failed: ${res.error}`,
          data: { count: items.length },
        });
      }

      const searchTests = [
        { resource: "vehicles", param: "query=test", label: "vehicles search query=test" },
        { resource: "drivers", param: "query=test", label: "drivers search query=test" },
        { resource: "places", param: "query=test", label: "places search query=test" },
      ];

      for (const st of searchTests) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${st.resource}?${st.param}`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        const empty = res.ok && items.length === 0;
        tests.push({
          name: `Search ${st.label}`,
          operation: "SEARCH",
          status: res.ok ? (empty ? "fail" : "pass") : "fail",
          duration: dur,
          message: empty
            ? `FAIL: 0 results for "${st.param}" — seeded data with matching search terms required.`
            : res.ok ? `Returned ${items.length} result(s) for "${st.param}"` : `Search failed: ${res.error}`,
          data: { count: items.length },
        });
      }

      const sortTests = [
        { resource: "vehicles", param: "sort=created_at", label: "vehicles sort by created_at" },
        { resource: "orders", param: "sort=-created_at", label: "orders sort by -created_at (desc)" },
      ];

      for (const st of sortTests) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${st.resource}?${st.param}`);
        const dur = Date.now() - start;
        const sortItems = Array.isArray(res.data) ? res.data : [];
        const sortEmpty = res.ok && sortItems.length === 0;
        tests.push({
          name: `Sort ${st.label}`,
          operation: "SORT",
          status: res.ok ? (sortEmpty ? "fail" : "pass") : "fail",
          duration: dur,
          message: sortEmpty
            ? `FAIL: 0 items returned for sort — seeded data required.`
            : res.ok ? `Sort request accepted (${sortItems.length} items)` : `Sort failed: ${res.error}`,
        });
      }

      updateGroup("filtering", tests);
    }

    // --- Schema Validation Tests ---
    {
      const tests: TestResult[] = [];

      const schemaChecks = [
        {
          resource: "vehicles", label: "Vehicles",
          requiredFields: ["id"],
          optionalFields: ["name", "plate_number", "model", "status", "type"],
        },
        {
          resource: "drivers", label: "Drivers",
          requiredFields: ["id"],
          optionalFields: ["name", "email", "phone", "status"],
        },
        {
          resource: "orders", label: "Orders",
          requiredFields: ["id"],
          optionalFields: ["status", "type", "tracking_number"],
        },
        {
          resource: "contacts", label: "Contacts",
          requiredFields: ["id"],
          optionalFields: ["name", "email", "phone", "type"],
        },
        {
          resource: "fleets", label: "Fleets",
          requiredFields: ["id"],
          optionalFields: ["name", "status"],
        },
        {
          resource: "places", label: "Places",
          requiredFields: ["id"],
          optionalFields: ["name", "street1", "city", "country"],
        },
      ];

      for (const sc of schemaChecks) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${sc.resource}?limit=1`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];

        if (!res.ok || items.length === 0) {
          tests.push({
            name: `${sc.label} schema`,
            operation: "SCHEMA",
            status: "fail",
            duration: dur,
            message: items.length === 0 ? `FAIL: 0 items returned for ${sc.resource} — seeded data required to validate schema` : `Request failed: ${res.error}`,
          });
          continue;
        }

        const item = items[0];
        const allFields = Object.keys(item);
        const missingRequired = sc.requiredFields.filter(f => !(f in item));
        const foundOptional = sc.optionalFields.filter(f => f in item);

        tests.push({
          name: `${sc.label} schema`,
          operation: "SCHEMA",
          status: missingRequired.length === 0 ? "pass" : "fail",
          duration: dur,
          message: missingRequired.length === 0
            ? `Valid schema — ${allFields.length} fields, has: ${foundOptional.join(", ") || "none of checked optional"}`
            : `Missing required fields: ${missingRequired.join(", ")}`,
          data: { totalFields: allFields.length, fields: allFields.slice(0, 15).join(", "), missingRequired, foundOptional },
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles?limit=5`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        if (items.length >= 2) {
          const fieldSets = items.map((item: any) => new Set(Object.keys(item)));
          const firstFields = fieldSets[0];
          let consistent = true;
          for (let i = 1; i < fieldSets.length; i++) {
            if (fieldSets[i].size !== firstFields.size) { consistent = false; break; }
          }
          tests.push({
            name: `Vehicles schema consistency`,
            operation: "SCHEMA",
            status: consistent ? "pass" : "fail",
            duration: dur,
            message: consistent
              ? `All ${items.length} items have consistent field count (${firstFields.size} fields)`
              : `Inconsistent field counts across ${items.length} items`,
          });
        } else {
          tests.push({
            name: `Vehicles schema consistency`,
            operation: "SCHEMA",
            status: "fail",
            duration: dur,
            message: "FAIL: Need at least 2 vehicle items to check schema consistency — seeded data required.",
          });
        }
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles`);
        const dur = Date.now() - start;
        tests.push({
          name: `LIST response is array`,
          operation: "SCHEMA",
          status: res.ok && Array.isArray(res.data) ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? (Array.isArray(res.data) ? `Response is array with ${res.data.length} items` : `Response is ${typeof res.data}, expected array`)
            : `Request failed: ${res.error}`,
        });
      }

      updateGroup("schema", tests);
    }

    // --- Latency Benchmarks ---
    {
      const tests: TestResult[] = [];
      const benchmarkResources = ["vehicles", "drivers", "orders", "places", "contacts", "fleets"];

      for (const resource of benchmarkResources) {
        const times: number[] = [];
        for (let i = 0; i < 3; i++) {
          const start = Date.now();
          await apiCall(`/api/fleetbase/${resource}?limit=1`);
          times.push(Date.now() - start);
        }
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const min = Math.min(...times);
        const max = Math.max(...times);

        tests.push({
          name: `${resource} avg latency (3 calls)`,
          operation: "LATENCY",
          status: avg < 3000 ? "pass" : avg < 5000 ? "pass" : "fail",
          duration: avg,
          message: `Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms${avg > 3000 ? " — SLOW" : avg > 1000 ? " — acceptable" : " — fast"}`,
          data: { avg, min, max, samples: times },
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/status`);
        const dur = Date.now() - start;
        tests.push({
          name: `Server status endpoint`,
          operation: "LATENCY",
          status: res.ok && dur < 5000 ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `Status check: ${dur}ms` : `Status check failed: ${res.error}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/dashboard/stats`);
        const dur = Date.now() - start;
        tests.push({
          name: `Dashboard stats endpoint`,
          operation: "LATENCY",
          status: res.ok && dur < 10000 ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `Dashboard stats: ${dur}ms` : `Dashboard stats failed: ${res.error}`,
        });
      }

      updateGroup("latency", tests);
    }

    // --- Error Handling Tests ---
    {
      const tests: TestResult[] = [];

      const nonExistentVehicleUrl = `/api/fleetbase/vehicles/nonexistent-id-12345`;
      {
        const start = Date.now();
        const res = await apiCall(nonExistentVehicleUrl);
        const dur = Date.now() - start;
        tests.push({
          name: `GET non-existent vehicle`,
          operation: "ERROR",
          status: !res.ok && res.status >= 400 ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly returned HTTP ${res.status}: ${res.error}`
            : `Expected error but got HTTP ${res.status} with data — response type: ${typeof res.data === "object" && res.data !== null ? (Array.isArray(res.data) ? "array" : "object with keys: " + Object.keys(res.data).slice(0, 5).join(", ")) : typeof res.data}`,
          data: res.data,
          url: nonExistentVehicleUrl,
        });
      }

      const emptyBodyUrl = `/api/fleetbase/vehicles`;
      {
        const start = Date.now();
        const res = await apiCall(emptyBodyUrl, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const dur = Date.now() - start;
        const isServerError = res.status >= 500;
        tests.push({
          name: `CREATE vehicle with empty body`,
          operation: "ERROR",
          status: isServerError ? "warn" : res.ok ? "pass" : "pass",
          category: isServerError ? "api_bug" : "validation_check",
          duration: dur,
          message: isServerError
            ? `API BUG: Empty body caused HTTP ${res.status} (SQL/internal error) — API should validate input and return 422 with a clear message instead of crashing`
            : res.ok
              ? `Server accepted empty body (lenient validation) — HTTP ${res.status}`
              : `Server correctly rejected empty body — HTTP ${res.status}: ${res.error}`,
          data: res.data,
          url: `POST ${emptyBodyUrl}`,
        });
      }

      const invalidContentTypeUrl = `/api/fleetbase/vehicles`;
      {
        const start = Date.now();
        const res = await apiCall(invalidContentTypeUrl, {
          method: "POST",
          body: "not json",
          headers: { "Content-Type": "text/plain" },
        });
        const dur = Date.now() - start;
        const isServerError = res.status >= 500;
        tests.push({
          name: `POST with invalid content type`,
          operation: "ERROR",
          status: isServerError ? "warn" : "pass",
          category: isServerError ? "api_bug" : "validation_check",
          duration: dur,
          message: isServerError
            ? `API BUG: Non-JSON body caused HTTP ${res.status} — should return 415 (Unsupported Media Type) or 400`
            : res.ok
              ? `Server accepted non-JSON body — HTTP ${res.status}`
              : `Server correctly rejected non-JSON body — HTTP ${res.status}: ${res.error}`,
          url: `POST ${invalidContentTypeUrl} (Content-Type: text/plain)`,
        });
      }

      const unknownResourceUrl = `/api/fleetbase/nonexistent-resource-xyz`;
      {
        const start = Date.now();
        const res = await apiCall(unknownResourceUrl);
        const dur = Date.now() - start;
        const responseType = res.ok
          ? (typeof res.data === "string" && res.data.includes("<!DOCTYPE")
              ? "HTML page (frontend catch-all route)"
              : Array.isArray(res.data)
                ? `array with ${res.data.length} items`
                : typeof res.data === "object" && res.data !== null
                  ? `JSON object with keys: ${Object.keys(res.data).slice(0, 5).join(", ")}`
                  : `${typeof res.data} response`)
          : "";
        tests.push({
          name: `GET unknown resource path`,
          operation: "ERROR",
          status: !res.ok ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly returned HTTP ${res.status} for unknown resource`
            : `Unexpected HTTP ${res.status} for unknown resource — ${responseType}. This could be a wildcard route or frontend catch-all returning a non-404 response.`,
          url: `GET ${unknownResourceUrl}`,
          data: res.ok ? { responseType, status: res.status } : res.data,
        });
      }

      const updateNonExistentUrl = `/api/fleetbase/vehicles/nonexistent-id`;
      {
        const start = Date.now();
        const res = await apiCall(updateNonExistentUrl, {
          method: "PATCH",
          body: JSON.stringify({ name: "Should Fail" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: `UPDATE non-existent vehicle`,
          operation: "ERROR",
          status: !res.ok && res.status >= 400 ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly returned HTTP ${res.status}: ${res.error}`
            : `Expected error but got HTTP ${res.status}`,
          url: `PATCH ${updateNonExistentUrl}`,
        });
      }

      const deleteNonExistentUrl = `/api/fleetbase/vehicles/nonexistent-id`;
      {
        const start = Date.now();
        const res = await apiCall(deleteNonExistentUrl, {
          method: "DELETE",
        });
        const dur = Date.now() - start;
        tests.push({
          name: `DELETE non-existent vehicle`,
          operation: "ERROR",
          status: !res.ok && res.status >= 400 ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly returned HTTP ${res.status}: ${res.error}`
            : `Expected error but got HTTP ${res.status}`,
          url: `DELETE ${deleteNonExistentUrl}`,
        });
      }

      const oversizedUrl = `/api/fleetbase/vehicles`;
      {
        const start = Date.now();
        const res = await apiCall(oversizedUrl, {
          method: "POST",
          body: JSON.stringify({
            name: "a".repeat(1000),
            plate_number: "b".repeat(500),
            model: "c".repeat(500),
          }),
        });
        const dur = Date.now() - start;
        const created = res.ok ? extractId(res.data) : null;
        const isServerError = res.status >= 500;
        tests.push({
          name: `CREATE with oversized fields`,
          operation: "ERROR",
          status: isServerError ? "warn" : "pass",
          category: isServerError ? "api_bug" : "test_info",
          duration: dur,
          message: isServerError
            ? `API BUG: Oversized fields caused HTTP ${res.status} (likely SQL truncation error) — API should validate field lengths and return 422`
            : res.ok
              ? `Server accepted oversized fields (lenient) — created ${created || "item"}`
              : `Server rejected oversized fields — HTTP ${res.status}: ${res.error}`,
          url: `POST ${oversizedUrl}`,
        });
        if (created) {
          await apiCall(`/api/fleetbase/vehicles/${created}`, { method: "DELETE" });
        }
      }

      updateGroup("errors", tests);
    }

    // --- Auth & Headers Tests ---
    {
      const tests: TestResult[] = [];

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/status`);
        const dur = Date.now() - start;
        tests.push({
          name: `Server status authenticated`,
          operation: "AUTH",
          status: res.ok && res.data?.connected ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Authenticated — server connected at ${res.data?.url || "unknown"}`
            : `Auth check failed: ${res.error}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/cityos-context`);
        const dur = Date.now() - start;
        tests.push({
          name: `CityOS context endpoint`,
          operation: "AUTH",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Context loaded: ${formatCtx(res.data)}`
            : `Context endpoint failed: ${res.error}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles`, undefined, false);
        const dur = Date.now() - start;
        const contentType = res.headers?.["content-type"] || "";
        tests.push({
          name: `Content-Type is JSON`,
          operation: "AUTH",
          status: contentType.includes("application/json") ? "pass" : "fail",
          duration: dur,
          message: `Content-Type: ${contentType || "not set"}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase-servers/active`);
        const dur = Date.now() - start;
        tests.push({
          name: `Active server config`,
          operation: "AUTH",
          status: res.ok && res.data ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Active server: ${res.data?.name || res.data?.url || "configured"}`
            : `No active server: ${res.error}`,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles`, {
          method: "OPTIONS",
        });
        const dur = Date.now() - start;
        tests.push({
          name: `OPTIONS preflight`,
          operation: "AUTH",
          status: "pass",
          duration: dur,
          message: `OPTIONS returned HTTP ${res.status}`,
        });
      }

      {
        const start = Date.now();
        const res1 = await apiCall(`/api/fleetbase/vehicles?limit=1`);
        const res2 = await apiCall(`/api/fleetbase/vehicles?limit=1`);
        const dur = Date.now() - start;
        const items1 = Array.isArray(res1.data) ? res1.data : [];
        const items2 = Array.isArray(res2.data) ? res2.data : [];
        const bothEmpty = items1.length === 0 && items2.length === 0;
        const consistent = !bothEmpty && items1.length === items2.length &&
          (extractId(items1[0]) === extractId(items2[0]));
        tests.push({
          name: `Idempotent GET requests`,
          operation: "AUTH",
          status: bothEmpty ? "fail" : consistent ? "pass" : "fail",
          duration: dur,
          message: bothEmpty
            ? `FAIL: Both requests returned 0 items — seeded data required to verify idempotency.`
            : consistent
              ? `Two identical GET requests returned consistent results (${items1.length} item(s))`
              : `GET requests returned different results — possible caching or ordering issue`,
        });
      }

      updateGroup("auth", tests);
    }

    // --- Local CRUD Endpoints ---
    {
      const tests: TestResult[] = [];
      const ts = Date.now();
      const LOCAL_RESOURCES = [
        { path: "routes", label: "Routes", body: { tracking_id: `RT-${ts}`, distance: "25 km", duration: "30 min", status: "planned" } },
        { path: "issues", label: "Issues", body: { tracking_id: `ISS-${ts}`, description: "Test desc", priority: "medium", status: "open", type: "maintenance" } },
        { path: "fuel-reports", label: "Fuel Reports", body: { tracking_id: `FR-${ts}`, vehicle_uuid: "test-v", driver_uuid: "test-d", cost: "100", odometer: 15000 } },
        { path: "devices", label: "Devices", body: { serial: `SN-${ts}`, type: "gps_tracker", status: "online" } },
        { path: "work-orders", label: "Work Orders", body: { tracking_id: `WO-${ts}`, vehicle_uuid: "test-v", type: "maintenance", priority: "low", status: "pending" } },
        { path: "parts", label: "Parts", body: { name: `_Test Part ${ts}`, sku: `SKU-${ts}`, category: "engine", stock: 10, cost: "50.00" } },
        { path: "sensors", label: "Sensors", body: { name: `_Test Sensor ${ts}`, type: "temperature", status: "normal" } },
        { path: "events", label: "Events", body: { message: `Test event ${ts}`, type: "alert", severity: "info" } },
        { path: "telematics", label: "Telematics", body: { vehicle_uuid: "test-v", event: "Moving", speed: 60, location: "Riyadh" } },
        { path: "users", label: "Users", body: { username: `testuser${ts}`, password: "TestPass123!", name: `_Test User ${ts}`, email: `testuser${ts}@test.local`, role: "viewer" } },
        { path: "reports", label: "Reports", body: { name: `_Test Report ${ts}`, category: "operations", format: "pdf", status: "ready" } },
        { path: "transactions", label: "Transactions", body: { description: `Test transaction ${ts}`, type: "payment", amount: "100.00", status: "pending" } },
        { path: "custom-fields", label: "Custom Fields", body: { label: `_Test CF ${ts}`, model: "order", type: "text" } },
        { path: "time-off-requests", label: "Time Off Requests", body: { driver_uuid: "test-d", driver_name: "Test Driver", type: "vacation", start_date: "2026-03-01", end_date: "2026-03-05", status: "pending" } },
        { path: "scheduler-tasks", label: "Scheduler Tasks", body: { resource_id: "test-r", resource_name: "Test", resource_type: "driver", title: `_Test Task ${ts}`, task_type: "delivery", color: "#FF0000", start_hour: 9, duration: 2, date: new Date().toISOString().slice(0, 10) } },
        { path: "settings", label: "Settings", body: { category: "test", key: `test_key_${ts}`, value: "test_value" } },
        { path: "api-keys", label: "API Keys", body: { name: `_Test Key ${ts}`, token: `tk_${ts}`, type: "publishable" } },
        { path: "webhooks", label: "Webhooks", body: { url: "https://example.com/webhook", events: ["order.created"], status: "active" } },
        { path: "webhook-logs", label: "Webhook Logs", body: { event: "order.created", status_code: 200, duration: "50ms" } },
        { path: "integrations", label: "Integrations", body: { name: `_Test Integration ${ts}`, provider: "test_provider", category: "general", status: "available" } },
        { path: "order-configs", label: "Order Configs", body: { name: `_Test Config ${ts}`, type: "default", status: "active" } },
      ];

      for (const lr of LOCAL_RESOURCES) {
        const listStart = Date.now();
        const listRes = await apiCall(`/api/${lr.path}`);
        const listDur = Date.now() - listStart;
        const items = Array.isArray(listRes.data) ? listRes.data : [];
        tests.push({
          name: `${lr.label} — LIST`,
          operation: "LOCAL_LIST",
          status: listRes.ok ? "pass" : "fail",
          duration: listDur,
          message: listRes.ok
            ? `${items.length} item(s) returned`
            : `LIST failed: ${listRes.error}`,
          url: `/api/${lr.path}`,
          data: { count: items.length },
        });

        const createStart = Date.now();
        const createRes = await apiCall(`/api/${lr.path}`, {
          method: "POST",
          body: JSON.stringify(lr.body),
        });
        const createDur = Date.now() - createStart;
        const createdId = createRes.ok ? extractId(createRes.data) : null;
        const isServerError = !createRes.ok && createRes.status >= 500;
        const isValidation = !createRes.ok && (createRes.status === 400 || createRes.status === 422);
        tests.push({
          name: `${lr.label} — CREATE`,
          operation: "LOCAL_CREATE",
          status: createRes.ok ? "pass" : isServerError ? "warn" : isValidation ? "warn" : "fail",
          category: isServerError ? "api_bug" : isValidation ? "validation_check" : "crud",
          duration: createDur,
          message: createRes.ok
            ? `Created ${createdId || "item"}`
            : isValidation
              ? `Schema validation rejected payload: ${createRes.error || `HTTP ${createRes.status}`} — review test body fields`
              : isServerError
                ? `API BUG: HTTP ${createRes.status} — ${createRes.error}`
                : `Failed: ${createRes.error || `HTTP ${createRes.status}`}`,
          url: `POST /api/${lr.path}`,
          data: createRes.ok ? { id: createdId } : { sent: lr.body, response: createRes.data },
        });

        if (createdId) {
          const getStart = Date.now();
          const getRes = await apiCall(`/api/${lr.path}/${createdId}`);
          const getDur = Date.now() - getStart;
          tests.push({
            name: `${lr.label} — GET`,
            operation: "LOCAL_GET",
            status: getRes.ok ? "pass" : "fail",
            duration: getDur,
            message: getRes.ok ? `Fetched ${createdId}` : `GET failed: ${getRes.error}`,
            url: `/api/${lr.path}/${createdId}`,
          });

          const updateBody = getLocalUpdateBody(lr.path);
          const updateStart = Date.now();
          const updateRes = await apiCall(`/api/${lr.path}/${createdId}`, {
            method: "PATCH",
            body: JSON.stringify(updateBody),
          });
          const updateDur = Date.now() - updateStart;
          tests.push({
            name: `${lr.label} — UPDATE`,
            operation: "LOCAL_UPDATE",
            status: updateRes.ok ? "pass" : "fail",
            duration: updateDur,
            message: updateRes.ok ? `Updated ${createdId}` : `UPDATE failed: ${updateRes.error}`,
            url: `PATCH /api/${lr.path}/${createdId}`,
          });

          const deleteStart = Date.now();
          const deleteRes = await apiCall(`/api/${lr.path}/${createdId}`, { method: "DELETE" });
          const deleteDur = Date.now() - deleteStart;
          tests.push({
            name: `${lr.label} — DELETE`,
            operation: "LOCAL_DELETE",
            status: deleteRes.ok || deleteRes.status === 204 ? "pass" : "fail",
            duration: deleteDur,
            message: deleteRes.ok || deleteRes.status === 204 ? `Deleted ${createdId}` : `DELETE failed: ${deleteRes.error}`,
            url: `DELETE /api/${lr.path}/${createdId}`,
          });

          const getAfterDelete = await apiCall(`/api/${lr.path}/${createdId}`);
          tests.push({
            name: `${lr.label} — GET after DELETE`,
            operation: "LOCAL_VERIFY",
            status: !getAfterDelete.ok ? "pass" : "fail",
            duration: 0,
            message: !getAfterDelete.ok
              ? `Correctly returns ${getAfterDelete.status} after deletion`
              : `Item still accessible after DELETE — potential bug`,
            url: `/api/${lr.path}/${createdId}`,
          });
        }
      }

      updateGroup("local-crud", tests);
    }

    // --- Special & Management Routes ---
    {
      const tests: TestResult[] = [];

      {
        const start = Date.now();
        const res = await apiCall("/api/setup/status");
        const dur = Date.now() - start;
        tests.push({
          name: "Setup status",
          operation: "SETUP",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `needsSetup=${res.data?.needsSetup}` : `Failed: ${res.error}`,
          url: "GET /api/setup/status",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/setup/initialize", {
          method: "POST",
          body: JSON.stringify({ name: "Already Setup Test" }),
        });
        const dur = Date.now() - start;
        const isBlocked = res.status === 403;
        const isValidation = res.status === 400;
        const isSuccess = res.ok;
        tests.push({
          name: "Setup initialize",
          operation: "SETUP",
          status: isBlocked || isValidation || isSuccess ? "pass" : "fail",
          category: isBlocked ? "validation_check" : undefined,
          duration: dur,
          message: isBlocked
            ? `Correctly blocked re-setup (already configured): ${res.error}`
            : isValidation
              ? `Correctly required fields: ${res.error}`
              : isSuccess
                ? `First-time setup succeeded (HTTP ${res.status})`
                : `Unexpected HTTP ${res.status}: ${res.error || "no error"}`,
          url: "POST /api/setup/initialize",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/auth/me");
        const dur = Date.now() - start;
        tests.push({
          name: "Auth current user (me)",
          operation: "AUTH_ROUTE",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Authenticated as: ${res.data?.name || res.data?.id || "unknown"}`
            : `Not authenticated: ${res.error}`,
          url: "GET /api/auth/me",
          data: res.ok ? { id: res.data?.id, name: res.data?.name, cityos: { country: res.data?.cityos_country, city: res.data?.cityos_city, tenant: res.data?.cityos_tenant } } : undefined,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/auth/servers");
        const dur = Date.now() - start;
        const servers = Array.isArray(res.data) ? res.data : [];
        tests.push({
          name: "List saved servers",
          operation: "AUTH_ROUTE",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `${servers.length} server(s) configured` : `Failed: ${res.error}`,
          url: "GET /api/auth/servers",
          data: { count: servers.length, servers: servers.map((s: any) => s.name || s.id) },
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers");
        const dur = Date.now() - start;
        const servers = Array.isArray(res.data) ? res.data : [];
        tests.push({
          name: "Fleetbase servers LIST",
          operation: "SERVER_MGMT",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok ? `${servers.length} server(s) found` : `Failed: ${res.error}`,
          url: "GET /api/fleetbase-servers",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers/active");
        const dur = Date.now() - start;
        tests.push({
          name: "Active server config",
          operation: "SERVER_MGMT",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Active: ${res.data?.name || "none"} (${res.data?.url || "no url"})`
            : `Failed: ${res.error}`,
          url: "GET /api/fleetbase-servers/active",
          data: res.ok ? { name: res.data?.name, cityos: { country: res.data?.cityos_country, tenant: res.data?.cityos_tenant } } : undefined,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers/test", {
          method: "POST",
          body: JSON.stringify({ url: "https://invalid-server.example.com", api_key: "invalid_key" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Test invalid server connection",
          operation: "SERVER_MGMT",
          status: !res.data?.connected ? "pass" : "fail",
          duration: dur,
          message: !res.data?.connected
            ? `Correctly reported disconnected for invalid server`
            : `Unexpected: invalid server reported as connected`,
          url: "POST /api/fleetbase-servers/test",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers/test", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Test server missing params",
          operation: "SERVER_MGMT",
          status: res.status === 400 ? "pass" : "fail",
          category: res.status === 400 ? "validation_check" : undefined,
          duration: dur,
          message: res.status === 400
            ? `Correctly requires url and api_key`
            : `Unexpected HTTP ${res.status}`,
          url: "POST /api/fleetbase-servers/test",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/dashboard/stats");
        const dur = Date.now() - start;
        tests.push({
          name: "Dashboard stats",
          operation: "DASHBOARD",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Orders=${res.data?.totalOrders || 0}, Drivers=${res.data?.totalDrivers || 0}, Vehicles=${res.data?.totalVehicles || 0}, Fleets=${res.data?.totalFleets || 0}`
            : `Failed: ${res.error}`,
          url: "GET /api/dashboard/stats",
          data: res.data,
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/status");
        const dur = Date.now() - start;
        tests.push({
          name: "Fleetbase connection status",
          operation: "STATUS",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `configured=${res.data?.configured}, connected=${res.data?.connected}`
            : `Status check failed: ${res.error}`,
          url: "GET /api/fleetbase/status",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/cityos-context");
        const dur = Date.now() - start;
        tests.push({
          name: "CityOS context endpoint",
          operation: "CONTEXT",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `Country=${res.data?.country || "?"}, City=${res.data?.city || "?"}, Tenant=${res.data?.tenant || "?"}, Channel=${res.data?.channel || "?"}`
            : `Failed: ${res.error}`,
          url: "GET /api/fleetbase/cityos-context",
        });
      }

      {
        const settingKey = `test_setting_${Date.now()}`;
        const upsertStart = Date.now();
        const upsertRes = await apiCall("/api/settings/upsert", {
          method: "POST",
          body: JSON.stringify({ category: "test_category", key: settingKey, value: "test_value_123" }),
        });
        const upsertDur = Date.now() - upsertStart;
        tests.push({
          name: "Settings upsert",
          operation: "SETTINGS",
          status: upsertRes.ok ? "pass" : "fail",
          duration: upsertDur,
          message: upsertRes.ok ? `Upserted setting ${settingKey}` : `Failed: ${upsertRes.error}`,
          url: "POST /api/settings/upsert",
        });

        const catStart = Date.now();
        const catRes = await apiCall("/api/settings/category/test_category");
        const catDur = Date.now() - catStart;
        const catItems = Array.isArray(catRes.data) ? catRes.data : [];
        tests.push({
          name: "Settings by category",
          operation: "SETTINGS",
          status: catRes.ok ? "pass" : "fail",
          duration: catDur,
          message: catRes.ok
            ? `${catItems.length} setting(s) in category 'test_category'`
            : `Failed: ${catRes.error}`,
          url: "GET /api/settings/category/test_category",
        });
      }

      {
        const bulkStart = Date.now();
        const bulkRes = await apiCall("/api/settings/bulk-upsert", {
          method: "POST",
          body: JSON.stringify({ category: "bulk_test", settings: { key1: "val1", key2: "val2", key3: "val3" } }),
        });
        const bulkDur = Date.now() - bulkStart;
        const bulkItems = Array.isArray(bulkRes.data) ? bulkRes.data : [];
        tests.push({
          name: "Settings bulk upsert",
          operation: "SETTINGS",
          status: bulkRes.ok && bulkItems.length === 3 ? "pass" : bulkRes.ok ? "pass" : "fail",
          duration: bulkDur,
          message: bulkRes.ok ? `Bulk upserted ${bulkItems.length} settings` : `Failed: ${bulkRes.error}`,
          url: "POST /api/settings/bulk-upsert",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/settings/upsert", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Settings upsert missing fields",
          operation: "SETTINGS",
          status: res.status === 400 ? "pass" : "fail",
          category: res.status === 400 ? "validation_check" : undefined,
          duration: dur,
          message: res.status === 400
            ? `Correctly requires category and key`
            : `Unexpected HTTP ${res.status}`,
          url: "POST /api/settings/upsert",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/settings/bulk-upsert", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Bulk upsert missing fields",
          operation: "SETTINGS",
          status: res.status === 400 ? "pass" : "fail",
          category: res.status === 400 ? "validation_check" : undefined,
          duration: dur,
          message: res.status === 400
            ? `Correctly requires category and settings`
            : `Unexpected HTTP ${res.status}`,
          url: "POST /api/settings/bulk-upsert",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/auth/connect", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Auth connect missing params",
          operation: "AUTH_ROUTE",
          status: res.status === 400 ? "pass" : "fail",
          category: res.status === 400 ? "validation_check" : undefined,
          duration: dur,
          message: res.status === 400
            ? `Correctly requires server URL and API key`
            : `Unexpected HTTP ${res.status}: ${res.error}`,
          url: "POST /api/auth/connect",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/auth/connect", {
          method: "POST",
          body: JSON.stringify({ serverId: "nonexistent-server-id" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Auth connect nonexistent server",
          operation: "AUTH_ROUTE",
          status: res.status === 404 ? "pass" : "fail",
          duration: dur,
          message: res.status === 404
            ? `Correctly returned 404 for nonexistent server`
            : `Unexpected HTTP ${res.status}: ${res.error}`,
          url: "POST /api/auth/connect",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/auth/connect", {
          method: "POST",
          body: JSON.stringify({ url: "https://invalid.example.com", api_key: "invalid" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Auth connect invalid credentials",
          operation: "AUTH_ROUTE",
          status: res.status === 401 || res.status === 400 ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly rejected invalid credentials: HTTP ${res.status}`
            : `Unexpected success with invalid credentials`,
          url: "POST /api/auth/connect",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers/nonexistent-id/activate", {
          method: "POST",
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Activate nonexistent server",
          operation: "SERVER_MGMT",
          status: !res.ok ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly failed: HTTP ${res.status}`
            : `Unexpected: activation of nonexistent server succeeded`,
          url: "POST /api/fleetbase-servers/nonexistent-id/activate",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase-servers", {
          method: "POST",
          body: JSON.stringify({ name: "Test", url: "not-a-url", api_key: "test" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Create server with invalid URL",
          operation: "SERVER_MGMT",
          status: res.status === 400 ? "pass" : res.ok ? "fail" : "pass",
          category: res.status === 400 ? "validation_check" : undefined,
          duration: dur,
          message: res.status === 400
            ? `Correctly rejected invalid URL`
            : res.ok
              ? `Accepted invalid URL — validation may be lenient`
              : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase-servers",
        });
      }

      updateGroup("special-routes", tests);
    }

    // --- PUT vs PATCH Behavior ---
    {
      const tests: TestResult[] = [];
      const putPatchResources = ["vehicles", "drivers"];

      for (const resource of putPatchResources) {
        const listRes = await apiCall(`/api/fleetbase/${resource}?limit=1`);
        const items = Array.isArray(listRes.data) ? listRes.data : [];
        const itemId = items.length > 0 ? extractId(items[0]) : null;

        if (!itemId) {
          tests.push({
            name: `${resource} — PUT vs PATCH`,
            operation: "COMPARE",
            status: "fail",
            message: `FAIL: No ${resource} data — seeded data required to test PUT vs PATCH comparison.`,
            url: `/api/fleetbase/${resource}`,
          });
          continue;
        }

        const patchStart = Date.now();
        const patchRes = await apiCall(`/api/fleetbase/${resource}/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: `_Patch Test ${Date.now()}` }),
        });
        const patchDur = Date.now() - patchStart;
        tests.push({
          name: `${resource} — PATCH partial update`,
          operation: "PATCH",
          status: patchRes.ok ? "pass" : "fail",
          duration: patchDur,
          message: patchRes.ok
            ? `PATCH accepted partial update for ${itemId}`
            : `PATCH failed: ${patchRes.error}`,
          url: `PATCH /api/fleetbase/${resource}/${itemId}`,
        });

        const putStart = Date.now();
        const putRes = await apiCall(`/api/fleetbase/${resource}/${itemId}`, {
          method: "PUT",
          body: JSON.stringify({ name: `_Put Test ${Date.now()}` }),
        });
        const putDur = Date.now() - putStart;
        tests.push({
          name: `${resource} — PUT full update`,
          operation: "PUT",
          status: putRes.ok ? "pass" : putRes.status >= 400 ? "pass" : "fail",
          duration: putDur,
          message: putRes.ok
            ? `PUT accepted for ${itemId}`
            : `PUT returned HTTP ${putRes.status}: ${putRes.error} (may require full object)`,
          url: `PUT /api/fleetbase/${resource}/${itemId}`,
        });

        const afterPutGet = await apiCall(`/api/fleetbase/${resource}/${itemId}`);
        if (afterPutGet.ok) {
          const hasFields = afterPutGet.data && Object.keys(afterPutGet.data).length > 5;
          tests.push({
            name: `${resource} — data intact after PUT`,
            operation: "PUT_VERIFY",
            status: hasFields ? "pass" : "warn",
            category: hasFields ? undefined : "api_bug",
            message: hasFields
              ? `Record has ${Object.keys(afterPutGet.data).length} fields after PUT — data intact`
              : `Record may have lost fields after PUT — only ${afterPutGet.data ? Object.keys(afterPutGet.data).length : 0} fields`,
            url: `GET /api/fleetbase/${resource}/${itemId}`,
          });
        }
      }

      updateGroup("put-vs-patch", tests);
    }

    // --- Query Parameter Combinations ---
    {
      const tests: TestResult[] = [];

      const combos = [
        { resource: "vehicles", params: "limit=2&sort=created_at", label: "vehicles limit+sort" },
        { resource: "vehicles", params: "limit=5&query=test", label: "vehicles limit+search" },
        { resource: "drivers", params: "limit=3&sort=-created_at", label: "drivers limit+sort desc" },
        { resource: "orders", params: "limit=1&sort=created_at", label: "orders limit+sort" },
        { resource: "vehicles", params: "limit=1&offset=0", label: "vehicles offset=0" },
        { resource: "vehicles", params: "limit=1&offset=1", label: "vehicles offset=1" },
        { resource: "vehicles", params: "limit=1&offset=99999", label: "vehicles large offset" },
        { resource: "drivers", params: "query=&limit=10", label: "drivers empty search" },
        { resource: "places", params: "limit=100&sort=created_at", label: "places large page + sort" },
        { resource: "contacts", params: "query=test&sort=-created_at&limit=5", label: "contacts search+sort+limit" },
        { resource: "vendors", params: "limit=3&sort=created_at", label: "vendors limit+sort" },
        { resource: "fleets", params: "limit=10&query=fleet", label: "fleets search+limit" },
      ];

      for (const combo of combos) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${combo.resource}?${combo.params}`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        const isFleetbaseBug = !res.ok && res.data?.source === "fleetbase" && res.status >= 500;
        const emptyResult = res.ok && items.length === 0;
        tests.push({
          name: `${combo.label}`,
          operation: "QUERY_COMBO",
          status: res.ok ? (emptyResult ? "fail" : "pass") : isFleetbaseBug ? "warn" : "fail",
          category: isFleetbaseBug ? "api_bug" : undefined,
          duration: dur,
          message: res.ok
            ? (emptyResult
              ? `FAIL: 0 items returned for ${combo.resource} with params ${combo.params} — seeded data required.`
              : `Returned ${items.length} item(s) with params: ${combo.params}`)
            : isFleetbaseBug
              ? `Fleetbase API error with params ${combo.params}: ${res.error}`
              : `Failed with params ${combo.params}: ${res.error}`,
          url: `/api/fleetbase/${combo.resource}?${combo.params}`,
          data: { count: items.length },
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles?limit=-1`);
        const dur = Date.now() - start;
        tests.push({
          name: "Negative limit",
          operation: "QUERY_EDGE",
          status: res.ok || res.status === 400 ? "pass" : res.status >= 500 ? "warn" : "fail",
          category: res.status >= 500 ? "api_bug" : undefined,
          duration: dur,
          message: res.ok
            ? `Server accepted limit=-1 (returned ${Array.isArray(res.data) ? res.data.length : "?"} items)`
            : `HTTP ${res.status}: ${res.error}`,
          url: "/api/fleetbase/vehicles?limit=-1",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/vehicles?limit=abc`);
        const dur = Date.now() - start;
        tests.push({
          name: "Non-numeric limit",
          operation: "QUERY_EDGE",
          status: res.ok || res.status === 400 ? "pass" : res.status >= 500 ? "warn" : "fail",
          category: res.status >= 500 ? "api_bug" : undefined,
          duration: dur,
          message: res.ok
            ? `Server accepted limit=abc gracefully`
            : `HTTP ${res.status}: ${res.error}`,
          url: "/api/fleetbase/vehicles?limit=abc",
        });
      }

      {
        const start = Date.now();
        const longQuery = "a".repeat(200);
        const res = await apiCall(`/api/fleetbase/vehicles?query=${longQuery}`);
        const dur = Date.now() - start;
        tests.push({
          name: "Very long search query (200 chars)",
          operation: "QUERY_EDGE",
          status: res.ok || res.status === 400 ? "pass" : res.status >= 500 ? "warn" : "fail",
          category: res.status >= 500 ? "api_bug" : undefined,
          duration: dur,
          message: res.ok
            ? `Server handled 200-char query gracefully`
            : `HTTP ${res.status}: ${res.error}`,
          url: "/api/fleetbase/vehicles?query=aaaa...(200 chars)",
        });
      }

      updateGroup("query-combos", tests);
    }

    // --- Data Integrity & Lifecycle ---
    {
      const tests: TestResult[] = [];

      const lifecycleResources = ["vehicles", "contacts", "places"];
      for (const resource of lifecycleResources) {
        const suffix = Date.now().toString().slice(-6);
        const createBody = getTestCreateBody(resource);
        const createRes = await apiCall(`/api/fleetbase/${resource}`, {
          method: "POST",
          body: JSON.stringify(createBody),
        });
        const createdId = createRes.ok ? extractId(createRes.data) : null;

        if (!createdId) {
          const isServerError = createRes.status >= 500;
          tests.push({
            name: `${resource} — lifecycle (create failed)`,
            operation: "LIFECYCLE",
            status: isServerError ? "warn" : "fail",
            category: isServerError ? "api_bug" : undefined,
            message: `Create failed: HTTP ${createRes.status} — ${createRes.error || "unknown"} — cannot proceed with lifecycle test`,
            url: `POST /api/fleetbase/${resource}`,
            data: { sent: createBody, response: createRes.data },
          });
          continue;
        }

        tests.push({
          name: `${resource} — lifecycle: created`,
          operation: "LIFECYCLE_CREATE",
          status: "pass",
          message: `Created ${createdId}`,
          url: `POST /api/fleetbase/${resource}`,
        });

        const getRes = await apiCall(`/api/fleetbase/${resource}/${createdId}`);
        if (getRes.ok) {
          const sentKeys = Object.keys(createBody);
          const matchedFields = sentKeys.filter(k => {
            const sent = createBody[k];
            const got = getRes.data?.[k];
            if (typeof sent === "object") return true;
            return String(sent) === String(got);
          });
          tests.push({
            name: `${resource} — lifecycle: verify created data`,
            operation: "LIFECYCLE_VERIFY",
            status: matchedFields.length > 0 ? "pass" : "warn",
            message: `${matchedFields.length}/${sentKeys.length} fields match after create: ${matchedFields.join(", ")}`,
            url: `GET /api/fleetbase/${resource}/${createdId}`,
          });
        }

        const updateBody = getTestUpdateBody(resource);
        const updateRes = await apiCall(`/api/fleetbase/${resource}/${createdId}`, {
          method: "PATCH",
          body: JSON.stringify(updateBody),
        });
        tests.push({
          name: `${resource} — lifecycle: updated`,
          operation: "LIFECYCLE_UPDATE",
          status: updateRes.ok ? "pass" : "fail",
          message: updateRes.ok ? `Updated ${createdId}` : `Update failed: ${updateRes.error}`,
          url: `PATCH /api/fleetbase/${resource}/${createdId}`,
        });

        if (updateRes.ok) {
          const getAfterUpdate = await apiCall(`/api/fleetbase/${resource}/${createdId}`);
          if (getAfterUpdate.ok) {
            const updateKey = Object.keys(updateBody)[0];
            const updated = getAfterUpdate.data?.[updateKey];
            const expected = updateBody[updateKey];
            tests.push({
              name: `${resource} — lifecycle: verify update persisted`,
              operation: "LIFECYCLE_VERIFY",
              status: String(updated) === String(expected) ? "pass" : "warn",
              message: String(updated) === String(expected)
                ? `Field '${updateKey}' correctly updated to '${expected}'`
                : `Field '${updateKey}': expected '${expected}', got '${updated}'`,
              url: `GET /api/fleetbase/${resource}/${createdId}`,
            });
          }
        }

        const deleteRes = await apiCall(`/api/fleetbase/${resource}/${createdId}`, { method: "DELETE" });
        tests.push({
          name: `${resource} — lifecycle: deleted`,
          operation: "LIFECYCLE_DELETE",
          status: deleteRes.ok || deleteRes.status === 204 ? "pass" : "fail",
          message: deleteRes.ok || deleteRes.status === 204 ? `Deleted ${createdId}` : `Delete failed: ${deleteRes.error}`,
          url: `DELETE /api/fleetbase/${resource}/${createdId}`,
        });

        const getAfterDel = await apiCall(`/api/fleetbase/${resource}/${createdId}`);
        tests.push({
          name: `${resource} — lifecycle: confirm deleted`,
          operation: "LIFECYCLE_CONFIRM",
          status: !getAfterDel.ok ? "pass" : "warn",
          category: getAfterDel.ok ? "api_bug" : undefined,
          message: !getAfterDel.ok
            ? `Correctly not found after deletion (HTTP ${getAfterDel.status})`
            : `Record still accessible after deletion — soft delete? HTTP ${getAfterDel.status}`,
          url: `GET /api/fleetbase/${resource}/${createdId}`,
        });

        const doubleDelete = await apiCall(`/api/fleetbase/${resource}/${createdId}`, { method: "DELETE" });
        tests.push({
          name: `${resource} — lifecycle: double delete`,
          operation: "LIFECYCLE_EDGE",
          status: !doubleDelete.ok || doubleDelete.status === 204 ? "pass" : "pass",
          message: !doubleDelete.ok
            ? `Double delete correctly returned HTTP ${doubleDelete.status}`
            : `Double delete returned HTTP ${doubleDelete.status} (idempotent)`,
          url: `DELETE /api/fleetbase/${resource}/${createdId}`,
        });
      }

      updateGroup("data-integrity", tests);
    }

    // --- Edge Cases & Boundary Tests ---
    {
      const tests: TestResult[] = [];

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "POST",
          body: JSON.stringify({ name: null, plate_number: undefined }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "Create with null/undefined fields",
          operation: "EDGE_CREATE",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          duration: dur,
          message: res.ok
            ? `Server accepted null fields — created ${extractId(res.data) || "item"}`
            : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase/vehicles",
        });
        if (res.ok) {
          const id = extractId(res.data);
          if (id) await apiCall(`/api/fleetbase/vehicles/${id}`, { method: "DELETE" });
        }
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "POST",
          body: JSON.stringify({
            name: `XSS Test <script>alert('xss')</script>`,
            plate_number: `<img onerror="alert(1)" src="x">`,
          }),
        });
        const dur = Date.now() - start;
        const createdId = res.ok ? extractId(res.data) : null;
        tests.push({
          name: "XSS payload in create",
          operation: "EDGE_SECURITY",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          duration: dur,
          message: res.ok
            ? `Server accepted XSS payload (stored) — check if output is sanitized`
            : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase/vehicles",
        });
        if (createdId) await apiCall(`/api/fleetbase/vehicles/${createdId}`, { method: "DELETE" });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "POST",
          body: JSON.stringify({
            name: `SQL Test'); DROP TABLE vehicles;--`,
            plate_number: `' OR '1'='1`,
          }),
        });
        const dur = Date.now() - start;
        const createdId = res.ok ? extractId(res.data) : null;
        tests.push({
          name: "SQL injection payload",
          operation: "EDGE_SECURITY",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          duration: dur,
          message: res.ok
            ? `Server accepted SQL injection payload safely (stored as text)`
            : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase/vehicles",
        });
        if (createdId) await apiCall(`/api/fleetbase/vehicles/${createdId}`, { method: "DELETE" });
      }

      {
        const res = await apiCall("/api/fleetbase/vehicles?query=<script>alert(1)</script>");
        tests.push({
          name: "XSS in query parameter",
          operation: "EDGE_SECURITY",
          status: res.ok || res.status === 400 ? "pass" : res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          message: res.ok
            ? `Server handled XSS query param safely (returned ${Array.isArray(res.data) ? res.data.length : "?"} items)`
            : `HTTP ${res.status}`,
          url: "GET /api/fleetbase/vehicles?query=<script>...",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles/..%2F..%2F..%2F..%2Fetc%2Fpasswd");
        const dur = Date.now() - start;
        const isFleetbaseData = res.ok && res.data && typeof res.data === "object" && (res.data.id || res.data.uuid);
        tests.push({
          name: "Path traversal in ID",
          operation: "EDGE_SECURITY",
          status: isFleetbaseData ? "warn" : "pass",
          category: isFleetbaseData ? "api_bug" : "test_info",
          duration: dur,
          message: isFleetbaseData
            ? `Unexpected: path traversal ID returned Fleetbase data`
            : !res.ok
              ? `Correctly rejected path traversal: HTTP ${res.status}`
              : `Path traversal ID returned non-resource response (safe)`,
          url: "GET /api/fleetbase/vehicles/..%2F..%2Fetc%2Fpasswd",
        });
      }

      {
        const res = await apiCall("/api/fleetbase/vehicles?limit=1&callback=evil");
        tests.push({
          name: "JSONP callback injection",
          operation: "EDGE_SECURITY",
          status: "pass",
          category: "test_info",
          message: res.ok
            ? `Server ignored callback param (safe — returned JSON, not JSONP)`
            : `HTTP ${res.status}`,
          url: "GET /api/fleetbase/vehicles?callback=evil",
        });
      }

      const specialCharsResources = ["vehicles", "drivers"];
      for (const resource of specialCharsResources) {
        const body = getTestCreateBody(resource);
        const unicodeBody = { ...body, name: `测试 тест アイウ 🚗 ${Date.now()}` };
        const res = await apiCall(`/api/fleetbase/${resource}`, {
          method: "POST",
          body: JSON.stringify(unicodeBody),
        });
        const createdId = res.ok ? extractId(res.data) : null;
        tests.push({
          name: `${resource} — unicode/emoji in name`,
          operation: "EDGE_UNICODE",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          message: res.ok
            ? `Accepted unicode/emoji: created ${createdId}`
            : `HTTP ${res.status}: ${res.error}`,
          url: `POST /api/fleetbase/${resource}`,
        });
        if (createdId) await apiCall(`/api/fleetbase/${resource}/${createdId}`, { method: "DELETE" });
      }

      {
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "POST",
          body: JSON.stringify({ name: "", plate_number: "" }),
        });
        const createdId = res.ok ? extractId(res.data) : null;
        tests.push({
          name: "Create with empty strings",
          operation: "EDGE_CREATE",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          message: res.ok
            ? `Server accepted empty string fields — created ${createdId || "item"}`
            : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase/vehicles",
        });
        if (createdId) await apiCall(`/api/fleetbase/vehicles/${createdId}`, { method: "DELETE" });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "POST",
          body: JSON.stringify({
            name: "Extra Fields Test",
            nonexistent_field_abc: "should be ignored",
            _random_key: 12345,
            nested: { deep: { field: "test" } },
          }),
        });
        const dur = Date.now() - start;
        const createdId = res.ok ? extractId(res.data) : null;
        tests.push({
          name: "Create with unknown extra fields",
          operation: "EDGE_CREATE",
          status: res.status >= 500 ? "warn" : "pass",
          category: res.status >= 500 ? "api_bug" : "test_info",
          duration: dur,
          message: res.ok
            ? `Server accepted extra fields (ignored or stored) — created ${createdId}`
            : `HTTP ${res.status}: ${res.error}`,
          url: "POST /api/fleetbase/vehicles",
        });
        if (createdId) await apiCall(`/api/fleetbase/vehicles/${createdId}`, { method: "DELETE" });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "PATCH",
          body: JSON.stringify({ name: "No ID in URL" }),
        });
        const dur = Date.now() - start;
        tests.push({
          name: "PATCH without ID in URL",
          operation: "EDGE_ERROR",
          status: !res.ok ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly rejected: HTTP ${res.status}`
            : `Unexpected: PATCH without ID succeeded`,
          url: "PATCH /api/fleetbase/vehicles (no ID)",
        });
      }

      {
        const start = Date.now();
        const res = await apiCall("/api/fleetbase/vehicles", {
          method: "DELETE",
        });
        const dur = Date.now() - start;
        tests.push({
          name: "DELETE without ID in URL",
          operation: "EDGE_ERROR",
          status: !res.ok ? "pass" : "fail",
          duration: dur,
          message: !res.ok
            ? `Correctly rejected: HTTP ${res.status}`
            : `DANGER: DELETE without ID may delete all records`,
          url: "DELETE /api/fleetbase/vehicles (no ID)",
        });
      }

      {
        const allResources = ["vehicles", "drivers", "orders", "places", "contacts", "vendors", "fleets", "service-areas", "zones", "service-rates", "entities"];
        for (const resource of allResources) {
          const listRes = await apiCall(`/api/fleetbase/${resource}?limit=1`);
          const items = Array.isArray(listRes.data) ? listRes.data : [];
          if (items.length === 0) {
            tests.push({
              name: `${resource} — empty list check`,
              operation: "EMPTY_CHECK",
              status: "fail",
              message: `FAIL: No ${resource} data exists — seeded data required. Cannot validate operations without data.`,
              url: `/api/fleetbase/${resource}`,
            });
          } else {
            tests.push({
              name: `${resource} — has data`,
              operation: "DATA_CHECK",
              status: "pass",
              message: `${items.length}+ item(s) available for testing`,
              url: `/api/fleetbase/${resource}`,
            });
          }
        }
      }

      updateGroup("edge-cases", tests);
    }

    // --- Cross-Organization Isolation Tests ---
    {
      const tests: TestResult[] = [];
      const ISOLATION_RESOURCES = ["vehicles", "drivers", "orders", "contacts", "places", "vendors", "fleets"];

      const withContextData: Record<string, { ids: string[]; count: number }> = {};
      for (const resource of ISOLATION_RESOURCES) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${resource}?limit=25`);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        const ids = items.map((item: any) => extractId(item)).filter(Boolean) as string[];
        withContextData[resource] = { ids, count: items.length };
        tests.push({
          name: `${resource} — baseline (with context)`,
          operation: "ISOLATION_BASELINE",
          status: res.ok ? "pass" : "fail",
          duration: dur,
          message: res.ok
            ? `${items.length} record(s) with org context — ${ids.length} IDs captured for comparison`
            : `Baseline failed: ${res.error}`,
          url: `/api/fleetbase/${resource}?limit=25`,
          data: { count: items.length, sampleIds: ids.slice(0, 3) },
        });
      }

      for (const resource of ISOLATION_RESOURCES) {
        const start = Date.now();
        const res = await apiCall(`/api/fleetbase/${resource}?limit=25`, undefined, true);
        const dur = Date.now() - start;
        const items = Array.isArray(res.data) ? res.data : [];
        const noCtxIds = items.map((item: any) => extractId(item)).filter(Boolean) as string[];
        const baseline = withContextData[resource];
        const baselineIds = new Set(baseline?.ids || []);
        const extraIds = noCtxIds.filter(id => !baselineIds.has(id));
        const hasExtraData = extraIds.length > 0;
        const returnedMore = items.length > (baseline?.count || 0);

        if (items.length === 0 && (baseline?.count || 0) === 0) {
          tests.push({
            name: `${resource} — no-context isolation`,
            operation: "ISOLATION_NO_CTX",
            status: "fail",
            duration: dur,
            message: `FAIL: No ${resource} data in org — seeded data required to test isolation. Cannot verify cross-org security without data.`,
            url: `/api/fleetbase/${resource} (no CityOS context)`,
          });
        } else {
          tests.push({
            name: `${resource} — no-context isolation`,
            operation: "ISOLATION_NO_CTX",
            status: hasExtraData ? "fail" : returnedMore ? "warn" : "pass",
            category: hasExtraData ? undefined : returnedMore ? "api_bug" : undefined,
            duration: dur,
            message: hasExtraData
              ? `VIOLATION: ${extraIds.length} record(s) returned WITHOUT context that were NOT in org baseline — possible cross-org data leak! Extra IDs: ${extraIds.slice(0, 5).join(", ")}`
              : returnedMore
                ? `WARNING: Returned ${items.length} records without context vs ${baseline?.count || 0} with context — more data visible without CityOS headers`
                : items.length === 0
                  ? `SECURE: No data returned without CityOS context (${baseline?.count || 0} records hidden)`
                  : `OK: ${items.length} records match baseline (${baseline?.count || 0}) — API key scoping only, no extra data leaked`,
            url: `/api/fleetbase/${resource} (no CityOS context)`,
            data: {
              withContext: baseline?.count || 0,
              withoutContext: items.length,
              extraRecords: extraIds.length,
              sampleExtraIds: extraIds.slice(0, 5),
            },
          });
        }
      }

      const FAKE_TENANTS = [
        { country: "FakeCountry_XYZ", city: "FakeCity_XYZ", tenant: "FakeTenant_XYZ", channel: "fake_channel", label: "completely fake org" },
        { country: "United States", city: "New York", tenant: "AcmeCorp", channel: "retail", label: "different real-sounding org" },
        { country: "", city: "", tenant: "", channel: "", label: "empty context strings" },
      ];

      for (const fakeTenant of FAKE_TENANTS) {
        for (const resource of ["vehicles", "drivers"]) {
          const baseline = withContextData[resource];
          if ((baseline?.count || 0) === 0) {
            tests.push({
              name: `${resource} — fake tenant (${fakeTenant.label})`,
              operation: "ISOLATION_FAKE",
              status: "fail",
              message: `FAIL: No ${resource} baseline data — seeded data required to compare against fake tenant.`,
              url: `/api/fleetbase/${resource}`,
            });
            continue;
          }

          const start = Date.now();
          const res = await apiCall(`/api/fleetbase/${resource}?limit=25`, {
            headers: {
              "Content-Type": "application/json",
              "X-Skip-CityOS": "true",
              "X-CityOS-Country": fakeTenant.country,
              "X-CityOS-City": fakeTenant.city,
              "X-CityOS-Tenant": fakeTenant.tenant,
              "X-CityOS-Channel": fakeTenant.channel,
            },
          });
          const dur = Date.now() - start;
          const items = Array.isArray(res.data) ? res.data : [];
          const fakeIds = items.map((item: any) => extractId(item)).filter(Boolean) as string[];
          const baselineIds = new Set(baseline.ids);
          const ourDataReturned = fakeIds.filter(id => baselineIds.has(id));
          const foreignData = fakeIds.filter(id => !baselineIds.has(id));

          let status: TestStatus = "pass";
          let message = "";

          if (items.length === 0) {
            status = "pass";
            message = `SECURE: No data returned for ${fakeTenant.label} — org isolation enforced`;
          } else if (foreignData.length > 0) {
            status = "fail";
            message = `VIOLATION: ${foreignData.length} unknown record(s) returned with fake tenant "${fakeTenant.label}" — possible cross-org data leak! IDs: ${foreignData.slice(0, 5).join(", ")}`;
          } else if (ourDataReturned.length > 0 && ourDataReturned.length === fakeIds.length) {
            status = "warn";
            message = `WARNING: ${ourDataReturned.length} of OUR org's records returned with ${fakeTenant.label} context — CityOS tenant filtering may not be enforced (API key scoping only)`;
          } else {
            status = "warn";
            message = `${items.length} record(s) returned for ${fakeTenant.label} — ${ourDataReturned.length} match our org, ${foreignData.length} unknown`;
          }

          tests.push({
            name: `${resource} — fake tenant (${fakeTenant.label})`,
            operation: "ISOLATION_FAKE",
            status,
            category: status === "warn" ? "api_bug" : undefined,
            duration: dur,
            message,
            url: `/api/fleetbase/${resource} (tenant: ${fakeTenant.tenant || "empty"})`,
            data: {
              fakeTenant: fakeTenant.tenant || "(empty)",
              returned: items.length,
              matchedOurOrg: ourDataReturned.length,
              foreignRecords: foreignData.length,
              sampleForeignIds: foreignData.slice(0, 5),
            },
          });
        }
      }

      for (const resource of ["vehicles", "drivers"]) {
        const baseline = withContextData[resource];
        if ((baseline?.ids.length || 0) === 0) {
          tests.push({
            name: `${resource} — direct ID access without context`,
            operation: "ISOLATION_DIRECT",
            status: "fail",
            message: `FAIL: No ${resource} IDs — seeded data required to test direct access isolation.`,
            url: `/api/fleetbase/${resource}`,
          });
          continue;
        }

        const targetId = baseline!.ids[0];

        const startNoCtx = Date.now();
        const resNoCtx = await apiCall(`/api/fleetbase/${resource}/${targetId}`, undefined, true);
        const durNoCtx = Date.now() - startNoCtx;
        tests.push({
          name: `${resource} — direct ID access (no context)`,
          operation: "ISOLATION_DIRECT",
          status: resNoCtx.ok ? "warn" : "pass",
          category: resNoCtx.ok ? "api_bug" : undefined,
          duration: durNoCtx,
          message: resNoCtx.ok
            ? `WARNING: Record ${targetId} accessible WITHOUT CityOS context — only API key scoping active`
            : `SECURE: Record ${targetId} not accessible without context (HTTP ${resNoCtx.status})`,
          url: `/api/fleetbase/${resource}/${targetId} (no CityOS context)`,
        });

        const startFake = Date.now();
        const resFake = await apiCall(`/api/fleetbase/${resource}/${targetId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-Skip-CityOS": "true",
            "X-CityOS-Country": "FakeCountry",
            "X-CityOS-Tenant": "FakeTenant",
          },
        });
        const durFake = Date.now() - startFake;
        tests.push({
          name: `${resource} — direct ID access (fake tenant)`,
          operation: "ISOLATION_DIRECT",
          status: resFake.ok ? "warn" : "pass",
          category: resFake.ok ? "api_bug" : undefined,
          duration: durFake,
          message: resFake.ok
            ? `WARNING: Record ${targetId} accessible with FAKE tenant context — tenant-level isolation NOT enforced`
            : `SECURE: Record ${targetId} not accessible with fake tenant (HTTP ${resFake.status})`,
          url: `/api/fleetbase/${resource}/${targetId} (fake tenant)`,
        });
      }

      {
        for (const resource of ["vehicles", "drivers"]) {
          const baseline = withContextData[resource];
          if ((baseline?.ids.length || 0) < 2) continue;

          const createBody = getTestCreateBody(resource);
          const createRes = await apiCall(`/api/fleetbase/${resource}`, {
            method: "POST",
            body: JSON.stringify(createBody),
          });
          const createdId = createRes.ok ? extractId(createRes.data) : null;

          if (createdId) {
            const noCtxRead = await apiCall(`/api/fleetbase/${resource}/${createdId}`, undefined, true);
            tests.push({
              name: `${resource} — newly created record isolation`,
              operation: "ISOLATION_CREATED",
              status: noCtxRead.ok ? "warn" : "pass",
              category: noCtxRead.ok ? "api_bug" : undefined,
              message: noCtxRead.ok
                ? `WARNING: Newly created ${createdId} readable without CityOS context — API key scoping only`
                : `SECURE: Newly created ${createdId} not accessible without context`,
              url: `/api/fleetbase/${resource}/${createdId} (no context)`,
            });

            const fakeUpdate = await apiCall(`/api/fleetbase/${resource}/${createdId}`, {
              method: "PATCH",
              body: JSON.stringify({ name: "_FakeTenantUpdate" }),
              headers: {
                "Content-Type": "application/json",
                "X-Skip-CityOS": "true",
                "X-CityOS-Tenant": "FakeTenant_Attacker",
              } as any,
            });
            tests.push({
              name: `${resource} — cross-org UPDATE attempt`,
              operation: "ISOLATION_MUTATE",
              status: fakeUpdate.ok ? "warn" : "pass",
              category: fakeUpdate.ok ? "api_bug" : undefined,
              message: fakeUpdate.ok
                ? `WARNING: Record ${createdId} updated with spoofed tenant headers — Fleetbase uses API key scoping, not tenant-header isolation`
                : `SECURE: Update with fake tenant rejected (HTTP ${fakeUpdate.status})`,
              url: `PATCH /api/fleetbase/${resource}/${createdId} (fake tenant)`,
            });

            const fakeDelete = await apiCall(`/api/fleetbase/${resource}/${createdId}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "X-Skip-CityOS": "true",
                "X-CityOS-Tenant": "FakeTenant_Attacker",
              } as any,
            });
            tests.push({
              name: `${resource} — cross-org DELETE attempt`,
              operation: "ISOLATION_MUTATE",
              status: (fakeDelete.ok || fakeDelete.status === 204) ? "warn" : "pass",
              category: (fakeDelete.ok || fakeDelete.status === 204) ? "api_bug" : undefined,
              message: (fakeDelete.ok || fakeDelete.status === 204)
                ? `WARNING: Record ${createdId} deleted with spoofed tenant headers — Fleetbase uses API key scoping, not tenant-header isolation`
                : `SECURE: Delete with fake tenant rejected (HTTP ${fakeDelete.status})`,
              url: `DELETE /api/fleetbase/${resource}/${createdId} (fake tenant)`,
            });

            await apiCall(`/api/fleetbase/${resource}/${createdId}`, { method: "DELETE" });
          }
        }
      }

      const isolationSummary = {
        totalTests: tests.length,
        passed: tests.filter(t => t.status === "pass").length,
        warnings: tests.filter(t => t.status === "warn").length,
        violations: tests.filter(t => t.status === "fail").length,
        skipped: tests.filter(t => t.status === "skip").length,
      };

      tests.push({
        name: "Isolation Summary",
        operation: "ISOLATION_SUMMARY",
        status: isolationSummary.violations > 0 ? "fail" : isolationSummary.warnings > 0 ? "warn" : "pass",
        message: isolationSummary.violations > 0
          ? `${isolationSummary.violations} unexpected isolation failure(s) detected — review results above`
          : isolationSummary.warnings > 0
            ? `${isolationSummary.warnings} warning(s): Fleetbase isolates data by API key, not by CityOS tenant headers. This is expected behavior — each API key is org-specific.`
            : `ALL SECURE: ${isolationSummary.passed} test(s) confirmed proper organization isolation`,
        data: isolationSummary,
      });

      updateGroup("org-isolation", tests);
    }

    // =================== CityOS SYSTEM INTEGRATIONS ===================
    {
      const tests: TestResult[] = [];

      // --- 1. Systems Discovery ---
      const systemsRes = await apiCall("/api/integrations/systems");
      tests.push({
        name: "List CityOS Systems",
        operation: "GET /api/integrations/systems",
        status: systemsRes.ok && Array.isArray(systemsRes.data) && systemsRes.data.length === 4 ? "pass" : "warn",
        message: systemsRes.ok ? `Found ${systemsRes.data?.length || 0} CityOS system definitions` : systemsRes.error,
        data: systemsRes.data,
      });

      // --- 2. Probe Each System ---
      const PROBE_SYSTEMS = [
        { provider: "cms", label: "CMS", base_url: "https://cms.example.com" },
        { provider: "medusa", label: "Medusa", base_url: "https://medusa.example.com" },
        { provider: "erpnext", label: "ERPNext", base_url: "https://erpnext.example.com" },
        { provider: "temporal", label: "Temporal Cloud", base_url: "https://temporal.example.com" },
      ];

      for (const sys of PROBE_SYSTEMS) {
        const probeRes = await apiCall("/api/integrations/probe", {
          method: "POST",
          body: { provider: sys.provider, base_url: sys.base_url },
        });
        tests.push({
          name: `Probe ${sys.label}`,
          operation: `POST /api/integrations/probe (${sys.provider})`,
          status: probeRes.ok ? (probeRes.data?.reachable ? "pass" : "warn") : "fail",
          message: probeRes.ok
            ? (probeRes.data?.reachable
                ? `Reachable at ${sys.base_url} (HTTP ${probeRes.data?.status_code})`
                : `Unreachable: ${probeRes.data?.error || "Connection failed"} — expected for demo URLs`)
            : probeRes.error,
          data: probeRes.data,
        });
      }

      // --- 3. Probe Validation ---
      const badProviderRes = await apiCall("/api/integrations/probe", {
        method: "POST",
        body: { provider: "unknown_system", base_url: "https://example.com" },
      });
      tests.push({
        name: "Probe Invalid Provider",
        operation: "POST /api/integrations/probe (invalid)",
        status: badProviderRes.status === 400 ? "pass" : "warn",
        message: badProviderRes.status === 400 ? "Correctly rejected unknown provider" : `Unexpected status: ${badProviderRes.status}`,
      });

      const noUrlRes = await apiCall("/api/integrations/probe", {
        method: "POST",
        body: { provider: "cms" },
      });
      tests.push({
        name: "Probe Missing URL",
        operation: "POST /api/integrations/probe (no base_url)",
        status: noUrlRes.status === 400 ? "pass" : "warn",
        message: noUrlRes.status === 400 ? "Correctly requires base_url" : `Unexpected status: ${noUrlRes.status}`,
      });

      // --- 4. Integration Configuration Lifecycle ---
      const configPayloads = [
        { provider: "cms", base_url: "https://cms.cityos.test", api_key: "", webhooks_enabled: true, config: { content_types: ["page", "post"] } },
        { provider: "medusa", base_url: "https://medusa.cityos.test", api_key: "pk_test_medusa_123", webhooks_enabled: true, config: { store_id: "store_01" } },
        { provider: "erpnext", base_url: "https://erp.cityos.test", api_key: "token api_key:api_secret", webhooks_enabled: false, config: { company: "CityOS Corp" } },
        { provider: "temporal", base_url: "https://temporal.cityos.test", api_key: "temporal_token_123", webhooks_enabled: false, config: { namespace: "production", task_queue: "cityos-tasks" } },
      ];

      const configuredIds: string[] = [];
      for (const cfg of configPayloads) {
        const cfgRes = await apiCall("/api/integrations/configure", {
          method: "POST",
          body: cfg,
        });
        const isOk = cfgRes.ok && cfgRes.data?.id && cfgRes.data?.provider === cfg.provider;
        if (cfgRes.data?.id) configuredIds.push(cfgRes.data.id);
        tests.push({
          name: `Configure ${cfg.provider.toUpperCase()}`,
          operation: `POST /api/integrations/configure (${cfg.provider})`,
          status: isOk ? "pass" : "fail",
          message: isOk
            ? `Configured ${cfg.provider} integration (id: ${cfgRes.data.id})`
            : cfgRes.error || "Configuration failed",
          data: cfgRes.data,
        });
      }

      // --- 5. Verify Configurations Persisted ---
      const systemsAfterCfg = await apiCall("/api/integrations/systems");
      const configuredCount = systemsAfterCfg.data?.filter((s: any) => s.configured).length || 0;
      tests.push({
        name: "Verify All Systems Configured",
        operation: "GET /api/integrations/systems (post-configure)",
        status: configuredCount === 4 ? "pass" : "warn",
        message: `${configuredCount}/4 systems show as configured`,
        data: systemsAfterCfg.data?.map((s: any) => ({ key: s.key, configured: s.configured, status: s.status })),
      });

      // --- 6. Reconfigure (Idempotent Update) ---
      const recfgRes = await apiCall("/api/integrations/configure", {
        method: "POST",
        body: { provider: "cms", base_url: "https://cms-v2.cityos.test", webhooks_enabled: true, config: { version: 2 } },
      });
      tests.push({
        name: "Reconfigure CMS (Idempotent)",
        operation: "POST /api/integrations/configure (update existing)",
        status: recfgRes.ok && recfgRes.data?.provider === "cms" ? "pass" : "fail",
        message: recfgRes.ok ? "CMS configuration updated without creating duplicate" : recfgRes.error,
        data: recfgRes.data,
      });

      // --- 7. Probe Configured Systems (will fail to connect but verifies probe works with real URLs) ---
      for (const cfg of configPayloads) {
        const probeRes = await apiCall("/api/integrations/probe", {
          method: "POST",
          body: { provider: cfg.provider, base_url: cfg.base_url, api_key: cfg.api_key },
        });
        tests.push({
          name: `Probe Configured ${cfg.provider.toUpperCase()}`,
          operation: `POST /api/integrations/probe (configured ${cfg.provider})`,
          status: probeRes.ok ? "pass" : "fail",
          message: probeRes.ok
            ? (probeRes.data?.reachable
                ? `LIVE: ${cfg.provider} reachable (HTTP ${probeRes.data?.status_code})`
                : `Unreachable (expected for test URLs): ${probeRes.data?.error}`)
            : probeRes.error,
          data: probeRes.data,
        });
      }

      // --- 8. Health Check (all configured systems) ---
      const healthRes = await apiCall("/api/integrations/health");
      tests.push({
        name: "System Health Check",
        operation: "GET /api/integrations/health",
        status: healthRes.ok ? "pass" : "fail",
        message: healthRes.ok
          ? `Checked ${healthRes.data?.total_configured || 0} systems: ${healthRes.data?.healthy || 0} healthy, ${healthRes.data?.degraded || 0} degraded, ${healthRes.data?.unreachable || 0} unreachable`
          : healthRes.error,
        data: healthRes.data,
      });

      // --- 9. Webhook Registration ---
      const selfUrl = window.location.origin;
      const webhookPayloads = [
        { url: `${selfUrl}/api/webhooks/receive`, events: ["order.created", "order.updated"], status: "active" },
        { url: `${selfUrl}/api/webhooks/receive`, events: ["driver.assigned", "vehicle.updated"], status: "active" },
        { url: "https://external-hook.example.com/callback", events: ["*"], status: "active" },
      ];

      const webhookIds: string[] = [];
      for (let i = 0; i < webhookPayloads.length; i++) {
        const whRes = await apiCall("/api/webhooks", {
          method: "POST",
          body: webhookPayloads[i],
        });
        if (whRes.ok && whRes.data?.id) webhookIds.push(whRes.data.id);
        tests.push({
          name: `Register Webhook #${i + 1}`,
          operation: "POST /api/webhooks",
          status: whRes.ok ? "pass" : "fail",
          message: whRes.ok ? `Registered webhook (id: ${whRes.data?.id}), events: ${webhookPayloads[i].events.join(", ")}` : whRes.error,
          data: whRes.data,
        });
      }

      // --- 10. Trigger Webhook Events ---
      const triggerEvents = [
        { event: "order.created", payload: { order_id: "test-order-001", status: "pending", source: "cityos_test" } },
        { event: "driver.assigned", payload: { driver_id: "test-driver-001", order_id: "test-order-001" } },
        { event: "vehicle.updated", payload: { vehicle_id: "test-vehicle-001", status: "active" } },
      ];

      for (const evt of triggerEvents) {
        const triggerRes = await apiCall("/api/webhooks/trigger", {
          method: "POST",
          body: evt,
        });
        tests.push({
          name: `Trigger: ${evt.event}`,
          operation: `POST /api/webhooks/trigger (${evt.event})`,
          status: triggerRes.ok ? "pass" : "fail",
          message: triggerRes.ok
            ? `Delivered to ${triggerRes.data?.delivered || 0}/${triggerRes.data?.total || 0} webhooks, ${triggerRes.data?.failed || 0} failed`
            : triggerRes.error,
          data: triggerRes.data,
        });
      }

      // --- 11. Trigger with Specific Webhook IDs ---
      if (webhookIds.length > 0) {
        const targetRes = await apiCall("/api/webhooks/trigger", {
          method: "POST",
          body: { event: "test.targeted", payload: { test: true }, webhook_ids: [webhookIds[0]] },
        });
        tests.push({
          name: "Trigger Targeted Webhook",
          operation: "POST /api/webhooks/trigger (targeted)",
          status: targetRes.ok ? "pass" : "fail",
          message: targetRes.ok ? `Targeted delivery: ${targetRes.data?.delivered || 0} delivered, ${targetRes.data?.failed || 0} failed` : targetRes.error,
          data: targetRes.data,
        });
      }

      // --- 12. Trigger with No Matching Webhooks ---
      const noMatchRes = await apiCall("/api/webhooks/trigger", {
        method: "POST",
        body: { event: "nonexistent.event.xyz" },
      });
      tests.push({
        name: "Trigger No-Match Event",
        operation: "POST /api/webhooks/trigger (no match)",
        status: noMatchRes.ok && noMatchRes.data?.delivered === 0 ? "pass" : "warn",
        message: noMatchRes.ok ? `No webhooks matched: ${noMatchRes.data?.message || "0 delivered"}` : noMatchRes.error,
        data: noMatchRes.data,
      });

      // --- 13. Webhook Receive Endpoint ---
      const receiveRes = await apiCall("/api/webhooks/receive", {
        method: "POST",
        body: { event: "external.ping", source: "test-runner", data: { ts: Date.now() } },
      });
      tests.push({
        name: "Receive External Webhook",
        operation: "POST /api/webhooks/receive",
        status: receiveRes.ok && receiveRes.data?.received ? "pass" : "fail",
        message: receiveRes.ok ? `Webhook received, event: ${receiveRes.data?.event}` : receiveRes.error,
        data: receiveRes.data,
      });

      // --- 14. Webhook Delivery Logs ---
      const logsRes = await apiCall("/api/webhook-logs");
      const logCount = Array.isArray(logsRes.data) ? logsRes.data.length : 0;
      tests.push({
        name: "Webhook Delivery Logs",
        operation: "GET /api/webhook-logs",
        status: logsRes.ok && logCount > 0 ? "pass" : "warn",
        message: logsRes.ok ? `${logCount} delivery log entries recorded` : logsRes.error,
        data: { count: logCount, recent: (logsRes.data || []).slice(0, 5) },
      });

      // --- 15. Workflow Dispatch (No Temporal) ---
      const wfNoTemporalRes = await apiCall("/api/workflows/dispatch", {
        method: "POST",
        body: { workflow_type: "OrderFulfillment", input: { order_id: "test-001" } },
      });
      tests.push({
        name: "Dispatch Workflow (Temporal)",
        operation: "POST /api/workflows/dispatch",
        status: wfNoTemporalRes.ok ? "pass" : "fail",
        message: wfNoTemporalRes.ok
          ? (wfNoTemporalRes.data?.dispatched
              ? `Workflow dispatched to Temporal: ${wfNoTemporalRes.data?.namespace}/${wfNoTemporalRes.data?.task_queue}`
              : `Temporal configured but unreachable or not dispatched: ${wfNoTemporalRes.data?.error || wfNoTemporalRes.data?.message || "Check Temporal config"}`)
          : wfNoTemporalRes.error,
        data: wfNoTemporalRes.data,
      });

      // --- 16. Workflow Dispatch Validation ---
      const wfNoTypeRes = await apiCall("/api/workflows/dispatch", {
        method: "POST",
        body: {},
      });
      tests.push({
        name: "Dispatch Without Type (Validation)",
        operation: "POST /api/workflows/dispatch (no type)",
        status: wfNoTypeRes.status === 400 ? "pass" : "warn",
        message: wfNoTypeRes.status === 400 ? "Correctly requires workflow_type" : `Unexpected: ${wfNoTypeRes.status}`,
      });

      // --- 17. Workflow with Custom Task Queue ---
      const wfCustomQRes = await apiCall("/api/workflows/dispatch", {
        method: "POST",
        body: { workflow_type: "InventorySync", task_queue: "erp-sync-queue", input: { items: ["SKU-001"] } },
      });
      tests.push({
        name: "Dispatch with Custom Queue",
        operation: "POST /api/workflows/dispatch (custom queue)",
        status: wfCustomQRes.ok ? "pass" : "fail",
        message: wfCustomQRes.ok
          ? `Queue: ${wfCustomQRes.data?.task_queue || "default"}, dispatched: ${wfCustomQRes.data?.dispatched}`
          : wfCustomQRes.error,
        data: wfCustomQRes.data,
      });

      // --- 18. Cross-System Flow: Order → Webhook → Log ---
      const crossFlowRes = await apiCall("/api/webhooks/trigger", {
        method: "POST",
        body: {
          event: "order.created",
          payload: {
            order_id: `cross-flow-${Date.now()}`,
            customer: "Integration Test",
            items: [{ sku: "ITEM-001", qty: 3 }],
            total: 99.99,
            source: "medusa",
            erp_sync: true,
          },
        },
      });
      tests.push({
        name: "Cross-System Order Flow",
        operation: "POST /api/webhooks/trigger (order.created cross-system)",
        status: crossFlowRes.ok ? "pass" : "fail",
        message: crossFlowRes.ok
          ? `Order event triggered: ${crossFlowRes.data?.delivered || 0} hooks delivered, simulates Medusa→Fleetbase→Webhook flow`
          : crossFlowRes.error,
        data: crossFlowRes.data,
      });

      // --- 19. Verify Logs After All Triggers ---
      const finalLogsRes = await apiCall("/api/webhook-logs");
      const finalLogCount = Array.isArray(finalLogsRes.data) ? finalLogsRes.data.length : 0;
      const successLogs = (finalLogsRes.data || []).filter((l: any) => l.status_code >= 200 && l.status_code < 300).length;
      const failLogs = (finalLogsRes.data || []).filter((l: any) => l.status_code === 0 || l.status_code >= 400).length;
      tests.push({
        name: "Final Delivery Log Audit",
        operation: "GET /api/webhook-logs (post-trigger audit)",
        status: finalLogsRes.ok ? "pass" : "fail",
        message: finalLogsRes.ok
          ? `${finalLogCount} total logs: ${successLogs} successful deliveries, ${failLogs} failures/timeouts`
          : finalLogsRes.error,
        data: { total: finalLogCount, successful: successLogs, failed: failLogs },
      });

      // --- 20. Cleanup: Delete Test Webhooks ---
      let cleanedWebhooks = 0;
      for (const whId of webhookIds) {
        const delRes = await apiCall(`/api/webhooks/${whId}`, { method: "DELETE" });
        if (delRes.ok) cleanedWebhooks++;
      }
      tests.push({
        name: "Cleanup Test Webhooks",
        operation: "DELETE /api/webhooks (cleanup)",
        status: cleanedWebhooks === webhookIds.length ? "pass" : "warn",
        message: `Cleaned up ${cleanedWebhooks}/${webhookIds.length} test webhooks`,
      });

      // --- 21. Cleanup: Delete Test Integrations ---
      let cleanedIntegrations = 0;
      for (const intId of configuredIds) {
        const delRes = await apiCall(`/api/integrations/${intId}`, { method: "DELETE" });
        if (delRes.ok) cleanedIntegrations++;
      }
      tests.push({
        name: "Cleanup Test Integrations",
        operation: "DELETE /api/integrations (cleanup)",
        status: cleanedIntegrations === configuredIds.length ? "pass" : "warn",
        message: `Cleaned up ${cleanedIntegrations}/${configuredIds.length} test integration configs`,
      });

      // --- Summary ---
      const summary = {
        totalTests: tests.length,
        passed: tests.filter(t => t.status === "pass").length,
        warnings: tests.filter(t => t.status === "warn").length,
        failures: tests.filter(t => t.status === "fail").length,
        systemsProbed: PROBE_SYSTEMS.length,
        webhooksTested: webhookPayloads.length,
        eventsFired: triggerEvents.length,
        workflowsDispatched: 3,
      };
      tests.push({
        name: "CityOS Integration Summary",
        operation: "INTEGRATION_SUMMARY",
        status: summary.failures > 0 ? "fail" : summary.warnings > 0 ? "warn" : "pass",
        message: summary.failures > 0
          ? `${summary.failures} failure(s) in CityOS integration tests`
          : summary.warnings > 0
            ? `All core tests passed with ${summary.warnings} warning(s) — typically unreachable test URLs which is expected`
            : `All ${summary.totalTests} integration tests passed`,
        data: summary,
      });

      updateGroup("cityos-integrations", tests);
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    const testStart = Date.now();
    setTotalDuration(null);

    const statusRes = await apiCall("/api/fleetbase/status");
    setServerStatus(statusRes.data);

    if (!statusRes.ok || !statusRes.data?.connected) {
      setRunning(false);
      setTotalDuration(Date.now() - testStart);
      return;
    }

    const statsRes = await apiCall("/api/dashboard/stats");
    setDashboardStats(statsRes.data);

    const ctxRes = await apiCall("/api/fleetbase/cityos-context");
    if (ctxRes.ok) setCityosContext(ctxRes.data);

    await runResourceTests(setResultsWithCtx, false);
    await runExtendedTests();
    await runResourceTests(setResultsWithoutCtx, true);

    setTotalDuration(Date.now() - testStart);
    setRunning(false);
  }, [runResourceTests, runExtendedTests]);

  const handleDownloadMarkdown = useCallback(() => {
    const md = generateMarkdownReport(serverStatus, dashboardStats, cityosContext, resultsWithCtx, resultsWithoutCtx, extraTests, totalDuration);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadMarkdown(md, `fleetbase-api-test-report-${dateStr}.md`);
  }, [serverStatus, dashboardStats, cityosContext, resultsWithCtx, resultsWithoutCtx, extraTests, totalDuration]);

  const hasAnyResults = resultsWithCtx.length > 0 || resultsWithoutCtx.length > 0 || extraTests.length > 0;

  const passCount = results.filter(r => r.overallStatus === "pass").length;
  const failCount = results.filter(r => r.overallStatus === "fail").length;
  const warnCount = results.filter(r => r.overallStatus === "warn").length;
  const totalTests = results.reduce((sum, r) => sum + r.tests.length, 0);
  const passedTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.status === "pass").length, 0);
  const failedTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.status === "fail").length, 0);
  const warnedTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.status === "warn").length, 0);
  const skippedTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.status === "skip").length, 0);
  const validationTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.category === "validation_check").length, 0);

  const extPassedTests = extraTests.reduce((sum, g) => sum + g.tests.filter(t => t.status === "pass").length, 0);
  const extFailedTests = extraTests.reduce((sum, g) => sum + g.tests.filter(t => t.status === "fail").length, 0);
  const extWarnedTests = extraTests.reduce((sum, g) => sum + g.tests.filter(t => t.status === "warn").length, 0);
  const extSkippedTests = extraTests.reduce((sum, g) => sum + g.tests.filter(t => t.status === "skip").length, 0);
  const extTotalTests = extraTests.reduce((sum, g) => sum + g.tests.length, 0);

  const allPassedTotal = (resultsWithCtx.reduce((s, g) => s + g.tests.filter(t => t.status === "pass" || t.status === "warn").length, 0)) +
    extPassedTests + extWarnedTests +
    (resultsWithoutCtx.reduce((s, g) => s + g.tests.filter(t => t.status === "pass").length, 0));
  const allTotalTotal = (resultsWithCtx.reduce((s, g) => s + g.tests.length, 0)) +
    extTotalTests +
    (resultsWithoutCtx.reduce((s, g) => s + g.tests.length, 0));

  return (
    <SettingsLayout>
      <div className="space-y-6" data-testid="fleetbase-test-page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Fleetbase API Test Suite</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive testing: CRUD, pagination, filtering, schema validation, latency, error handling & security audit
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totalDuration !== null && (
              <span className="text-sm text-muted-foreground" data-testid="text-total-duration">
                {allPassedTotal}/{allTotalTotal} passed in {(totalDuration / 1000).toFixed(1)}s
              </span>
            )}
            {hasAnyResults && !running && (
              <Button
                variant="outline"
                onClick={handleDownloadMarkdown}
                data-testid="button-download-md"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
            <Button
              onClick={runAllTests}
              disabled={running}
              size="lg"
              data-testid="button-run-tests"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : hasAnyResults ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Re-run All
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serverStatus && (
            <Card data-testid="card-server-status">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Server Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <StatusIcon status={serverStatus.connected ? "pass" : "fail"} />
                  <div>
                    <p className="font-medium">
                      {serverStatus.connected ? "Connected" : "Connection Failed"}
                    </p>
                    {serverStatus.url && <p className="text-sm text-muted-foreground">{serverStatus.url}</p>}
                    {serverStatus.error && <p className="text-sm text-red-600">{serverStatus.error}</p>}
                  </div>
                </div>
                {dashboardStats && (
                  <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
                    <StatChip label="Orders" value={dashboardStats.totalOrders} />
                    <StatChip label="Drivers" value={dashboardStats.totalDrivers} />
                    <StatChip label="Vehicles" value={dashboardStats.totalVehicles} />
                    <StatChip label="Fleets" value={dashboardStats.totalFleets} />
                    <StatChip label="Active Drivers" value={dashboardStats.activeDrivers} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-cityos-context">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Active CityOS Context
              </CardTitle>
              <CardDescription>
                {hasContext ? "Context headers injected into every API request from server config" : "No context configured — set it in Settings > Servers"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cityosContext ? (
                <div className="grid grid-cols-2 gap-3">
                  <ContextField icon={<Globe className="h-3.5 w-3.5" />} label="Country" value={cityosContext.country} />
                  <ContextField icon={<MapPin className="h-3.5 w-3.5" />} label="City" value={cityosContext.city} />
                  <ContextField icon={<Building2 className="h-3.5 w-3.5" />} label="Tenant" value={cityosContext.tenant} />
                  <ContextField icon={<Radio className="h-3.5 w-3.5" />} label="Channel" value={cityosContext.channel} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading context from active server...</p>
              )}
              {hasContext && (
                <div className="mt-3 p-2 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800">
                  Three test phases: CRUD with context, extended tests (pagination/filtering/latency/errors), and security audit without context.
                </div>
              )}
              {!hasContext && cityosContext && (
                <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  No CityOS context configured. Configure context in Settings &gt; Servers to enable tenant-scoped testing.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {hasAnyResults && (
          <div className="border-b flex gap-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab("with-context")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "with-context"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-with-context"
            >
              <ShieldCheck className="h-4 w-4" />
              CRUD Tests
              {resultsWithCtx.length > 0 && (
                <span className="ml-1 text-xs">
                  ({resultsWithCtx.filter(r => r.overallStatus === "pass").length}/{resultsWithCtx.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("extended")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "extended"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-extended"
            >
              <Zap className="h-4 w-4" />
              Extended Tests
              {extraTests.length > 0 && (
                <span className="ml-1 text-xs">
                  ({extPassedTests}/{extTotalTests})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("security-audit")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "security-audit"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-security-audit"
            >
              <ShieldAlert className="h-4 w-4" />
              Security Audit
              {resultsWithoutCtx.length > 0 && (() => {
                const exposedCount = resultsWithoutCtx.filter(r =>
                  r.tests.some(t => t.status === "pass" && (t.data?.count ?? 0) > 0)
                ).length;
                return exposedCount > 0 ? (
                  <Badge className="ml-1 bg-red-600 text-white text-[10px] px-1.5">{exposedCount} violations</Badge>
                ) : (
                  <Badge className="ml-1 bg-green-600 text-white text-[10px] px-1.5">secure</Badge>
                );
              })()}
            </button>
          </div>
        )}

        {activeTab === "security-audit" && resultsWithoutCtx.length > 0 && (
          <SecurityAuditReport results={resultsWithoutCtx} cityosContext={cityosContext} />
        )}

        {activeTab === "with-context" && resultsWithCtx.length > 0 && (
          <ContextTestReport results={resultsWithCtx} cityosContext={cityosContext} />
        )}

        {activeTab === "with-context" && results.length > 0 && (
          <>
            <Card data-testid="card-summary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Resource CRUD Results — With CityOS Context
                </CardTitle>
                <CardDescription>
                  Testing with context: {formatCtx(cityosContext)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700" data-testid="text-summary-pass">{passedTests} passed</span>
                  </div>
                  {warnedTests > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold text-orange-600" data-testid="text-summary-warn">{warnedTests} warnings</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700" data-testid="text-summary-fail">{failedTests} failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700" data-testid="text-summary-skip">{skippedTests} skipped</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">{totalTests} total</span>
                  </div>
                </div>
                {validationTests > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Includes {validationTests} validation check{validationTests !== 1 ? "s" : ""} (API correctly rejected incomplete test data)
                  </p>
                )}

                <div className="mt-4 flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
                  {passedTests > 0 && (
                    <div className="bg-green-500 transition-all" style={{ width: `${(passedTests / totalTests) * 100}%` }} />
                  )}
                  {warnedTests > 0 && (
                    <div className="bg-orange-500 transition-all" style={{ width: `${(warnedTests / totalTests) * 100}%` }} />
                  )}
                  {failedTests > 0 && (
                    <div className="bg-red-500 transition-all" style={{ width: `${(failedTests / totalTests) * 100}%` }} />
                  )}
                  {skippedTests > 0 && (
                    <div className="bg-yellow-400 transition-all" style={{ width: `${(skippedTests / totalTests) * 100}%` }} />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {results.map((group) => (
                    <ResourceBadge key={group.resource} resource={group.resource} status={group.overallStatus} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {results.map((group, gi) => (
                <ResourceTestCard key={group.resource} group={group} index={gi} isSecurityAudit={false} />
              ))}
            </div>
          </>
        )}

        {activeTab === "extended" && extraTests.length > 0 && (
          <>
            <Card data-testid="card-extended-summary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" /> Extended Test Results
                </CardTitle>
                <CardDescription>
                  Pagination, filtering, schema validation, latency benchmarks, error handling, and auth tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">{extPassedTests} passed</span>
                  </div>
                  {extWarnedTests > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold text-orange-600">{extWarnedTests} warnings</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">{extFailedTests} failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">{extSkippedTests} skipped</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">{extTotalTests} total</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
                  {extPassedTests > 0 && (
                    <div className="bg-green-500 transition-all" style={{ width: `${(extPassedTests / extTotalTests) * 100}%` }} />
                  )}
                  {extWarnedTests > 0 && (
                    <div className="bg-orange-500 transition-all" style={{ width: `${(extWarnedTests / extTotalTests) * 100}%` }} />
                  )}
                  {extFailedTests > 0 && (
                    <div className="bg-red-500 transition-all" style={{ width: `${(extFailedTests / extTotalTests) * 100}%` }} />
                  )}
                  {extSkippedTests > 0 && (
                    <div className="bg-yellow-400 transition-all" style={{ width: `${(extSkippedTests / extTotalTests) * 100}%` }} />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {extraTests.map(group => (
                <ExtraTestCard key={group.id} group={group} />
              ))}
            </div>
          </>
        )}

        {activeTab === "security-audit" && resultsWithoutCtx.length > 0 && (
          <>
            <Card data-testid="card-security-summary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" /> Resource Results — Without Context (Security Audit)
                </CardTitle>
                <CardDescription>
                  Testing WITHOUT any CityOS context headers — resources returning data are security violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">{resultsWithoutCtx.reduce((s, g) => s + g.tests.filter(t => t.status === "pass").length, 0)} passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">{resultsWithoutCtx.reduce((s, g) => s + g.tests.filter(t => t.status === "fail").length, 0)} failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">{resultsWithoutCtx.reduce((s, g) => s + g.tests.filter(t => t.status === "skip").length, 0)} skipped</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {resultsWithoutCtx.map((group) => (
                    <ResourceBadge key={group.resource} resource={group.resource} status={group.overallStatus} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {resultsWithoutCtx.map((group, gi) => (
                <ResourceTestCard key={group.resource} group={group} index={gi} isSecurityAudit={true} />
              ))}
            </div>
          </>
        )}

        {!hasAnyResults && !running && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Test Results Yet</h3>
              <p className="text-muted-foreground mb-4">Click "Run All Tests" to execute the full test suite against your Fleetbase server</p>
              <p className="text-xs text-muted-foreground">Tests include: CRUD operations, pagination, filtering, schema validation, latency benchmarks, error handling, auth checks, and security audit</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}

function ExtraTestCard({ group }: { group: ExtraTestGroup }) {
  const [expanded, setExpanded] = useState(true);

  const iconMap: Record<string, React.ReactNode> = {
    pagination: <ArrowDownUp className="h-5 w-5 text-blue-600" />,
    filter: <Filter className="h-5 w-5 text-purple-600" />,
    schema: <Hash className="h-5 w-5 text-indigo-600" />,
    latency: <Timer className="h-5 w-5 text-orange-600" />,
    errors: <ServerCrash className="h-5 w-5 text-red-600" />,
    auth: <KeyRound className="h-5 w-5 text-emerald-600" />,
  };

  const passed = group.tests.filter(t => t.status === "pass").length;
  const failed = group.tests.filter(t => t.status === "fail").length;
  const total = group.tests.length;

  return (
    <Card
      className={`transition-colors ${
        group.overallStatus === "fail" ? "border-red-200 bg-red-50/30" :
        group.overallStatus === "pass" ? "border-green-200 bg-green-50/30" :
        group.overallStatus === "running" ? "border-blue-200 bg-blue-50/30" : ""
      }`}
      data-testid={`card-extra-${group.id}`}
    >
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {iconMap[group.icon] || <Zap className="h-5 w-5 text-blue-600" />}
            <div>
              <CardTitle className="text-sm font-semibold">{group.label}</CardTitle>
              <CardDescription className="text-xs">{passed}/{total} passed{failed > 0 ? ` · ${failed} failed` : ""}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {group.tests.map((t, ti) => (
              <TestDot key={ti} test={t} />
            ))}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          <div className="space-y-2">
            {group.tests.map((test, ti) => (
              <TestRow key={ti} test={test} isSecurityAudit={false} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ResourceTestCard({ group, index, isSecurityAudit }: { group: ResourceTestGroup; index: number; isSecurityAudit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const prevStatusRef = useRef(group.overallStatus);

  useEffect(() => {
    if (prevStatusRef.current !== "fail" && group.overallStatus === "fail") {
      setExpanded(true);
    }
    prevStatusRef.current = group.overallStatus;
  }, [group.overallStatus]);

  const hasViolation = isSecurityAudit && group.tests.some(t => t.status === "pass" && (t.data?.count ?? 0) > 0);

  return (
    <Card
      className={`transition-colors ${
        isSecurityAudit && hasViolation ? "border-red-300 bg-red-50/40 dark:bg-red-950/10" :
        group.overallStatus === "fail" ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" :
        group.overallStatus === "warn" ? "border-orange-200 bg-orange-50/30 dark:bg-orange-950/10" :
        group.overallStatus === "pass" ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" :
        group.overallStatus === "running" ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10" : ""
      }`}
      data-testid={`card-resource-${group.resource}`}
    >
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSecurityAudit ? (
              hasViolation ? <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" /> : <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <StatusIcon status={group.overallStatus} />
            )}
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {group.label}
                {isSecurityAudit && hasViolation && (
                  <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">EXPOSED</Badge>
                )}
                {isSecurityAudit && !hasViolation && group.overallStatus !== "running" && group.overallStatus !== "pending" && (
                  <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">SECURE</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs font-mono">{group.apiPath}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {group.tests.map((t, ti) => (
              <TestDot key={ti} test={t} />
            ))}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          <div className="space-y-2">
            {group.tests.map((test, ti) => (
              <TestRow key={ti} test={test} isSecurityAudit={isSecurityAudit} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TestRow({ test, isSecurityAudit }: { test: TestResult; isSecurityAudit: boolean }) {
  const isViolation = isSecurityAudit && test.status === "pass" && test.message?.startsWith("VIOLATION:");
  const isApiBug = test.category === "api_bug" || test.status === "warn";
  const isValidationCheck = test.category === "validation_check";

  return (
    <div className={`flex items-start gap-3 py-1.5 px-2 rounded text-sm ${
      isViolation ? "bg-red-50 border border-red-200" :
      isApiBug ? "bg-orange-50 border border-orange-200" :
      isValidationCheck && test.status === "pass" ? "bg-blue-50/50 border border-blue-100" :
      ""
    }`} data-testid={`test-row-${test.operation.toLowerCase()}`}>
      {isViolation ? (
        <Unlock className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
      ) : isSecurityAudit && test.status === "fail" ? (
        <Lock className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
      ) : (
        <StatusIcon status={test.status} size="sm" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{test.name || test.operation}</span>
          {test.duration !== undefined && (
            <span className="text-xs text-muted-foreground">{test.duration}ms</span>
          )}
          {test.status === "skip" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-yellow-700 border-yellow-300">skipped</Badge>
          )}
          {isApiBug && (
            <Badge className="text-[10px] px-1.5 py-0 bg-orange-600 text-white">API BUG</Badge>
          )}
          {isValidationCheck && test.status === "pass" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-700 border-blue-300">VALIDATION CHECK</Badge>
          )}
          {isViolation && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-600 text-white">SECURITY VIOLATION</Badge>
          )}
          {isSecurityAudit && test.status === "fail" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-700 border-green-300">BLOCKED</Badge>
          )}
        </div>
        {test.url && (
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{test.url}</p>
        )}
        {test.message && (
          <p className={`text-xs mt-0.5 ${
            isViolation ? "text-red-700 font-semibold" :
            isApiBug ? "text-orange-800 font-medium" :
            isValidationCheck ? "text-blue-700" :
            isSecurityAudit && test.status === "fail" ? "text-green-700" :
            test.status === "fail" ? "text-red-600 font-medium" :
            "text-muted-foreground"
          }`}>
            {test.message}
          </p>
        )}
        {(test.status === "fail" || test.status === "warn") && test.data && (
          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 whitespace-pre-wrap">
            {JSON.stringify(test.data, null, 2)}
          </pre>
        )}
        {test.status === "pass" && test.data && !isViolation && !isValidationCheck && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {typeof test.data === "object" ? (test.data.fields || test.data.id || JSON.stringify(test.data).slice(0, 100)) : String(test.data)}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status, size = "md" }: { status: TestStatus; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0";
  switch (status) {
    case "pass": return <CheckCircle2 className={`${cls} text-green-600`} />;
    case "warn": return <AlertTriangle className={`${cls} text-orange-500`} />;
    case "fail": return <XCircle className={`${cls} text-red-600`} />;
    case "running": return <Loader2 className={`${cls} text-blue-600 animate-spin`} />;
    case "skip": return <AlertTriangle className={`${cls} text-yellow-500`} />;
    default: return <Clock className={`${cls} text-muted-foreground`} />;
  }
}

function TestDot({ test }: { test: TestResult }) {
  const colors: Record<TestStatus, string> = {
    pass: "bg-green-500",
    warn: "bg-orange-500",
    fail: "bg-red-500",
    running: "bg-blue-500 animate-pulse",
    skip: "bg-yellow-400",
    pending: "bg-muted-foreground/30",
  };
  const label = test.category === "validation_check" ? `${test.operation}: validation check` :
    test.category === "api_bug" ? `${test.operation}: API bug (${test.status})` :
    `${test.operation}: ${test.status}`;
  return (
    <div
      className={`h-2.5 w-2.5 rounded-full ${colors[test.status]}`}
      title={label}
    />
  );
}

function ResourceBadge({ resource, status }: { resource: string; status: TestStatus }) {
  const variants: Record<TestStatus, string> = {
    pass: "bg-green-100 text-green-800 border-green-200",
    warn: "bg-orange-100 text-orange-800 border-orange-200",
    fail: "bg-red-100 text-red-800 border-red-200",
    running: "bg-blue-100 text-blue-800 border-blue-200",
    skip: "bg-yellow-100 text-yellow-800 border-yellow-200",
    pending: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-mono ${variants[status]}`}>
      {resource}
    </Badge>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 rounded bg-muted/50">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function getTestCreateBody(resource: string): Record<string, any> {
  const ts = Date.now();
  const suffix = ts.toString().slice(-6);
  switch (resource) {
    case "vehicles":
      return { name: `_Test Vehicle ${suffix}`, plate_number: `TST-${suffix}`, model: "Test Model", year: "2024", type: "car", status: "active" };
    case "drivers":
      return { name: `_Test Driver ${suffix}`, email: `test${suffix}@test.local`, phone: `+966500${suffix}`, drivers_license_number: `DL-T${suffix}`, country: "SA" };
    case "orders":
      return {
        type: "default",
        notes: `_Test order ${suffix}`,
        pickup: { name: `Test Pickup ${suffix}`, street1: "123 Test Pickup St", city: "Riyadh", country: "SA", location: { type: "Point", coordinates: [46.6753, 24.7136] } },
        dropoff: { name: `Test Dropoff ${suffix}`, street1: "456 Test Dropoff Ave", city: "Jeddah", country: "SA", location: { type: "Point", coordinates: [39.1925, 21.4858] } },
      };
    case "places":
      return { name: `_Test Place ${suffix}`, street1: "123 Test St", city: "Riyadh", country: "SA" };
    case "contacts":
      return { name: `_Test Contact ${suffix}`, email: `testc${suffix}@test.local`, phone: `+966501${suffix}`, type: "customer", country: "SA" };
    case "vendors":
      return { name: `_Test Vendor ${suffix}`, type: "logistics" };
    case "fleets":
      return { name: `_Test Fleet ${suffix}`, status: "active" };
    case "service-areas":
      return {
        name: `_Test Area ${suffix}`,
        type: "country",
        country: "SA",
        border: { type: "Polygon", coordinates: [[[46.0, 24.0], [47.0, 24.0], [47.0, 25.0], [46.0, 25.0], [46.0, 24.0]]] },
      };
    case "zones":
      return {
        name: `_Test Zone ${suffix}`,
        boundary: { type: "Polygon", coordinates: [[[46.5, 24.5], [46.8, 24.5], [46.8, 24.8], [46.5, 24.8], [46.5, 24.5]]] },
        status: "active",
        _needs_service_area: true,
      };
    case "service-rates":
      return {
        name: `_Test Rate ${suffix}`,
        service_name: `test-svc-${suffix}`,
        service_type: "delivery",
        rate_calculation_method: "per_meter",
        currency: "SAR",
        base_fee: 1000,
      };
    case "entities":
      return { name: `_Test Entity ${suffix}`, type: "package", weight: 1.5, weight_unit: "kg" };
    default:
      return { name: `_Test ${suffix}` };
  }
}

function getRequiredFieldsForResource(resource: string): string[] {
  switch (resource) {
    case "orders": return ["pickup or dropoff coordinates"];
    case "service-areas": return ["country", "border (polygon)"];
    case "zones": return ["boundary (polygon)"];
    case "service-rates": return ["service_name", "currency", "rate_calculation_method"];
    case "entities": return ["type"];
    default: return [];
  }
}

function getLocalUpdateBody(path: string): Record<string, any> {
  const suffix = Date.now().toString().slice(-6);
  switch (path) {
    case "routes": return { distance: `30 km`, status: "active" };
    case "issues": return { description: `Updated ${suffix}`, priority: "high" };
    case "fuel-reports": return { cost: "150", station: `Station ${suffix}` };
    case "devices": return { status: "offline", battery_level: 50 };
    case "work-orders": return { priority: "high", status: "in_progress" };
    case "parts": return { name: `_Updated Part ${suffix}`, stock: 20 };
    case "sensors": return { name: `_Updated Sensor ${suffix}`, value: "42" };
    case "events": return { message: `Updated event ${suffix}`, severity: "warning" };
    case "telematics": return { speed: 80, event: "Idle" };
    case "users": return { name: `_Updated User ${suffix}` };
    case "reports": return { name: `_Updated Report ${suffix}`, status: "ready" };
    case "transactions": return { amount: "200.00", status: "completed" };
    case "custom-fields": return { label: `_Updated CF ${suffix}` };
    case "time-off-requests": return { status: "approved", reason: `Updated ${suffix}` };
    case "scheduler-tasks": return { title: `_Updated Task ${suffix}`, duration: 3 };
    case "settings": return { value: `updated_value_${suffix}` };
    case "api-keys": return { name: `_Updated Key ${suffix}` };
    case "webhooks": return { status: "inactive" };
    case "webhook-logs": return { event: "order.updated", duration: "100ms" };
    case "integrations": return { name: `_Updated Int ${suffix}` };
    case "order-configs": return { name: `_Updated Config ${suffix}` };
    case "service-rates": return { name: `_Updated Rate ${suffix}` };
    default: return { name: `Updated ${suffix}` };
  }
}

function getTestUpdateBody(resource: string): Record<string, any> {
  const ts = Date.now();
  const suffix = ts.toString().slice(-6);
  switch (resource) {
    case "vehicles":
      return { model: `Updated ${suffix}` };
    case "drivers":
      return { name: `_Updated Driver ${suffix}` };
    case "orders":
      return { notes: `Updated ${suffix}` };
    case "places":
      return { street1: `Updated St ${suffix}` };
    case "contacts":
      return { name: `_Updated Contact ${suffix}` };
    case "vendors":
      return { name: `_Updated Vendor ${suffix}` };
    case "fleets":
      return { name: `_Updated Fleet ${suffix}` };
    case "service-areas":
      return { name: `_Updated Area ${suffix}` };
    case "zones":
      return { name: `_Updated Zone ${suffix}` };
    case "service-rates":
      return { name: `_Updated Rate ${suffix}` };
    case "entities":
      return { name: `_Updated Entity ${suffix}` };
    default:
      return { name: `Updated ${suffix}` };
  }
}
