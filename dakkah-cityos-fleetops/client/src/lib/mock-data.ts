import { faker } from "@faker-js/faker";

// Helper to generate consistent mock data
export type Driver = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "online" | "offline" | "busy";
  vehicle?: string;
  avatar: string;
  rating: number;
  jobsCompleted: number;
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  type: "truck" | "van" | "scooter";
  status: "active" | "maintenance" | "inactive";
  driverId?: string;
  fuelLevel: number;
  location: { lat: number; lng: number };
};

export type Order = {
  id: string;
  customer: string;
  address: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  price: string;
  createdAt: Date;
  driverId?: string;
};

// Generate Orders
export const generateOrders = (count = 30): Order[] => {
  return Array.from({ length: count }).map(() => ({
    id: `ORD-${faker.string.alphanumeric(6).toUpperCase()}`,
    customer: faker.person.fullName(),
    address: faker.location.streetAddress(),
    status: faker.helpers.arrayElement(["pending", "assigned", "in_transit", "delivered", "cancelled"]),
    price: faker.commerce.price(),
    createdAt: faker.date.recent(),
  }));
};

// Generate Drivers
export const generateDrivers = (count = 20): Driver[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    status: faker.helpers.arrayElement(["online", "offline", "busy"]),
    vehicle: faker.helpers.arrayElement(["Ford Transit", "Mercedes Sprinter", "Vespa S"]),
    avatar: faker.image.avatar(),
    rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
    jobsCompleted: faker.number.int({ min: 0, max: 500 }),
  }));
};

// Generate Vehicles
export const generateVehicles = (count = 15): Vehicle[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    plate: faker.vehicle.vrm(),
    model: faker.vehicle.vehicle(),
    type: faker.helpers.arrayElement(["truck", "van", "scooter"]),
    status: faker.helpers.arrayElement(["active", "maintenance", "inactive"]),
    fuelLevel: faker.number.int({ min: 10, max: 100 }),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
  }));
};

// Generate Service Zones
export type ServiceZone = {
  id: string;
  name: string;
  type: "delivery" | "pickup" | "service";
  color: string;
  area: number; // sq km
  coordinates: [number, number]; // Center point
};

export const generateServiceZones = (count = 8): ServiceZone[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.location.city() + " " + faker.helpers.arrayElement(["Zone", "District", "Area"]),
    type: faker.helpers.arrayElement(["delivery", "pickup", "service"]),
    color: faker.color.rgb(),
    area: faker.number.float({ min: 5, max: 100, fractionDigits: 1 }),
    coordinates: [faker.location.latitude(), faker.location.longitude()],
  }));
};

// Generate API Keys
export type ApiKey = {
  id: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  scopes: string[];
  status: "active" | "revoked";
  created: Date;
};

export const generateApiKeys = (count = 5): ApiKey[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.company.buzzNoun() + "-app-key",
    key: "sk_" + faker.string.alphanumeric(24),
    lastUsed: faker.date.recent(),
    scopes: ["orders.read", "orders.write", "drivers.read"],
    status: "active",
    created: faker.date.past(),
  }));
};

// Generate Webhooks
export type Webhook = {
  id: string;
  url: string;
  events: string[];
  status: "active" | "failed" | "disabled";
  successRate: number;
};

export const generateWebhooks = (count = 3): Webhook[] => {
  return Array.from({ length: count }).map(() => ({
    id: `wh_${faker.string.alphanumeric(12)}`,
    url: faker.internet.url(),
    events: ["order.created", "order.updated", "driver.arrived"],
    status: faker.helpers.arrayElement(["active", "failed", "disabled"]),
    successRate: faker.number.int({ min: 80, max: 100 }),
  }));
};

// Generate Integrations
export type Integration = {
  id: string;
  name: string;
  provider: "stripe" | "twilio" | "samsara" | "google_maps" | "slack";
  category: "payment" | "communication" | "telematics" | "mapping" | "notification";
  status: "connected" | "disconnected";
  description: string;
};

