import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Order, Driver, Vehicle, Fleet, Place, Contact, Vendor,
  ServiceArea, Zone, Route, Issue, FuelReport, Device, WorkOrder,
  ServiceRate, Part, Sensor, Event, TelematicsRecord, Report, Transaction, User, CustomField,
  TimeOffRequest, SchedulerTask, Setting,
  ApiKey, Webhook, WebhookLog, Integration, OrderConfig,
  Entity, Payload, TrackingNumber, TrackingStatus, ServiceQuote, PurchaseRate,
  FleetbaseServer,
} from "@shared/schema";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const existingHeaders = options?.headers as Record<string, string> | undefined;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...existingHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface ListQueryOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  retry?: boolean | number;
}

const FLEETBASE_RESOURCES = new Set([
  "vehicles", "orders", "places", "contacts", "vendors", "fleets",
  "service-areas", "zones", "service-rates", "entities", "payloads",
  "tracking-numbers", "tracking-statuses", "service-quotes", "purchase-rates"
]);

function buildListUrl(
  basePath: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const params = new URLSearchParams();
  for (const [paramKey, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(paramKey, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function createEntityHooks<T extends { id?: string }>(path: string) {
  const key = [path];
  const isFleetbaseResource = FLEETBASE_RESOURCES.has(path);
  const basePath = isFleetbaseResource ? `/api/fleetbase/${path}` : `/api/${path}`;

  function useList(options?: ListQueryOptions) {
    const listUrl = buildListUrl(basePath, options?.query);

    return useQuery<T[]>({
      queryKey: [...key, options?.query ?? {}],
      queryFn: () => apiFetch<T[]>(listUrl),
      enabled: options?.enabled ?? true,
      staleTime: options?.staleTime ?? (isFleetbaseResource ? 5 * 60 * 1000 : 0),
      refetchInterval: options?.refetchInterval,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? !isFleetbaseResource,
      retry: options?.retry ?? (isFleetbaseResource ? 1 : 3),
    });
  }

  function useById(id: string | undefined) {
    return useQuery<T>({
      queryKey: [...key, id],
      queryFn: () => apiFetch<T>(`${basePath}/${id}`),
      enabled: !!id,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: Partial<T>) =>
        apiFetch<T>(basePath, { method: "POST", body: JSON.stringify(data) }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: { id: string } & Partial<T>) =>
        apiFetch<T>(`${basePath}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        apiFetch<void>(`${basePath}/${id}`, { method: "DELETE" }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  return { useList, useById, useCreate, useUpdate, useDelete };
}

export const ordersApi = createEntityHooks<Order>("orders");
export const driversApi = (() => {
  const key = ["drivers"];
  const fleetbasePath = "/api/fleetbase/drivers";
  const localPath = "/api/drivers";

  function useList(options?: ListQueryOptions) {
    const fleetbaseUrl = buildListUrl(fleetbasePath, options?.query);
    const localUrl = buildListUrl(localPath, options?.query);

    return useQuery<Driver[]>({
      queryKey: [...key, options?.query ?? {}],
      queryFn: async () => {
        const fleetbaseDrivers = await apiFetch<Driver[]>(fleetbaseUrl).catch(() => null);
        if (Array.isArray(fleetbaseDrivers) && fleetbaseDrivers.length > 0) {
          return fleetbaseDrivers;
        }

        return apiFetch<Driver[]>(localUrl);
      },
      enabled: options?.enabled ?? true,
      staleTime: options?.staleTime ?? 30 * 1000,
      refetchInterval: options?.refetchInterval,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
      retry: options?.retry ?? 0,
    });
  }

  function useById(id: string | undefined) {
    return useQuery<Driver>({
      queryKey: [...key, id],
      queryFn: async () => {
        const fleetbaseDriver = await apiFetch<Driver>(`${fleetbasePath}/${id}`).catch(() => null);
        if (fleetbaseDriver) return fleetbaseDriver;
        return apiFetch<Driver>(`${localPath}/${id}`);
      },
      enabled: !!id,
      retry: 0,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: Partial<Driver>) =>
        apiFetch<Driver>(fleetbasePath, { method: "POST", body: JSON.stringify(data) }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: { id: string } & Partial<Driver>) =>
        apiFetch<Driver>(`${fleetbasePath}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        apiFetch<void>(`${fleetbasePath}/${id}`, { method: "DELETE" }),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  return { useList, useById, useCreate, useUpdate, useDelete };
})();
export const vehiclesApi = createEntityHooks<Vehicle>("vehicles");
export const fleetsApi = createEntityHooks<Fleet>("fleets");
export const placesApi = createEntityHooks<Place>("places");
export const contactsApi = createEntityHooks<Contact>("contacts");
export const vendorsApi = createEntityHooks<Vendor>("vendors");
export const serviceAreasApi = createEntityHooks<ServiceArea>("service-areas");
export const zonesApi = createEntityHooks<Zone>("zones");
export const serviceZonesApi = zonesApi;
export const routesApi = createEntityHooks<Route>("routes");
export const issuesApi = createEntityHooks<Issue>("issues");
export const fuelReportsApi = createEntityHooks<FuelReport>("fuel-reports");
export const devicesApi = createEntityHooks<Device>("devices");
export const workOrdersApi = createEntityHooks<WorkOrder>("work-orders");
export const serviceRatesApi = createEntityHooks<ServiceRate>("service-rates");
export const partsApi = createEntityHooks<Part>("parts");
export const sensorsApi = createEntityHooks<Sensor>("sensors");
export const eventsApi = createEntityHooks<Event>("events");
export const telematicsApi = createEntityHooks<TelematicsRecord>("telematics");
export const reportsApi = createEntityHooks<Report>("reports");
export const transactionsApi = createEntityHooks<Transaction>("transactions");
export const usersApi = createEntityHooks<User>("users");
export const customFieldsApi = createEntityHooks<CustomField>("custom-fields");
export const timeOffRequestsApi = createEntityHooks<TimeOffRequest>("time-off-requests");
export const schedulerTasksApi = createEntityHooks<SchedulerTask>("scheduler-tasks");
export const settingsApi = createEntityHooks<Setting>("settings");
export const apiKeysApi = createEntityHooks<ApiKey>("api-keys");
export const webhooksApi = createEntityHooks<Webhook>("webhooks");
export const webhookLogsApi = createEntityHooks<WebhookLog>("webhook-logs");
export const integrationsApi = createEntityHooks<Integration>("integrations");
export const orderConfigsApi = createEntityHooks<OrderConfig>("order-configs");
export const entitiesApi = createEntityHooks<Entity>("entities");
export const payloadsApi = createEntityHooks<Payload>("payloads");
export const trackingNumbersApi = createEntityHooks<TrackingNumber>("tracking-numbers");
export const trackingStatusesApi = createEntityHooks<TrackingStatus>("tracking-statuses");
export const serviceQuotesApi = createEntityHooks<ServiceQuote>("service-quotes");
export const purchaseRatesApi = createEntityHooks<PurchaseRate>("purchase-rates");

export interface FleetbaseStatus {
  configured: boolean;
  connected: boolean;
  url?: string;
  error?: string;
}

export function useFleetbaseStatus() {
  return useQuery<FleetbaseStatus>({
    queryKey: ["fleetbase-status"],
    queryFn: () => apiFetch<FleetbaseStatus>("/api/fleetbase/status"),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useFleetbaseServers() {
  return useQuery<FleetbaseServer[]>({
    queryKey: ["fleetbase-servers"],
    queryFn: () => apiFetch<FleetbaseServer[]>("/api/fleetbase-servers"),
  });
}

export function useActiveFleetbaseServer() {
  return useQuery<FleetbaseServer | null>({
    queryKey: ["fleetbase-servers", "active"],
    queryFn: () => apiFetch<FleetbaseServer | null>("/api/fleetbase-servers/active"),
  });
}

export function useCreateFleetbaseServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; organization?: string; url: string; api_key: string; cityos_country?: string; cityos_city?: string; cityos_tenant?: string; cityos_channel?: string }) =>
      apiFetch<FleetbaseServer>("/api/fleetbase-servers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleetbase-servers"] }),
  });
}

export function useUpdateFleetbaseServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<FleetbaseServer>) =>
      apiFetch<FleetbaseServer>(`/api/fleetbase-servers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleetbase-servers"] }),
  });
}

export function useDeleteFleetbaseServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/fleetbase-servers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleetbase-servers"] }),
  });
}

export function useActivateFleetbaseServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<FleetbaseServer>(`/api/fleetbase-servers/${id}/activate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleetbase-servers"] });
      qc.invalidateQueries({ queryKey: ["fleetbase-status"] });
      qc.invalidateQueries();
    },
  });
}

export function useTestFleetbaseServer() {
  return useMutation({
    mutationFn: (data: { url: string; api_key: string }) =>
      apiFetch<{ connected: boolean; url: string; error?: string; organization?: string; country?: string; city?: string; tenant?: string; channel?: string }>("/api/fleetbase-servers/test", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useSettingsByCategory(category: string) {
  return useQuery<Setting[]>({
    queryKey: ["settings", "category", category],
    queryFn: () => apiFetch<Setting[]>(`/api/settings/category/${category}`),
  });
}

export function useBulkUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; settings: Record<string, string> }) =>
      apiFetch<Setting[]>("/api/settings/bulk-upsert", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<{
      totalOrders: number;
      activeDrivers: number;
      totalDrivers: number;
      activeVehicles: number;
      totalVehicles: number;
      totalFleets: number;
      pendingOrders: number;
      inTransitOrders: number;
      deliveredOrders: number;
    }>("/api/dashboard/stats"),
  });
}
