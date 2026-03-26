import { eq } from "drizzle-orm";
import { db } from "./db";
import { fleetbase_servers } from "@shared/schema";

function validateServerUrl(urlStr: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
    }
    const hostname = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^\[::1\]$/,
      /^\[fc/,
      /^\[fd/,
      /^169\.254\./,
    ];
    for (const p of privatePatterns) {
      if (p.test(hostname)) {
        return { valid: false, error: "Private/internal addresses are not allowed" };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

interface FleetbaseCredentials {
  url: string;
  api_key: string;
}

interface CityOSContext {
  country?: string;
  city?: string;
  tenant?: string;
  channel?: string;
}

interface FleetbaseRequestOptions {
  method?: string;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
  cityosContext?: CityOSContext;
  credentials?: FleetbaseCredentials;
}

interface FleetbaseResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

interface ActiveServerCache {
  creds: FleetbaseCredentials;
  cityosContext?: CityOSContext;
  fetchedAt: number;
}

const ACTIVE_SERVER_CACHE_TTL_MS = Number(process.env.FLEETBASE_SERVER_CACHE_TTL_MS ?? 5 * 60 * 1000);
let activeServerCache: ActiveServerCache | null = null;

export { validateServerUrl };

function buildCityOSContext(server: {
  cityos_country?: string | null;
  cityos_city?: string | null;
  cityos_tenant?: string | null;
  cityos_channel?: string | null;
}): CityOSContext | undefined {
  const ctx: CityOSContext = {};
  if (server.cityos_country) ctx.country = server.cityos_country;
  if (server.cityos_city) ctx.city = server.cityos_city;
  if (server.cityos_tenant) ctx.tenant = server.cityos_tenant;
  if (server.cityos_channel) ctx.channel = server.cityos_channel;
  return (ctx.country || ctx.city || ctx.tenant || ctx.channel) ? ctx : undefined;
}

function getFreshActiveServerCache(): ActiveServerCache | null {
  if (!activeServerCache) return null;
  if (Date.now() - activeServerCache.fetchedAt > ACTIVE_SERVER_CACHE_TTL_MS) return null;
  return activeServerCache;
}

function setActiveServerCache(server: {
  url: string;
  api_key: string;
  cityos_country?: string | null;
  cityos_city?: string | null;
  cityos_tenant?: string | null;
  cityos_channel?: string | null;
}) {
  activeServerCache = {
    creds: {
      url: server.url.replace(/\/+$/, ""),
      api_key: server.api_key,
    },
    cityosContext: buildCityOSContext(server),
    fetchedAt: Date.now(),
  };
}

function getEnvActiveServer(): FleetbaseCredentials | null {
  const url = process.env.FLEETBASE_API_URL?.trim();
  const apiKey = process.env.FLEETBASE_API_KEY?.trim();

  if (!url || !apiKey) return null;

  return {
    url: url.replace(/\/+$/, ""),
    api_key: apiKey,
  };
}

export async function getActiveServer(): Promise<FleetbaseCredentials | null> {
  const cached = getFreshActiveServerCache();
  if (cached) return cached.creds;

  try {
    const [server] = await db.select().from(fleetbase_servers).where(eq(fleetbase_servers.is_active, true));
    if (!server) {
      const envCreds = getEnvActiveServer();
      if (envCreds) {
        activeServerCache = { creds: envCreds, fetchedAt: Date.now() };
        return envCreds;
      }

      activeServerCache = null;
      return null;
    }

    setActiveServerCache(server);
    return activeServerCache?.creds ?? null;
  } catch (error) {
    const envCreds = getEnvActiveServer();
    if (envCreds) {
      activeServerCache = { creds: envCreds, fetchedAt: Date.now() };
      return envCreds;
    }

    if (activeServerCache) return activeServerCache.creds;
    throw error;
  }
}

export async function getActiveServerCityOSContext(): Promise<CityOSContext | undefined> {
  const cached = getFreshActiveServerCache();
  if (cached) return cached.cityosContext;

  try {
    const [server] = await db.select().from(fleetbase_servers).where(eq(fleetbase_servers.is_active, true));
    if (!server) {
      activeServerCache = null;
      return undefined;
    }

    setActiveServerCache(server);
    return activeServerCache?.cityosContext;
  } catch (error) {
    if (activeServerCache) return activeServerCache.cityosContext;
    return undefined;
  }
}

export async function fleetbaseRequest<T = any>(
  endpoint: string,
  options: FleetbaseRequestOptions = {}
): Promise<FleetbaseResponse<T>> {
  const creds = options.credentials ?? await getActiveServer();
  if (!creds) {
    return { ok: false, error: "No active Fleetbase server configured" };
  }

  const { method = "GET", body, params, timeout = 30000, cityosContext } = options;

  let url = `${creds.url}/v1/${endpoint}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${creds.api_key}`,
      "Accept": "application/json",
    };

    if (cityosContext) {
      if (cityosContext.country) headers["X-CityOS-Country"] = cityosContext.country;
      if (cityosContext.city) headers["X-CityOS-City"] = cityosContext.city;
      if (cityosContext.tenant) headers["X-CityOS-Tenant"] = cityosContext.tenant;
      if (cityosContext.channel) headers["X-CityOS-Channel"] = cityosContext.channel;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let errorMsg = `Fleetbase API error: ${res.status}`;
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.errors && Array.isArray(parsed.errors)) {
          errorMsg = parsed.errors.join("; ");
        } else if (parsed.error) {
          errorMsg = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
        } else if (parsed.message) {
          errorMsg = parsed.message;
        }
      } catch {}
      return { ok: false, error: errorMsg, status: res.status };
    }

    if (res.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      return { ok: false, error: "Fleetbase API request timed out" };
    }
    return { ok: false, error: `Fleetbase API unreachable: ${err.message}` };
  }
}