export const generateIntegrations = (): Integration[] => {
  return [
    { id: "1", name: "Stripe Connect", provider: "stripe", category: "payment", status: "connected", description: "Process payments for orders." },
    { id: "2", name: "Twilio SMS", provider: "twilio", category: "communication", status: "connected", description: "Send SMS notifications to customers." },
    { id: "3", name: "Google Maps Platform", provider: "google_maps", category: "mapping", status: "connected", description: "Geocoding and routing services." },
    { id: "4", name: "Samsara", provider: "samsara", category: "telematics", status: "disconnected", description: "Sync vehicle telemetry data." },
    { id: "5", name: "Slack", provider: "slack", category: "notification", status: "disconnected", description: "Post order updates to channels." },
  ];
};

// Generate Notifications
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  timestamp: Date;
  resourceId?: string;
  resourceType?: string;
};

export const generateNotifications = (count = 10): Notification[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    title: faker.helpers.arrayElement(["Order Delayed", "Driver Arrived", "Vehicle Maintenance", "Payment Failed", "New Message"]),
    message: faker.lorem.sentence(),
    type: faker.helpers.arrayElement(["info", "warning", "success", "error"]),
    read: faker.datatype.boolean(),
    timestamp: faker.date.recent(),
    resourceId: faker.string.uuid(),
    resourceType: faker.helpers.arrayElement(["order", "driver", "vehicle"]),
  }));
};

// Generate Time Off Requests
export type TimeOffRequest = {
  id: string;
  driverId: string;
  start: Date;
  end: Date;
  reason: string;
  status: "pending" | "approved" | "rejected";
  type: "vacation" | "sick" | "personal";
};

export const generateTimeOffRequests = (count = 8): TimeOffRequest[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    driverId: faker.person.fullName(),
    start: faker.date.future(),
    end: faker.date.future(),
    reason: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(["pending", "approved", "rejected"]),
    type: faker.helpers.arrayElement(["vacation", "sick", "personal"]),
  }));
};

// Generate Team Members
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "dispatcher" | "manager" | "viewer";
  status: "active" | "invited" | "disabled";
  lastActive: Date;
};

export const generateTeamMembers = (count = 10): TeamMember[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(["admin", "dispatcher", "manager", "viewer"]),
    status: faker.helpers.arrayElement(["active", "invited", "disabled"]),
    lastActive: faker.date.recent(),
  }));
};

// Generate Vendors
export type Vendor = {
  id: string;
  name: string;
  serviceType: string;
  status: "active" | "pending" | "suspended";
  rating: number;
  ordersCompleted: number;
  email: string;
  phone: string;
};

export const generateVendors = (count = 8): Vendor[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    serviceType: faker.helpers.arrayElement(["Freight", "Last Mile", "Courier", "Haulage"]),
    status: faker.helpers.arrayElement(["active", "pending", "suspended"]),
    rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
    ordersCompleted: faker.number.int({ min: 10, max: 1000 }),
    email: faker.internet.email(),
    phone: faker.phone.number(),
  }));
};

// Generate Transactions
export type Transaction = {
  id: string;
  description: string;
  amount: string;
  type: "credit" | "debit";
  status: "completed" | "pending" | "failed";
  date: Date;
  method: string;
};

export const generateTransactions = (count = 15): Transaction[] => {
  return Array.from({ length: count }).map(() => ({
    id: `TXN-${faker.string.alphanumeric(8).toUpperCase()}`,
    description: faker.finance.transactionDescription(),
    amount: faker.finance.amount(),
    type: faker.helpers.arrayElement(["credit", "debit"]),
    status: faker.helpers.arrayElement(["completed", "pending", "failed"]),
    date: faker.date.recent(),
    method: faker.helpers.arrayElement(["Stripe", "Bank Transfer", "Wallet"]),
  }));
};

// Generate Optimized Routes
export type OptimizedRoute = {
  id: string;
  driverId: string;
  vehicleId: string;
  status: "draft" | "scheduled" | "active" | "completed";
  distance: string;
  duration: string;
  stops: number;
  date: Date;
};

export const generateOptimizedRoutes = (count = 5): OptimizedRoute[] => {
  return Array.from({ length: count }).map(() => ({
    id: `RTE-${faker.string.alphanumeric(6).toUpperCase()}`,
    driverId: faker.person.fullName(),
    vehicleId: faker.vehicle.vrm(),
    status: faker.helpers.arrayElement(["draft", "scheduled", "active", "completed"]),
    distance: `${faker.number.float({ min: 10, max: 150, fractionDigits: 1 })} km`,
    duration: `${faker.number.int({ min: 30, max: 400 })} min`,
    stops: faker.number.int({ min: 3, max: 15 }),
    date: faker.date.future(),
  }));
};

