import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users, routes, issues, fuel_reports, devices, work_orders, parts,
  drivers,
  sensors, events, telematics_records, reports, transactions, custom_fields,
  time_off_requests, scheduler_tasks, settings,
  api_keys, webhooks, webhook_logs, integrations, order_configs,
  fleetbase_servers, service_rates,
  type User, type InsertUser,
  type Route, type InsertRoute,
  type Issue, type InsertIssue,
  type FuelReport, type InsertFuelReport,
  type Device, type InsertDevice,
  type WorkOrder, type InsertWorkOrder,
  type ServiceRate, type InsertServiceRate,
  type Part, type InsertPart,
  type Driver, type InsertDriver,
  type Sensor, type InsertSensor,
  type Event, type InsertEvent,
  type TelematicsRecord, type InsertTelematicsRecord,
  type Report, type InsertReport,
  type Transaction, type InsertTransaction,
  type CustomField, type InsertCustomField,
  type TimeOffRequest, type InsertTimeOffRequest,
  type SchedulerTask, type InsertSchedulerTask,
  type Setting, type InsertSetting,
  type ApiKey, type InsertApiKey,
  type Webhook, type InsertWebhook,
  type WebhookLog, type InsertWebhookLog,
  type Integration, type InsertIntegration,
  type OrderConfig, type InsertOrderConfig,
  type FleetbaseServer, type InsertFleetbaseServer,
} from "@shared/schema";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  getRoutes(): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: string, data: Partial<InsertRoute>): Promise<Route>;
  deleteRoute(id: string): Promise<void>;

  getIssues(): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: string, data: Partial<InsertIssue>): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;

  getFuelReports(): Promise<FuelReport[]>;
  getFuelReport(id: string): Promise<FuelReport | undefined>;
  createFuelReport(report: InsertFuelReport): Promise<FuelReport>;
  updateFuelReport(id: string, data: Partial<InsertFuelReport>): Promise<FuelReport>;
  deleteFuelReport(id: string): Promise<void>;

  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: string): Promise<void>;

  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, data: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;

  getServiceRates(): Promise<ServiceRate[]>;
  getServiceRate(id: string): Promise<ServiceRate | undefined>;
  createServiceRate(rate: InsertServiceRate): Promise<ServiceRate>;
  updateServiceRate(id: string, data: Partial<InsertServiceRate>): Promise<ServiceRate>;
  deleteServiceRate(id: string): Promise<void>;

  getParts(): Promise<Part[]>;
  getPart(id: string): Promise<Part | undefined>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: string, data: Partial<InsertPart>): Promise<Part>;
  deletePart(id: string): Promise<void>;

  getDrivers(): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver>;
  deleteDriver(id: string): Promise<void>;

  getSensors(): Promise<Sensor[]>;
  getSensor(id: string): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor): Promise<Sensor>;
  updateSensor(id: string, data: Partial<InsertSensor>): Promise<Sensor>;
  deleteSensor(id: string): Promise<void>;

  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;

  getTelematicsRecords(): Promise<TelematicsRecord[]>;
  getTelematicsRecord(id: string): Promise<TelematicsRecord | undefined>;
  createTelematicsRecord(record: InsertTelematicsRecord): Promise<TelematicsRecord>;
  updateTelematicsRecord(id: string, data: Partial<InsertTelematicsRecord>): Promise<TelematicsRecord>;
  deleteTelematicsRecord(id: string): Promise<void>;

  getReports(): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: string): Promise<void>;

  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(txn: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  getCustomFields(): Promise<CustomField[]>;
  getCustomField(id: string): Promise<CustomField | undefined>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  updateCustomField(id: string, data: Partial<InsertCustomField>): Promise<CustomField>;
  deleteCustomField(id: string): Promise<void>;

  getTimeOffRequests(): Promise<TimeOffRequest[]>;
  getTimeOffRequest(id: string): Promise<TimeOffRequest | undefined>;
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  updateTimeOffRequest(id: string, data: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest>;
  deleteTimeOffRequest(id: string): Promise<void>;

  getSchedulerTasks(): Promise<SchedulerTask[]>;
  getSchedulerTask(id: string): Promise<SchedulerTask | undefined>;
  createSchedulerTask(task: InsertSchedulerTask): Promise<SchedulerTask>;
  updateSchedulerTask(id: string, data: Partial<InsertSchedulerTask>): Promise<SchedulerTask>;
  deleteSchedulerTask(id: string): Promise<void>;

  getSettings(): Promise<Setting[]>;
  getSetting(id: string): Promise<Setting | undefined>;
  getSettingsByCategory(category: string): Promise<Setting[]>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: string, data: Partial<InsertSetting>): Promise<Setting>;
  deleteSetting(id: string): Promise<void>;
  upsertSetting(category: string, key: string, value: string): Promise<Setting>;

  getApiKeys(): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  createApiKey(key: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey>;
  deleteApiKey(id: string): Promise<void>;

  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: string): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook>;
  deleteWebhook(id: string): Promise<void>;

  getWebhookLogs(): Promise<WebhookLog[]>;
  getWebhookLog(id: string): Promise<WebhookLog | undefined>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  updateWebhookLog(id: string, data: Partial<InsertWebhookLog>): Promise<WebhookLog>;
  deleteWebhookLog(id: string): Promise<void>;

  getIntegrations(): Promise<Integration[]>;
  getIntegration(id: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration>;
  deleteIntegration(id: string): Promise<void>;

  getOrderConfigs(): Promise<OrderConfig[]>;
  getOrderConfig(id: string): Promise<OrderConfig | undefined>;
  createOrderConfig(config: InsertOrderConfig): Promise<OrderConfig>;
  updateOrderConfig(id: string, data: Partial<InsertOrderConfig>): Promise<OrderConfig>;
  deleteOrderConfig(id: string): Promise<void>;

  getFleetbaseServers(): Promise<FleetbaseServer[]>;
  getFleetbaseServer(id: string): Promise<FleetbaseServer | undefined>;
  getActiveFleetbaseServer(): Promise<FleetbaseServer | undefined>;
  createFleetbaseServer(server: InsertFleetbaseServer): Promise<FleetbaseServer>;
  updateFleetbaseServer(id: string, data: Partial<InsertFleetbaseServer>): Promise<FleetbaseServer>;
  deleteFleetbaseServer(id: string): Promise<void>;
  setActiveFleetbaseServer(id: string): Promise<FleetbaseServer>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getRoutes(): Promise<Route[]> { return db.select().from(routes); }
  async getRoute(id: string): Promise<Route | undefined> {
    const [item] = await db.select().from(routes).where(eq(routes.id, id));
    return item;
  }
  async createRoute(route: InsertRoute): Promise<Route> {
    const [created] = await db.insert(routes).values(route).returning();
    return created;
  }
  async updateRoute(id: string, data: Partial<InsertRoute>): Promise<Route> {
    const [updated] = await db.update(routes).set(data).where(eq(routes.id, id)).returning();
    return updated;
  }
  async deleteRoute(id: string): Promise<void> { await db.delete(routes).where(eq(routes.id, id)); }

  async getIssues(): Promise<Issue[]> { return db.select().from(issues); }
  async getIssue(id: string): Promise<Issue | undefined> {
    const [item] = await db.select().from(issues).where(eq(issues.id, id));
    return item;
  }
  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [created] = await db.insert(issues).values(issue).returning();
    return created;
  }
  async updateIssue(id: string, data: Partial<InsertIssue>): Promise<Issue> {
    const [updated] = await db.update(issues).set(data).where(eq(issues.id, id)).returning();
    return updated;
  }
  async deleteIssue(id: string): Promise<void> { await db.delete(issues).where(eq(issues.id, id)); }

  async getFuelReports(): Promise<FuelReport[]> { return db.select().from(fuel_reports); }
  async getFuelReport(id: string): Promise<FuelReport | undefined> {
    const [item] = await db.select().from(fuel_reports).where(eq(fuel_reports.id, id));
    return item;
  }
  async createFuelReport(report: InsertFuelReport): Promise<FuelReport> {
    const [created] = await db.insert(fuel_reports).values(report).returning();
    return created;
  }
  async updateFuelReport(id: string, data: Partial<InsertFuelReport>): Promise<FuelReport> {
    const [updated] = await db.update(fuel_reports).set(data).where(eq(fuel_reports.id, id)).returning();
    return updated;
  }
  async deleteFuelReport(id: string): Promise<void> { await db.delete(fuel_reports).where(eq(fuel_reports.id, id)); }

  async getDevices(): Promise<Device[]> { return db.select().from(devices); }
  async getDevice(id: string): Promise<Device | undefined> {
    const [item] = await db.select().from(devices).where(eq(devices.id, id));
    return item;
  }
  async createDevice(device: InsertDevice): Promise<Device> {
    const [created] = await db.insert(devices).values(device).returning();
    return created;
  }
  async updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device> {
    const [updated] = await db.update(devices).set(data).where(eq(devices.id, id)).returning();
    return updated;
  }
  async deleteDevice(id: string): Promise<void> { await db.delete(devices).where(eq(devices.id, id)); }

  async getWorkOrders(): Promise<WorkOrder[]> { return db.select().from(work_orders); }
  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    const [item] = await db.select().from(work_orders).where(eq(work_orders.id, id));
    return item;
  }
  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [created] = await db.insert(work_orders).values(workOrder).returning();
    return created;
  }
  async updateWorkOrder(id: string, data: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const [updated] = await db.update(work_orders).set(data).where(eq(work_orders.id, id)).returning();
    return updated;
  }
  async deleteWorkOrder(id: string): Promise<void> { await db.delete(work_orders).where(eq(work_orders.id, id)); }

  async getServiceRates(): Promise<ServiceRate[]> { return db.select().from(service_rates); }
  async getServiceRate(id: string): Promise<ServiceRate | undefined> {
    const [item] = await db.select().from(service_rates).where(eq(service_rates.id, id));
    return item;
  }
  async createServiceRate(rate: InsertServiceRate): Promise<ServiceRate> {
    const [created] = await db.insert(service_rates).values(rate).returning();
    return created;
  }
  async updateServiceRate(id: string, data: Partial<InsertServiceRate>): Promise<ServiceRate> {
    const [updated] = await db.update(service_rates).set(data).where(eq(service_rates.id, id)).returning();
    return updated;
  }
  async deleteServiceRate(id: string): Promise<void> { await db.delete(service_rates).where(eq(service_rates.id, id)); }

  async getParts(): Promise<Part[]> { return db.select().from(parts); }
  async getPart(id: string): Promise<Part | undefined> {
    const [item] = await db.select().from(parts).where(eq(parts.id, id));
    return item;
  }
  async createPart(part: InsertPart): Promise<Part> {
    const [created] = await db.insert(parts).values(part).returning();
    return created;
  }
  async updatePart(id: string, data: Partial<InsertPart>): Promise<Part> {
    const [updated] = await db.update(parts).set(data).where(eq(parts.id, id)).returning();
    return updated;
  }
  async deletePart(id: string): Promise<void> { await db.delete(parts).where(eq(parts.id, id)); }

  async getDrivers(): Promise<Driver[]> { return db.select().from(drivers); }
  async getDriver(id: string): Promise<Driver | undefined> {
    const [item] = await db.select().from(drivers).where(eq(drivers.id, id));
    return item;
  }
  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [created] = await db.insert(drivers).values(driver).returning();
    return created;
  }
  async updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver> {
    const [updated] = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
    return updated;
  }
  async deleteDriver(id: string): Promise<void> { await db.delete(drivers).where(eq(drivers.id, id)); }

  async getCustomFields(): Promise<CustomField[]> { return db.select().from(custom_fields); }
  async getCustomField(id: string): Promise<CustomField | undefined> {
    const [item] = await db.select().from(custom_fields).where(eq(custom_fields.id, id));
    return item;
  }
  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    const [created] = await db.insert(custom_fields).values(field).returning();
    return created;
  }
  async updateCustomField(id: string, data: Partial<InsertCustomField>): Promise<CustomField> {
    const [updated] = await db.update(custom_fields).set(data).where(eq(custom_fields.id, id)).returning();
    return updated;
  }
  async deleteCustomField(id: string): Promise<void> { await db.delete(custom_fields).where(eq(custom_fields.id, id)); }

  async getSensors(): Promise<Sensor[]> { return db.select().from(sensors); }
  async getSensor(id: string): Promise<Sensor | undefined> {
    const [item] = await db.select().from(sensors).where(eq(sensors.id, id));
    return item;
  }
  async createSensor(sensor: InsertSensor): Promise<Sensor> {
    const [created] = await db.insert(sensors).values(sensor).returning();
    return created;
  }
  async updateSensor(id: string, data: Partial<InsertSensor>): Promise<Sensor> {
    const [updated] = await db.update(sensors).set(data).where(eq(sensors.id, id)).returning();
    return updated;
  }
  async deleteSensor(id: string): Promise<void> { await db.delete(sensors).where(eq(sensors.id, id)); }

  async getEvents(): Promise<Event[]> { return db.select().from(events); }
  async getEvent(id: string): Promise<Event | undefined> {
    const [item] = await db.select().from(events).where(eq(events.id, id));
    return item;
  }
  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }
  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }
  async deleteEvent(id: string): Promise<void> { await db.delete(events).where(eq(events.id, id)); }

  async getTelematicsRecords(): Promise<TelematicsRecord[]> { return db.select().from(telematics_records); }
  async getTelematicsRecord(id: string): Promise<TelematicsRecord | undefined> {
    const [item] = await db.select().from(telematics_records).where(eq(telematics_records.id, id));
    return item;
  }
  async createTelematicsRecord(record: InsertTelematicsRecord): Promise<TelematicsRecord> {
    const [created] = await db.insert(telematics_records).values(record).returning();
    return created;
  }
  async updateTelematicsRecord(id: string, data: Partial<InsertTelematicsRecord>): Promise<TelematicsRecord> {
    const [updated] = await db.update(telematics_records).set(data).where(eq(telematics_records.id, id)).returning();
    return updated;
  }
  async deleteTelematicsRecord(id: string): Promise<void> { await db.delete(telematics_records).where(eq(telematics_records.id, id)); }

  async getReports(): Promise<Report[]> { return db.select().from(reports); }
  async getReport(id: string): Promise<Report | undefined> {
    const [item] = await db.select().from(reports).where(eq(reports.id, id));
    return item;
  }
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }
  async updateReport(id: string, data: Partial<InsertReport>): Promise<Report> {
    const [updated] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return updated;
  }
  async deleteReport(id: string): Promise<void> { await db.delete(reports).where(eq(reports.id, id)); }

  async getTransactions(): Promise<Transaction[]> { return db.select().from(transactions); }
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [item] = await db.select().from(transactions).where(eq(transactions.id, id));
    return item;
  }
  async createTransaction(txn: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(txn).returning();
    return created;
  }
  async updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<Transaction> {
    const [updated] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return updated;
  }
  async deleteTransaction(id: string): Promise<void> { await db.delete(transactions).where(eq(transactions.id, id)); }

  async getTimeOffRequests(): Promise<TimeOffRequest[]> { return db.select().from(time_off_requests); }
  async getTimeOffRequest(id: string): Promise<TimeOffRequest | undefined> {
    const [item] = await db.select().from(time_off_requests).where(eq(time_off_requests.id, id));
    return item;
  }
  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const [created] = await db.insert(time_off_requests).values(request).returning();
    return created;
  }
  async updateTimeOffRequest(id: string, data: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest> {
    const [updated] = await db.update(time_off_requests).set(data).where(eq(time_off_requests.id, id)).returning();
    return updated;
  }
  async deleteTimeOffRequest(id: string): Promise<void> { await db.delete(time_off_requests).where(eq(time_off_requests.id, id)); }

  async getSchedulerTasks(): Promise<SchedulerTask[]> { return db.select().from(scheduler_tasks); }
  async getSchedulerTask(id: string): Promise<SchedulerTask | undefined> {
    const [item] = await db.select().from(scheduler_tasks).where(eq(scheduler_tasks.id, id));
    return item;
  }
  async createSchedulerTask(task: InsertSchedulerTask): Promise<SchedulerTask> {
    const [created] = await db.insert(scheduler_tasks).values(task).returning();
    return created;
  }
  async updateSchedulerTask(id: string, data: Partial<InsertSchedulerTask>): Promise<SchedulerTask> {
    const [updated] = await db.update(scheduler_tasks).set(data).where(eq(scheduler_tasks.id, id)).returning();
    return updated;
  }
  async deleteSchedulerTask(id: string): Promise<void> { await db.delete(scheduler_tasks).where(eq(scheduler_tasks.id, id)); }

  async getSettings(): Promise<Setting[]> { return db.select().from(settings); }
  async getSetting(id: string): Promise<Setting | undefined> {
    const [item] = await db.select().from(settings).where(eq(settings.id, id));
    return item;
  }
  async getSettingsByCategory(category: string): Promise<Setting[]> {
    return db.select().from(settings).where(eq(settings.category, category));
  }
  async createSetting(setting: InsertSetting): Promise<Setting> {
    const [created] = await db.insert(settings).values(setting).returning();
    return created;
  }
  async updateSetting(id: string, data: Partial<InsertSetting>): Promise<Setting> {
    const [updated] = await db.update(settings).set(data).where(eq(settings.id, id)).returning();
    return updated;
  }
  async deleteSetting(id: string): Promise<void> { await db.delete(settings).where(eq(settings.id, id)); }
  async upsertSetting(category: string, key: string, value: string): Promise<Setting> {
    const existing = await db.select().from(settings)
      .where(eq(settings.category, category))
      .then(rows => rows.find(r => r.key === key));
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ category, key, value }).returning();
    return created;
  }

  async getApiKeys(): Promise<ApiKey[]> { return db.select().from(api_keys); }
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [item] = await db.select().from(api_keys).where(eq(api_keys.id, id));
    return item;
  }
  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(api_keys).values(key).returning();
    return created;
  }
  async updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey> {
    const [updated] = await db.update(api_keys).set(data).where(eq(api_keys.id, id)).returning();
    return updated;
  }
  async deleteApiKey(id: string): Promise<void> { await db.delete(api_keys).where(eq(api_keys.id, id)); }

  async getWebhooks(): Promise<Webhook[]> { return db.select().from(webhooks); }
  async getWebhook(id: string): Promise<Webhook | undefined> {
    const [item] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return item;
  }
  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    const [created] = await db.insert(webhooks).values(webhook).returning();
    return created;
  }
  async updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook> {
    const [updated] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return updated;
  }
  async deleteWebhook(id: string): Promise<void> { await db.delete(webhooks).where(eq(webhooks.id, id)); }

  async getWebhookLogs(): Promise<WebhookLog[]> { return db.select().from(webhook_logs); }
  async getWebhookLog(id: string): Promise<WebhookLog | undefined> {
    const [item] = await db.select().from(webhook_logs).where(eq(webhook_logs.id, id));
    return item;
  }
  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [created] = await db.insert(webhook_logs).values(log).returning();
    return created;
  }
  async updateWebhookLog(id: string, data: Partial<InsertWebhookLog>): Promise<WebhookLog> {
    const [updated] = await db.update(webhook_logs).set(data).where(eq(webhook_logs.id, id)).returning();
    return updated;
  }
  async deleteWebhookLog(id: string): Promise<void> { await db.delete(webhook_logs).where(eq(webhook_logs.id, id)); }

  async getIntegrations(): Promise<Integration[]> { return db.select().from(integrations); }
  async getIntegration(id: string): Promise<Integration | undefined> {
    const [item] = await db.select().from(integrations).where(eq(integrations.id, id));
    return item;
  }
  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(integrations).values(integration).returning();
    return created;
  }
  async updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration> {
    const [updated] = await db.update(integrations).set(data).where(eq(integrations.id, id)).returning();
    return updated;
  }
  async deleteIntegration(id: string): Promise<void> { await db.delete(integrations).where(eq(integrations.id, id)); }

  async getOrderConfigs(): Promise<OrderConfig[]> { return db.select().from(order_configs); }
  async getOrderConfig(id: string): Promise<OrderConfig | undefined> {
    const [item] = await db.select().from(order_configs).where(eq(order_configs.id, id));
    return item;
  }
  async createOrderConfig(config: InsertOrderConfig): Promise<OrderConfig> {
    const [created] = await db.insert(order_configs).values(config).returning();
    return created;
  }
  async updateOrderConfig(id: string, data: Partial<InsertOrderConfig>): Promise<OrderConfig> {
    const [updated] = await db.update(order_configs).set(data).where(eq(order_configs.id, id)).returning();
    return updated;
  }
  async deleteOrderConfig(id: string): Promise<void> { await db.delete(order_configs).where(eq(order_configs.id, id)); }

  async getFleetbaseServers(): Promise<FleetbaseServer[]> {
    return db.select().from(fleetbase_servers);
  }
  async getFleetbaseServer(id: string): Promise<FleetbaseServer | undefined> {
    const [item] = await db.select().from(fleetbase_servers).where(eq(fleetbase_servers.id, id));
    return item;
  }
  async getActiveFleetbaseServer(): Promise<FleetbaseServer | undefined> {
    const [item] = await db.select().from(fleetbase_servers).where(eq(fleetbase_servers.is_active, true));
    return item;
  }
  async createFleetbaseServer(server: InsertFleetbaseServer): Promise<FleetbaseServer> {
    const [created] = await db.insert(fleetbase_servers).values(server).returning();
    return created;
  }
  async updateFleetbaseServer(id: string, data: Partial<InsertFleetbaseServer>): Promise<FleetbaseServer> {
    const [updated] = await db.update(fleetbase_servers).set(data).where(eq(fleetbase_servers.id, id)).returning();
    return updated;
  }
  async deleteFleetbaseServer(id: string): Promise<void> {
    await db.delete(fleetbase_servers).where(eq(fleetbase_servers.id, id));
  }
  async setActiveFleetbaseServer(id: string): Promise<FleetbaseServer> {
    const [exists] = await db.select().from(fleetbase_servers).where(eq(fleetbase_servers.id, id));
    if (!exists) {
      throw new Error("Server not found");
    }
    await db.update(fleetbase_servers).set({ is_active: false });
    const [updated] = await db.update(fleetbase_servers)
      .set({ is_active: true, status: "connected", last_connected: new Date() })
      .where(eq(fleetbase_servers.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