export function extractCityOSContext(req: { headers: Record<string, any> }): CityOSContext | undefined {
  const country = req.headers["x-cityos-country"] as string | undefined;
  const city = req.headers["x-cityos-city"] as string | undefined;
  const tenant = req.headers["x-cityos-tenant"] as string | undefined;
  const channel = req.headers["x-cityos-channel"] as string | undefined;
  if (country || city || tenant || channel) {
    return { country, city, tenant, channel };
  }
  return undefined;
}

export async function getEffectiveCityOSContext(req: { headers: Record<string, any> }): Promise<CityOSContext | undefined> {
  if (req.headers["x-skip-cityos"] === "true") return undefined;
  const serverCtx = await getActiveServerCityOSContext();
  const reqCtx = extractCityOSContext(req);
  if (!serverCtx && !reqCtx) return undefined;
  return { ...serverCtx, ...reqCtx };
}

export async function fleetbaseList<T = any>(
  resource: string,
  params?: Record<string, string>,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T[]>> {
  return fleetbaseRequest<T[]>(resource, { params, cityosContext, credentials });
}

export async function fleetbaseListWithTimeout<T = any>(
  resource: string,
  timeout: number,
  params?: Record<string, string>,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T[]>> {
  return fleetbaseRequest<T[]>(resource, { params, timeout, cityosContext, credentials });
}

export async function fleetbaseGet<T = any>(
  resource: string,
  id: string,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T>> {
  return fleetbaseRequest<T>(`${resource}/${id}`, { cityosContext, credentials });
}

export async function fleetbaseCreate<T = any>(
  resource: string,
  body: any,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T>> {
  return fleetbaseRequest<T>(resource, { method: "POST", body, cityosContext, credentials });
}

export async function fleetbaseCreateWithTimeout<T = any>(
  resource: string,
  body: any,
  timeout: number,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T>> {
  return fleetbaseRequest<T>(resource, { method: "POST", body, timeout, cityosContext, credentials });
}

export async function fleetbaseUpdate<T = any>(
  resource: string,
  id: string,
  body: any,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<T>> {
  return fleetbaseRequest<T>(`${resource}/${id}`, { method: "PUT", body, cityosContext, credentials });
}

export async function fleetbaseDelete(
  resource: string,
  id: string,
  cityosContext?: CityOSContext,
  credentials?: FleetbaseCredentials
): Promise<FleetbaseResponse<{ deleted: boolean }>> {
  return fleetbaseRequest(`${resource}/${id}`, { method: "DELETE", cityosContext, credentials });
}

export async function probeFleetbaseServer(serverUrl: string, apiKey: string): Promise<{
  connected: boolean;
  url: string;
  error?: string;
  organization?: string;
  country?: string;
  city?: string;
  tenant?: string;
  channel?: string;
}> {
  const url = serverUrl.replace(/\/+$/, "");
  const urlCheck = validateServerUrl(url);
  if (!urlCheck.valid) {
    return { connected: false, url, error: urlCheck.error };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${url}/v1/vehicles?limit=1`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { connected: false, url, error: `HTTP ${res.status}` };
    }

    const result: any = { connected: true, url };

    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 10000);
    try {
      const orgRes = await fetch(`${url}/v1/auth/organizations`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
        signal: controller2.signal,
      });
      clearTimeout(timer2);
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const org = orgData?.data?.[0] || orgData?.organization || orgData;
        if (org) {
          if (org.name) result.organization = org.name;
          if (org.country) result.country = org.country;
          if (org.city) result.city = org.city;
          if (org.tenant) result.tenant = org.tenant;
          if (org.channel) result.channel = org.channel;
          if (org.slug && !result.tenant) result.tenant = org.slug;
        }
      }
    } catch {}

    return result;
  } catch (err: any) {
    clearTimeout(timer);
    return { connected: false, url, error: err.message };
  }
}

export async function testFleetbaseConnection(serverUrl?: string, apiKey?: string): Promise<{ connected: boolean; url: string; error?: string }> {
  let url: string;
  let key: string;

  if (serverUrl && apiKey) {
    url = serverUrl.replace(/\/+$/, "");
    key = apiKey;
    const urlCheck = validateServerUrl(url);
    if (!urlCheck.valid) {
      return { connected: false, url, error: urlCheck.error };
    }
  } else {
    const creds = await getActiveServer();
    if (!creds) {
      return { connected: false, url: "", error: "No active server configured" };
    }
    url = creds.url;
    key = creds.api_key;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${url}/v1/vehicles?limit=1`, {
      headers: {
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { connected: res.ok, url, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timer);
    return { connected: false, url, error: err.message };
  }
}