// Generate Custom Fields
export type CustomField = {
  id: string;
  model: "order" | "driver" | "vehicle" | "place";
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  required: boolean;
  order: number;
};

export const generateCustomFields = (count = 8): CustomField[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: faker.string.uuid(),
    model: faker.helpers.arrayElement(["order", "driver", "vehicle", "place"]),
    label: faker.company.buzzNoun() + " " + faker.helpers.arrayElement(["ID", "Code", "Date", "Status"]),
    type: faker.helpers.arrayElement(["text", "number", "date", "select", "boolean"]),
    required: faker.datatype.boolean(),
    order: i + 1,
  }));
};

// Generate Analytics Reports
export type Report = {
  id: string;
  name: string;
  category: "operations" | "financial" | "performance";
  generatedAt: Date;
  format: "csv" | "pdf" | "xls";
  size: string;
};

export const generateReports = (count = 10): Report[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement(["Daily Orders", "Driver Performance", "Fuel Consumption", "Revenue Summary", "Late Deliveries"]) + " Report",
    category: faker.helpers.arrayElement(["operations", "financial", "performance"]),
    generatedAt: faker.date.recent(),
    format: faker.helpers.arrayElement(["csv", "pdf", "xls"]),
    size: `${faker.number.float({ min: 0.5, max: 15, fractionDigits: 1 })} MB`,
  }));
};

// Generate Parts (Inventory)
export type Part = {
  id: string;
  name: string;
  sku: string;
  category: "engine" | "tires" | "fluids" | "electronics" | "body";
  stock: number;
  minStock: number;
  cost: string;
  location: string;
};

export const generateParts = (count = 20): Part[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    sku: faker.string.alphanumeric(8).toUpperCase(),
    category: faker.helpers.arrayElement(["engine", "tires", "fluids", "electronics", "body"]),
    stock: faker.number.int({ min: 0, max: 100 }),
    minStock: faker.number.int({ min: 5, max: 20 }),
    cost: faker.commerce.price({ min: 10, max: 500 }),
    location: `Shelf ${faker.string.alpha(1).toUpperCase()}-${faker.number.int({ min: 1, max: 10 })}`,
  }));
};

// Generate Fuel Reports
export type FuelReport = {
  id: string;
  vehicleId: string;
  driverId: string;
  date: Date;
  volume: number; // liters/gallons
  cost: string;
  odometer: number;
  station: string;
};

export const generateFuelReports = (count = 20): FuelReport[] => {
  return Array.from({ length: count }).map(() => ({
    id: `FUEL-${faker.string.numeric(5)}`,
    vehicleId: faker.vehicle.vrm(),
    driverId: faker.person.fullName(),
    date: faker.date.recent(),
    volume: faker.number.float({ min: 20, max: 100, fractionDigits: 1 }),
    cost: faker.commerce.price({ min: 50, max: 200 }),
    odometer: faker.number.int({ min: 10000, max: 150000 }),
    station: faker.company.name() + " Station",
  }));
};

// Generate Issues
export type Issue = {
  id: string;
  vehicleId: string;
  reportedBy: string;
  type: "breakdown" | "accident" | "warning_light" | "noise";
  priority: "low" | "medium" | "critical";
  status: "open" | "investigating" | "resolved";
  description: string;
  reportedAt: Date;
};

export const generateIssues = (count = 15): Issue[] => {
  return Array.from({ length: count }).map(() => ({
    id: `ISS-${faker.string.numeric(4)}`,
    vehicleId: faker.vehicle.vrm(),
    reportedBy: faker.person.fullName(),
    type: faker.helpers.arrayElement(["breakdown", "accident", "warning_light", "noise"]),
    priority: faker.helpers.arrayElement(["low", "medium", "critical"]),
    status: faker.helpers.arrayElement(["open", "investigating", "resolved"]),
    description: faker.lorem.sentence(),
    reportedAt: faker.date.recent(),
  }));
};

// Generate Places
export type Place = {
  id: string;
  name: string;
  address: string;
  type: "warehouse" | "hub" | "customer_site";
  coordinates: { lat: number; lng: number };
};

