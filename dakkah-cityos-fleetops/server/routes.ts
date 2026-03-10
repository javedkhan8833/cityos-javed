import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { testFleetbaseConnection, probeFleetbaseServer } from "./fleetbaseClient";
import {
  insertRouteSchema,
  insertIssueSchema, insertFuelReportSchema, insertDeviceSchema,
  insertWorkOrderSchema, insertPartSchema,
  insertSensorSchema, insertEventSchema, insertTelematicsRecordSchema,
  insertReportSchema, insertTransactionSchema,
  insertUserSchema, insertCustomFieldSchema,
  insertTimeOffRequestSchema, insertSchedulerTaskSchema, insertSettingSchema,
  insertApiKeySchema, insertWebhookSchema, insertWebhookLogSchema,
  insertIntegrationSchema, insertOrderConfigSchema,
  insertFleetbaseServerSchema, insertServiceRateSchema,
} from "@shared/schema";
import { ZodSchema } from "zod";

function crudRoutes<T>(
  app: Express,
  path: string,
  getAll: () => Promise<T[]>,
  getById: (id: string) => Promise<T | undefined>,
  create: (data: any) => Promise<T>,
  update: (id: string, data: any) => Promise<T>,
  remove: (id: string) => Promise<void>,
  schema: ZodSchema
) {
  app.get(`/api/${path}`, async (_req: Request, res: Response) => {
    try {
      const items = await getAll();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`/api/${path}/:id`, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const item = await getById(id);
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(`/api/${path}`, async (req: Request, res: Response) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const item = await create(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch(`/api/${path}/:id`, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const item = await update(id, req.body);
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(`/api/${path}/:id`, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await remove(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // =========== Local-only resource CRUD routes ===========

  crudRoutes(app, "routes",
    () => storage.getRoutes(), (id) => storage.getRoute(id),
    (data) => storage.createRoute(data), (id, data) => storage.updateRoute(id, data),
    (id) => storage.deleteRoute(id), insertRouteSchema
  );

  crudRoutes(app, "issues",
    () => storage.getIssues(), (id) => storage.getIssue(id),
    (data) => storage.createIssue(data), (id, data) => storage.updateIssue(id, data),
    (id) => storage.deleteIssue(id), insertIssueSchema
  );

  crudRoutes(app, "fuel-reports",
    () => storage.getFuelReports(), (id) => storage.getFuelReport(id),
    (data) => storage.createFuelReport(data), (id, data) => storage.updateFuelReport(id, data),
    (id) => storage.deleteFuelReport(id), insertFuelReportSchema
  );

  crudRoutes(app, "devices",
    () => storage.getDevices(), (id) => storage.getDevice(id),
    (data) => storage.createDevice(data), (id, data) => storage.updateDevice(id, data),
    (id) => storage.deleteDevice(id), insertDeviceSchema
  );

  crudRoutes(app, "work-orders",
    () => storage.getWorkOrders(), (id) => storage.getWorkOrder(id),
    (data) => storage.createWorkOrder(data), (id, data) => storage.updateWorkOrder(id, data),
    (id) => storage.deleteWorkOrder(id), insertWorkOrderSchema
  );

  crudRoutes(app, "service-rates",
    () => storage.getServiceRates(), (id) => storage.getServiceRate(id),
    (data) => storage.createServiceRate(data), (id, data) => storage.updateServiceRate(id, data),
    (id) => storage.deleteServiceRate(id), insertServiceRateSchema
  );

  crudRoutes(app, "parts",
    () => storage.getParts(), (id) => storage.getPart(id),
    (data) => storage.createPart(data), (id, data) => storage.updatePart(id, data),
    (id) => storage.deletePart(id), insertPartSchema
  );

  crudRoutes(app, "sensors",
    () => storage.getSensors(), (id) => storage.getSensor(id),
    (data) => storage.createSensor(data), (id, data) => storage.updateSensor(id, data),
    (id) => storage.deleteSensor(id), insertSensorSchema
  );

  crudRoutes(app, "events",
    () => storage.getEvents(), (id) => storage.getEvent(id),
    (data) => storage.createEvent(data), (id, data) => storage.updateEvent(id, data),
    (id) => storage.deleteEvent(id), insertEventSchema
  );

  crudRoutes(app, "telematics",
    () => storage.getTelematicsRecords(), (id) => storage.getTelematicsRecord(id),
    (data) => storage.createTelematicsRecord(data), (id, data) => storage.updateTelematicsRecord(id, data),
    (id) => storage.deleteTelematicsRecord(id), insertTelematicsRecordSchema
  );

  crudRoutes(app, "users",
    () => storage.getUsers(), (id) => storage.getUser(id),
    (data) => storage.createUser(data), (id, data) => storage.updateUser(id, data),
    (id) => storage.deleteUser(id), insertUserSchema
  );

  crudRoutes(app, "reports",
    () => storage.getReports(), (id) => storage.getReport(id),
    (data) => storage.createReport(data), (id, data) => storage.updateReport(id, data),
    (id) => storage.deleteReport(id), insertReportSchema
  );

  crudRoutes(app, "transactions",
    () => storage.getTransactions(), (id) => storage.getTransaction(id),
    (data) => storage.createTransaction(data), (id, data) => storage.updateTransaction(id, data),
    (id) => storage.deleteTransaction(id), insertTransactionSchema
  );

  crudRoutes(app, "custom-fields",
    () => storage.getCustomFields(), (id) => storage.getCustomField(id),
    (data) => storage.createCustomField(data), (id, data) => storage.updateCustomField(id, data),
    (id) => storage.deleteCustomField(id), insertCustomFieldSchema
  );

  crudRoutes(app, "time-off-requests",
    () => storage.getTimeOffRequests(), (id) => storage.getTimeOffRequest(id),
    (data) => storage.createTimeOffRequest(data), (id, data) => storage.updateTimeOffRequest(id, data),
    (id) => storage.deleteTimeOffRequest(id), insertTimeOffRequestSchema
  );

  crudRoutes(app, "scheduler-tasks",
    () => storage.getSchedulerTasks(), (id) => storage.getSchedulerTask(id),
    (data) => storage.createSchedulerTask(data), (id, data) => storage.updateSchedulerTask(id, data),
    (id) => storage.deleteSchedulerTask(id), insertSchedulerTaskSchema
  );

  crudRoutes(app, "settings",
    () => storage.getSettings(), (id) => storage.getSetting(id),
    (data) => storage.createSetting(data), (id, data) => storage.updateSetting(id, data),
    (id) => storage.deleteSetting(id), insertSettingSchema
  );

  app.get("/api/settings/category/:category", async (req: Request, res: Response) => {
    try {
      const items = await storage.getSettingsByCategory(String(req.params.category));
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings/upsert", async (req: Request, res: Response) => {
    try {
      const { category, key, value } = req.body;
      if (!category || !key) return res.status(400).json({ error: "category and key are required" });
      const setting = await storage.upsertSetting(category, key, value || "");
      res.json(setting);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings/bulk-upsert", async (req: Request, res: Response) => {
    try {
      const { category, settings: settingsData } = req.body;
      if (!category || !settingsData) return res.status(400).json({ error: "category and settings are required" });
      const results = [];
      for (const [key, value] of Object.entries(settingsData)) {
        const setting = await storage.upsertSetting(category, key, String(value));
        results.push(setting);
      }
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========== Setup Routes (no auth required) ===========

  app.get("/api/setup/status", async (_req: Request, res: Response) => {
    try {
      const servers = await storage.getFleetbaseServers();
      res.json({ needsSetup: servers.length === 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/setup/initialize", async (req: Request, res: Response) => {
    try {
      const existingServers = await storage.getFleetbaseServers();
      if (existingServers.length > 0) {
        return res.status(403).json({ error: "Setup already completed. Use the login page to connect." });
      }
      const { name, url, api_key, organization, cityos_country, cityos_city, cityos_tenant, cityos_channel } = req.body;
      if (!name || !url || !api_key) {
        return res.status(400).json({ error: "Server name, URL, and API key are required" });
      }

      const probe = await probeFleetbaseServer(url, api_key);
      if (!probe.connected) {
        return res.status(400).json({ error: `Could not connect to Fleetbase server: ${probe.error || "Unknown error"}` });
      }

      const server = await storage.createFleetbaseServer({
        name,
        url,
        api_key,
        organization: organization || probe.organization || null,
        is_active: true,
        status: "connected",
        cityos_country: cityos_country || probe.country || null,
        cityos_city: cityos_city || probe.city || null,
        cityos_tenant: cityos_tenant || probe.tenant || null,
        cityos_channel: cityos_channel || probe.channel || null,
      });

      req.session.activeServerId = server.id;
      req.session.serverName = server.name;
      req.session.serverOrg = server.organization || "";

      res.status(201).json({
        server: { id: server.id, name: server.name, organization: server.organization, url: server.url },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========== Auth Routes (server-based) ===========

  app.post("/api/auth/connect", async (req: Request, res: Response) => {
    try {
      const { serverId, url, api_key, name, organization, cityos_country, cityos_city, cityos_tenant, cityos_channel } = req.body;

      if (serverId) {
        const server = await storage.getFleetbaseServer(serverId);
        if (!server) return res.status(404).json({ error: "Server not found" });
        const connTest = await testFleetbaseConnection(server.url, server.api_key);
        if (!connTest.connected) {
          return res.status(400).json({ error: `Could not connect: ${connTest.error || "Connection failed"}` });
        }
        await storage.setActiveFleetbaseServer(serverId);
        req.session.activeServerId = server.id;
        req.session.serverName = server.name;
        req.session.serverOrg = server.organization || "";
        return res.json({ id: server.id, name: server.name, organization: server.organization, url: server.url });
      }

      if (!url || !api_key) {
        return res.status(400).json({ error: "Server URL and API key are required" });
      }

      const probe = await probeFleetbaseServer(url, api_key);
      if (!probe.connected) {
        return res.status(401).json({ error: `Invalid credentials or server unreachable: ${probe.error || "Connection failed"}` });
      }

      const server = await storage.createFleetbaseServer({
        name: name || new URL(url).hostname,
        url,
        api_key,
        organization: organization || probe.organization || null,
        is_active: true,
        status: "connected",
        cityos_country: cityos_country || probe.country || null,
        cityos_city: cityos_city || probe.city || null,
        cityos_tenant: cityos_tenant || probe.tenant || null,
        cityos_channel: cityos_channel || probe.channel || null,
      });

      req.session.activeServerId = server.id;
      req.session.serverName = server.name;
      req.session.serverOrg = server.organization || "";
      res.json({ id: server.id, name: server.name, organization: server.organization, url: server.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.activeServerId) {
      return res.status(401).json({ error: "Not connected" });
    }
    try {
      const server = await storage.getFleetbaseServer(req.session.activeServerId);
      if (!server) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Server not found" });
      }
      res.json({
        id: server.id,
        name: server.name,
        organization: server.organization,
        url: server.url,
        cityos_country: server.cityos_country,
        cityos_city: server.cityos_city,
        cityos_tenant: server.cityos_tenant,
        cityos_channel: server.cityos_channel,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/servers", async (_req: Request, res: Response) => {
    try {
      const servers = await storage.getFleetbaseServers();
      res.json(servers.map(s => ({ id: s.id, name: s.name, organization: s.organization, url: s.url, is_active: s.is_active })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/disconnect", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Disconnect failed" });
      res.clearCookie("connect.sid", { path: "/", httpOnly: true, secure: false, sameSite: "lax" });
      res.json({ success: true });
    });
  });

  // =========== Route Actions ===========

  app.post("/api/routes/:id/optimize", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const route = await storage.getRoute(id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      const distNum = parseFloat(route.distance) || 0;
      const optimizedDist = Math.round(distNum * 0.85);
      const updated = await storage.updateRoute(id, {
        status: "optimized",
        distance: `${optimizedDist} km`,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/routes/:id/dispatch", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const route = await storage.getRoute(id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      const updated = await storage.updateRoute(id, { status: "dispatched" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========== Other Local CRUD ===========

  crudRoutes(app, "api-keys",
    () => storage.getApiKeys(), (id) => storage.getApiKey(id),
    (data) => storage.createApiKey(data), (id, data) => storage.updateApiKey(id, data),
    (id) => storage.deleteApiKey(id), insertApiKeySchema
  );

  // =========== CityOS System Integration Routes (BEFORE generic CRUD to avoid route conflicts) ===========

  const CITYOS_SYSTEMS = [
    { key: "cms", name: "CMS", description: "Content Management System" },
    { key: "medusa", name: "Medusa", description: "E-commerce & Order Management" },
    { key: "erpnext", name: "ERPNext", description: "Enterprise Resource Planning" },
    { key: "temporal", name: "Temporal Cloud", description: "Workflow Orchestration" },
  ];

  app.get("/api/integrations/systems", async (_req: Request, res: Response) => {
    try {
      const integrations = await storage.getIntegrations();
      const systems = CITYOS_SYSTEMS.map(sys => {
        const existing = integrations.find(i => i.provider === sys.key);
        return {
          ...sys,
          configured: !!existing,
          status: existing?.status || "not_configured",
          integration_id: existing?.id || null,
          webhooks_enabled: existing?.webhooks_enabled || false,
          config: existing?.config || {},
        };
      });
      res.json(systems);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/integrations/probe", async (req: Request, res: Response) => {
    try {
      const { provider, base_url, api_key } = req.body;
      if (!provider || !base_url) {
        return res.status(400).json({ error: "provider and base_url are required" });
      }

      const sys = CITYOS_SYSTEMS.find(s => s.key === provider);
      if (!sys) {
        return res.status(400).json({ error: `Unknown provider: ${provider}. Valid: ${CITYOS_SYSTEMS.map(s => s.key).join(", ")}` });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let probeUrl = base_url.replace(/\/+$/, "");
      let probeEndpoint = "";
      const headers: Record<string, string> = { "Accept": "application/json" };

      switch (provider) {
        case "cms":
          probeEndpoint = "/api/health";
          break;
        case "medusa":
          probeEndpoint = "/store/products?limit=1";
          if (api_key) headers["x-publishable-api-key"] = api_key;
          break;
        case "erpnext":
          probeEndpoint = "/api/method/frappe.auth.get_logged_user";
          if (api_key) headers["Authorization"] = `token ${api_key}`;
          break;
        case "temporal":
          probeEndpoint = "/api/v1/namespaces";
          if (api_key) headers["Authorization"] = `Bearer ${api_key}`;
          break;
      }

      try {
        const probeRes = await fetch(`${probeUrl}${probeEndpoint}`, {
          headers,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const body = await probeRes.text().catch(() => "");
        let data: any = null;
        try { data = JSON.parse(body); } catch { data = body?.slice(0, 200); }

        res.json({
          provider,
          name: sys.name,
          url: probeUrl,
          reachable: true,
          status_code: probeRes.status,
          authenticated: probeRes.ok,
          response_preview: typeof data === "object" ? data : { raw: String(data).slice(0, 200) },
          error: probeRes.ok ? null : `HTTP ${probeRes.status}`,
        });
      } catch (fetchErr: any) {
        clearTimeout(timer);
        res.json({
          provider,
          name: sys.name,
          url: probeUrl,
          reachable: false,
          status_code: 0,
          authenticated: false,
          error: fetchErr.name === "AbortError" ? "Connection timeout (10s)" : fetchErr.message,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/integrations/configure", async (req: Request, res: Response) => {
    try {
      const { provider, base_url, api_key, webhooks_enabled, config } = req.body;
      if (!provider || !base_url) {
        return res.status(400).json({ error: "provider and base_url are required" });
      }
      const sys = CITYOS_SYSTEMS.find(s => s.key === provider);
      if (!sys) return res.status(400).json({ error: `Unknown provider: ${provider}` });

      const existing = (await storage.getIntegrations()).find(i => i.provider === provider);
      if (existing) {
        const updated = await storage.updateIntegration(existing.id, {
          name: sys.name,
          provider,
          category: "cityos",
          description: sys.description,
          status: "configured",
          api_key: api_key || "",
          webhooks_enabled: webhooks_enabled || false,
          config: { ...((existing.config as any) || {}), base_url, ...(config || {}) },
        });
        return res.json(updated);
      }

      const created = await storage.createIntegration({
        name: sys.name,
        provider,
        category: "cityos",
        description: sys.description,
        status: "configured",
        api_key: api_key || "",
        webhooks_enabled: webhooks_enabled || false,
        config: { base_url, ...(config || {}) },
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/integrations/health", async (_req: Request, res: Response) => {
    try {
      const integrations = await storage.getIntegrations();
      const configured = integrations.filter(i => i.category === "cityos" && i.status === "configured");
      const results: any[] = [];

      for (const int of configured) {
        const baseUrl = ((int.config as any)?.base_url || "").replace(/\/+$/, "");
        if (!baseUrl) {
          results.push({ provider: int.provider, name: int.name, status: "no_url", reachable: false });
          continue;
        }

        let healthEndpoint = "/api/health";
        switch (int.provider) {
          case "medusa": healthEndpoint = "/health"; break;
          case "erpnext": healthEndpoint = "/api/method/ping"; break;
          case "temporal": healthEndpoint = "/api/v1/namespaces"; break;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const healthRes = await fetch(`${baseUrl}${healthEndpoint}`, {
            headers: int.api_key ? { "Authorization": `Bearer ${int.api_key}` } : {},
            signal: controller.signal,
          });
          clearTimeout(timer);
          results.push({
            provider: int.provider,
            name: int.name,
            status: healthRes.ok ? "healthy" : "degraded",
            status_code: healthRes.status,
            reachable: true,
          });
        } catch (fetchErr: any) {
          clearTimeout(timer);
          results.push({
            provider: int.provider,
            name: int.name,
            status: "unreachable",
            reachable: false,
            error: fetchErr.name === "AbortError" ? "Timeout" : fetchErr.message,
          });
        }
      }

      res.json({
        total_configured: configured.length,
        healthy: results.filter(r => r.status === "healthy").length,
        degraded: results.filter(r => r.status === "degraded").length,
        unreachable: results.filter(r => !r.reachable).length,
        systems: results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/webhooks/trigger", async (req: Request, res: Response) => {
    try {
      const { event, payload, webhook_ids } = req.body;
      if (!event) return res.status(400).json({ error: "event is required" });

      const allWebhooks = await storage.getWebhooks();
      const targets = webhook_ids
        ? allWebhooks.filter(w => webhook_ids.includes(w.id) && w.status === "active")
        : allWebhooks.filter(w => w.status === "active" && (w.events || []).some(e => e === event || e === "*"));

      if (targets.length === 0) {
        return res.json({ event, delivered: 0, results: [], message: "No active webhooks matched this event" });
      }

      const results: any[] = [];
      for (const webhook of targets) {
        const start = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const deliveryRes = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Event": event,
              "X-Webhook-Id": webhook.id,
            },
            body: JSON.stringify({ event, payload: payload || {}, timestamp: new Date().toISOString() }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          const dur = Date.now() - start;
          const statusCode = deliveryRes.status;

          await storage.createWebhookLog({
            webhook_id: webhook.id,
            event,
            status_code: statusCode,
            duration: `${dur}ms`,
          });

          results.push({
            webhook_id: webhook.id,
            url: webhook.url,
            status_code: statusCode,
            success: statusCode >= 200 && statusCode < 300,
            duration_ms: dur,
          });
        } catch (fetchErr: any) {
          clearTimeout(timer);
          const dur = Date.now() - start;

          await storage.createWebhookLog({
            webhook_id: webhook.id,
            event,
            status_code: 0,
            duration: `${dur}ms`,
          });

          results.push({
            webhook_id: webhook.id,
            url: webhook.url,
            status_code: 0,
            success: false,
            duration_ms: dur,
            error: fetchErr.name === "AbortError" ? "Timeout" : fetchErr.message,
          });
        }
      }

      res.json({
        event,
        delivered: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total: results.length,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/webhooks/receive", async (req: Request, res: Response) => {
    try {
      const event = req.headers["x-webhook-event"] as string || req.body?.event || "unknown";
      const source = req.headers["x-webhook-source"] as string || req.body?.source || "external";
      await storage.createWebhookLog({
        webhook_id: source,
        event,
        status_code: 200,
        duration: "0ms",
      });
      res.json({ received: true, event, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workflows/dispatch", async (req: Request, res: Response) => {
    try {
      const { workflow_type, task_queue, input, provider } = req.body;
      if (!workflow_type) return res.status(400).json({ error: "workflow_type is required" });

      const integrations = await storage.getIntegrations();
      const temporal = integrations.find(i => i.provider === "temporal");

      if (temporal && temporal.status === "configured" && (temporal.config as any)?.base_url) {
        const baseUrl = (temporal.config as any).base_url.replace(/\/+$/, "");
        const ns = (temporal.config as any)?.namespace || "default";
        const tq = task_queue || (temporal.config as any)?.task_queue || "default";
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json",
        };
        if (temporal.api_key) headers["Authorization"] = `Bearer ${temporal.api_key}`;

        try {
          const wfRes = await fetch(`${baseUrl}/api/v1/namespaces/${ns}/workflows`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              workflowType: { name: workflow_type },
              taskQueue: { name: tq },
              input: input ? [JSON.stringify(input)] : [],
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          const data = await wfRes.json().catch(() => ({}));
          return res.json({
            dispatched: wfRes.ok,
            provider: "temporal",
            workflow_type,
            task_queue: tq,
            namespace: ns,
            status_code: wfRes.status,
            response: data,
            error: wfRes.ok ? null : `HTTP ${wfRes.status}`,
          });
        } catch (fetchErr: any) {
          clearTimeout(timer);
          return res.json({
            dispatched: false,
            provider: "temporal",
            workflow_type,
            error: fetchErr.name === "AbortError" ? "Connection timeout" : fetchErr.message,
          });
        }
      }

      res.json({
        dispatched: false,
        provider: provider || "none",
        workflow_type,
        message: "No workflow orchestration system configured. Configure Temporal Cloud integration first.",
        simulated: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Generic CRUD routes (after specific routes to avoid path conflicts)
  crudRoutes(app, "webhooks",
    () => storage.getWebhooks(), (id) => storage.getWebhook(id),
    (data) => storage.createWebhook(data), (id, data) => storage.updateWebhook(id, data),
    (id) => storage.deleteWebhook(id), insertWebhookSchema
  );

  crudRoutes(app, "webhook-logs",
    () => storage.getWebhookLogs(), (id) => storage.getWebhookLog(id),
    (data) => storage.createWebhookLog(data), (id, data) => storage.updateWebhookLog(id, data),
    (id) => storage.deleteWebhookLog(id), insertWebhookLogSchema
  );

  crudRoutes(app, "integrations",
    () => storage.getIntegrations(), (id) => storage.getIntegration(id),
    (data) => storage.createIntegration(data), (id, data) => storage.updateIntegration(id, data),
    (id) => storage.deleteIntegration(id), insertIntegrationSchema
  );

  crudRoutes(app, "order-configs",
    () => storage.getOrderConfigs(), (id) => storage.getOrderConfig(id),
    (data) => storage.createOrderConfig(data), (id, data) => storage.updateOrderConfig(id, data),
    (id) => storage.deleteOrderConfig(id), insertOrderConfigSchema
  );

  // =========== Fleetbase Server Management ===========

  app.get("/api/fleetbase-servers", async (_req: Request, res: Response) => {
    try {
      const servers = await storage.getFleetbaseServers();
      res.json(servers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fleetbase-servers/active", async (_req: Request, res: Response) => {
    try {
      const server = await storage.getActiveFleetbaseServer();
      res.json(server || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fleetbase-servers", async (req: Request, res: Response) => {
    try {
      const parsed = insertFleetbaseServerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const urlCheck = validateServerUrl(parsed.data.url);
      if (!urlCheck.valid) return res.status(400).json({ error: urlCheck.error });
      const server = await storage.createFleetbaseServer(parsed.data);
      res.status(201).json(server);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/fleetbase-servers/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (req.body.url) {
        const urlCheck = validateServerUrl(req.body.url);
        if (!urlCheck.valid) return res.status(400).json({ error: urlCheck.error });
      }
      const server = await storage.updateFleetbaseServer(id, req.body);
      res.json(server);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/fleetbase-servers/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await storage.deleteFleetbaseServer(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fleetbase-servers/:id/activate", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const server = await storage.setActiveFleetbaseServer(id);
      res.json(server);
    } catch (err: any) {
      const status = err.message === "Server not found" ? 404 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/api/fleetbase-servers/test", async (req: Request, res: Response) => {
    try {
      const { url, api_key } = req.body;
      if (!url || !api_key) return res.status(400).json({ error: "url and api_key are required" });
      const result = await probeFleetbaseServer(url, api_key);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========== Fleetbase Proxy Routes ===========
  const { fleetbaseList, fleetbaseGet, fleetbaseCreate, fleetbaseUpdate, fleetbaseDelete, getActiveServer, getActiveServerCityOSContext, getEffectiveCityOSContext, validateServerUrl, extractCityOSContext } = await import("./fleetbaseClient");

  app.get("/api/fleetbase/status", async (_req: Request, res: Response) => {
    try {
      const creds = await getActiveServer();
      if (!creds) {
        return res.json({ configured: false, connected: false, error: "No active server configured" });
      }
      const result = await testFleetbaseConnection();
      res.json({ configured: true, ...result });
    } catch (err: any) {
      res.json({ configured: false, connected: false, error: err.message });
    }
  });

  app.get("/api/fleetbase/cityos-context", async (_req: Request, res: Response) => {
    try {
      const ctx = await getActiveServerCityOSContext();
      res.json(ctx || { country: "", city: "", tenant: "", channel: "" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const FLEETBASE_RESOURCES = ["vehicles", "drivers", "orders", "places", "contacts", "vendors", "fleets", "service-areas", "zones", "service-rates", "entities", "payloads", "tracking-numbers", "tracking-statuses", "service-quotes", "purchase-rates"];

  function fbErrorStatus(result: { status?: number }): number {
    if (result.status && result.status >= 400 && result.status < 600) return result.status;
    return 502;
  }

  function isValidResourceId(id: string): boolean {
    if (!id || id.length > 200) return false;
    if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
    if (id.includes("\0")) return false;
    return true;
  }

  for (const resource of FLEETBASE_RESOURCES) {
    app.get(`/api/fleetbase/${resource}`, async (req: Request, res: Response) => {
      try {
        const ctx = await getEffectiveCityOSContext(req);
        const params: Record<string, string> = {};
        if (req.query.limit) params.limit = String(req.query.limit);
        if (req.query.offset) params.offset = String(req.query.offset);
        if (req.query.page) params.page = String(req.query.page);
        if (req.query.query) params.query = String(req.query.query);
        if (req.query.sort) params.sort = String(req.query.sort);

        const result = await fleetbaseList(resource, Object.keys(params).length ? params : undefined, ctx);
        if (!result.ok) {
          return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        }
        res.json(Array.isArray(result.data) ? result.data : []);
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.get(`/api/fleetbase/${resource}/:id`, async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!isValidResourceId(id)) return res.status(400).json({ error: "Invalid resource ID" });
        const ctx = await getEffectiveCityOSContext(req);
        const result = await fleetbaseGet(resource, id, ctx);
        if (!result.ok) return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        res.json(result.data);
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.post(`/api/fleetbase/${resource}`, async (req: Request, res: Response) => {
      try {
        const ctx = await getEffectiveCityOSContext(req);
        const result = await fleetbaseCreate(resource, req.body, ctx);
        if (!result.ok) return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        res.status(201).json(result.data);
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.put(`/api/fleetbase/${resource}/:id`, async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!isValidResourceId(id)) return res.status(400).json({ error: "Invalid resource ID" });
        const ctx = await getEffectiveCityOSContext(req);
        const result = await fleetbaseUpdate(resource, id, req.body, ctx);
        if (!result.ok) return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        res.json(result.data);
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.patch(`/api/fleetbase/${resource}/:id`, async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!isValidResourceId(id)) return res.status(400).json({ error: "Invalid resource ID" });
        const ctx = await getEffectiveCityOSContext(req);
        const result = await fleetbaseUpdate(resource, id, req.body, ctx);
        if (!result.ok) return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        res.json(result.data);
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.patch(`/api/fleetbase/${resource}`, (_req: Request, res: Response) => {
      res.status(405).json({ error: "PATCH requires a resource ID in the URL" });
    });

    app.delete(`/api/fleetbase/${resource}/:id`, async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        if (!isValidResourceId(id)) return res.status(400).json({ error: "Invalid resource ID" });
        const ctx = await getEffectiveCityOSContext(req);
        const result = await fleetbaseDelete(resource, id, ctx);
        if (!result.ok) return res.status(fbErrorStatus(result)).json({ error: result.error, source: "fleetbase" });
        res.status(204).send();
      } catch (err: any) {
        res.status(502).json({ error: err.message, source: "fleetbase" });
      }
    });

    app.delete(`/api/fleetbase/${resource}`, (_req: Request, res: Response) => {
      res.status(405).json({ error: "DELETE requires a resource ID in the URL" });
    });
  }

  app.all("/api/fleetbase/:unknownResource", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Unknown Fleetbase resource" });
  });
  app.all("/api/fleetbase/:unknownResource/:unknownId", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Unknown Fleetbase resource" });
  });

  // =========== Dashboard Stats (from Fleetbase) ===========

  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const creds = await getActiveServer();
      if (!creds) {
        return res.json({
          totalOrders: 0, activeDrivers: 0, totalDrivers: 0,
          activeVehicles: 0, totalVehicles: 0, totalFleets: 0,
          pendingOrders: 0, inTransitOrders: 0, deliveredOrders: 0,
        });
      }

      const ctx = await getEffectiveCityOSContext(req);
      const [ordersRes, driversRes, vehiclesRes, fleetsRes] = await Promise.all([
        fleetbaseList("orders", undefined, ctx), fleetbaseList("drivers", undefined, ctx),
        fleetbaseList("vehicles", undefined, ctx), fleetbaseList("fleets", undefined, ctx),
      ]);

      const ordersList = (ordersRes.ok && Array.isArray(ordersRes.data)) ? ordersRes.data : [];
      const driversList = (driversRes.ok && Array.isArray(driversRes.data)) ? driversRes.data : [];
      const vehiclesList = (vehiclesRes.ok && Array.isArray(vehiclesRes.data)) ? vehiclesRes.data : [];
      const fleetsList = (fleetsRes.ok && Array.isArray(fleetsRes.data)) ? fleetsRes.data : [];

      res.json({
        totalOrders: ordersList.length,
        activeDrivers: driversList.filter((d: any) => d.status === "online").length,
        totalDrivers: driversList.length,
        activeVehicles: vehiclesList.filter((v: any) => v.status === "active").length,
        totalVehicles: vehiclesList.length,
        totalFleets: fleetsList.length,
        pendingOrders: ordersList.filter((o: any) => o.status === "pending").length,
        inTransitOrders: ordersList.filter((o: any) => o.status === "in_transit").length,
        deliveredOrders: ordersList.filter((o: any) => o.status === "delivered").length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