export const generatePlaces = (count = 10): Place[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.company.name() + " " + faker.helpers.arrayElement(["Hub", "Depot", "HQ"]),
    address: faker.location.streetAddress(),
    type: faker.helpers.arrayElement(["warehouse", "hub", "customer_site"]),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
  }));
};

// Generate Work Orders
export type WorkOrder = {
  id: string;
  vehicleId: string;
  type: "repair" | "maintenance" | "inspection";
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: Date;
  cost: string;
};

export const generateWorkOrders = (count = 15): WorkOrder[] => {
  return Array.from({ length: count }).map(() => ({
    id: `WO-${faker.string.numeric(5)}`,
    vehicleId: faker.vehicle.vrm(),
    type: faker.helpers.arrayElement(["repair", "maintenance", "inspection"]),
    status: faker.helpers.arrayElement(["pending", "in_progress", "completed"]),
    priority: faker.helpers.arrayElement(["low", "medium", "high"]),
    dueDate: faker.date.future(),
    cost: faker.commerce.price({ min: 50, max: 2000 }),
  }));
};

// Generate Devices (IoT)
export type Device = {
  id: string;
  serial: string;
  type: "gps_tracker" | "obd_dongle" | "temp_sensor";
  status: "online" | "offline";
  lastHeartbeat: Date;
  batteryLevel: number;
};

export const generateDevices = (count = 20): Device[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    serial: faker.string.alphanumeric(12).toUpperCase(),
    type: faker.helpers.arrayElement(["gps_tracker", "obd_dongle", "temp_sensor"]),
    status: faker.helpers.arrayElement(["online", "offline"]),
    lastHeartbeat: faker.date.recent(),
    batteryLevel: faker.number.int({ min: 10, max: 100 }),
  }));
};

// Generate Fleets
export type Fleet = {
  id: string;
  name: string;
  zone: string;
  vehiclesCount: number;
  driversCount: number;
  status: "active" | "inactive";
};

export const generateFleets = (count = 5): Fleet[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.company.name() + " Logistics",
    zone: faker.location.city(),
    vehiclesCount: faker.number.int({ min: 5, max: 50 }),
    driversCount: faker.number.int({ min: 5, max: 50 }),
    status: faker.helpers.arrayElement(["active", "inactive"]),
  }));
};

// Generate Contacts
export type Contact = {
  id: string;
  name: string;
  type: "customer" | "vendor";
  phone: string;
  email: string;
  address: string;
};

export const generateContacts = (count = 20): Contact[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    type: faker.helpers.arrayElement(["customer", "vendor"]),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: faker.location.streetAddress(),
  }));
};

// Generate Service Rates
export type ServiceRate = {
  id: string;
  name: string;
  serviceType: "parcel" | "freight" | "express";
  baseRate: string;
  perKmRate: string;
  currency: string;
  zone: string;
};

export const generateServiceRates = (count = 10): ServiceRate[] => {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.commerce.productAdjective() + " Delivery",
    serviceType: faker.helpers.arrayElement(["parcel", "freight", "express"]),
    baseRate: faker.commerce.price({ min: 5, max: 50 }),
    perKmRate: faker.commerce.price({ min: 0.5, max: 5 }),
    currency: "USD",
    zone: faker.location.city(),
  }));
};

// Generate Scheduler Events
export type ScheduleEvent = {
  id: string;
  resourceId: string; // Driver ID
  title: string;
  start: Date;
  end: Date;
  type: "job" | "break" | "maintenance";
};

export const generateSchedule = (drivers: Driver[]): ScheduleEvent[] => {
  const events: ScheduleEvent[] = [];
  drivers.forEach(driver => {
    // Generate 1-3 events per driver for today
    const numEvents = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numEvents; i++) {
      const startHour = faker.number.int({ min: 8, max: 16 });
      const duration = faker.number.int({ min: 1, max: 3 });
      const startDate = new Date();
      startDate.setHours(startHour, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(startHour + duration, 0, 0, 0);

      events.push({
        id: faker.string.uuid(),
        resourceId: driver.id,
        title: faker.helpers.arrayElement(["Order #1234", "Lunch Break", "Vehicle Check"]),
        start: startDate,
        end: endDate,
        type: faker.helpers.arrayElement(["job", "break", "maintenance"]),
      });
    }
  });
  return events;
};
