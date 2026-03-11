import { db } from "./db";
import bcrypt from "bcryptjs";
import {
  orders, drivers, vehicles, fleets, places, contacts, vendors,
  zones, routes, issues, fuel_reports, devices, work_orders,
  service_rates, parts, custom_fields, users
} from "@shared/schema";

const statuses = {
  order: ["pending", "assigned", "in_transit", "delivered", "cancelled"],
  driver: ["online", "offline", "busy"],
  vehicle: ["active", "maintenance", "inactive"],
  fleet: ["active", "inactive"],
  issue: ["open", "investigating", "resolved"],
  priority: ["low", "medium", "high", "critical"],
  device: ["online", "offline"],
  workOrder: ["pending", "in_progress", "completed"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number, dec = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function uid(prefix: string) { return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`; }

const names = ["Ahmed Al-Rashid", "Fatima Hassan", "Omar Khalil", "Sarah Ibrahim", "Yusuf Malik", "Aisha Noor", "Khalid Zayed", "Maryam Al-Farsi", "Hassan Qureshi", "Layla Mohsen", "Tariq Mansour", "Noura Al-Sayed", "Hamad bin Ali", "Salma Al-Dosari", "Rashed Al-Thani"];
const cities = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar", "Tabuk", "Abha"];
const streets = ["King Fahd Rd", "Olaya St", "Tahlia St", "King Abdullah Rd", "Prince Sultan Rd", "Al Madinah Rd", "King Khalid St", "Al Batha St"];
const vehicleModels = ["Toyota Hilux", "Ford Transit", "Mercedes Sprinter", "Isuzu NPR", "Hyundai H100", "Nissan Urvan", "Mitsubishi Canter", "Hino 300"];
const vehicleTypes = ["truck", "van", "scooter"];
const placeTypes = ["warehouse", "hub", "customer_site"];
const serviceTypes = ["Freight", "Last Mile", "Courier", "Haulage"];
const issueTypes = ["breakdown", "accident", "warning_light", "noise"];
const deviceTypes = ["gps_tracker", "obd_dongle", "temp_sensor"];

export async function seedDatabase() {
  const existing = await db.select().from(orders);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding database...");

  const fleetData = Array.from({ length: 5 }, () => ({
    name: `${pick(cities)} Fleet`,
    status: pick(statuses.fleet),
  }));
  const insertedFleets = await db.insert(fleets).values(fleetData).returning();

  const driverData = Array.from({ length: 15 }, () => ({
    name: pick(names),
    phone: `+966 5${rand(10, 99)} ${rand(100, 999)} ${rand(1000, 9999)}`,
    email: `driver${rand(1, 999)}@fleet.sa`,
    status: pick(statuses.driver),
    fleet_uuid: pick(insertedFleets).id,
  }));
  const insertedDrivers = await db.insert(drivers).values(driverData).returning();

  const vehicleData = Array.from({ length: 20 }, () => ({
    plate_number: `${String.fromCharCode(65 + rand(0, 25))}${String.fromCharCode(65 + rand(0, 25))}${String.fromCharCode(65 + rand(0, 25))} ${rand(1000, 9999)}`,
    make: pick(vehicleModels).split(" ")[0],
    model: pick(vehicleModels).split(" ").slice(1).join(" ") || "Default",
    type: pick(vehicleTypes),
    status: pick(statuses.vehicle),
    driver_uuid: Math.random() > 0.3 ? pick(insertedDrivers).id : null,
  }));
  const insertedVehicles = await db.insert(vehicles).values(vehicleData).returning();

  const orderData = Array.from({ length: 30 }, () => ({
    tracking_number: uid("ORD"),
    status: pick(statuses.order),
    total_amount: `${randFloat(25, 500, 2)}`,
    driver_assigned_uuid: Math.random() > 0.4 ? pick(insertedDrivers).id : null,
    notes: Math.random() > 0.5 ? "Handle with care" : null,
  }));
  await db.insert(orders).values(orderData);

  const placeData = Array.from({ length: 10 }, () => ({
    name: `${pick(cities)} ${pick(["Hub", "Depot", "HQ", "Warehouse"])}`,
    street1: `${rand(1, 999)} ${pick(streets)}`,
    city: pick(cities),
    type: pick(placeTypes),
  }));
  await db.insert(places).values(placeData);

  const contactData = Array.from({ length: 20 }, () => ({
    name: pick(names),
    type: pick(["customer", "vendor"]),
    phone: `+966 5${rand(10, 99)} ${rand(100, 999)} ${rand(1000, 9999)}`,
    email: `contact${rand(1, 999)}@email.sa`,
  }));
  await db.insert(contacts).values(contactData);

  const vendorData = Array.from({ length: 8 }, () => ({
    name: `${pick(cities)} ${pick(["Logistics", "Transport", "Delivery", "Express"])} Co.`,
    type: pick(serviceTypes),
    status: pick(["active", "pending", "suspended"]),
    email: `vendor${rand(1, 99)}@fleet.sa`,
    phone: `+966 5${rand(10, 99)} ${rand(100, 999)} ${rand(1000, 9999)}`,
  }));
  await db.insert(vendors).values(vendorData);

  const zoneData = [
    { name: "Riyadh North", status: "active", color: "#3b82f6" },
    { name: "Riyadh South", status: "active", color: "#22c55e" },
    { name: "Jeddah Central", status: "active", color: "#f59e0b" },
    { name: "Dammam Industrial", status: "inactive", color: "#ef4444" },
  ];
  await db.insert(zones).values(zoneData);

  const routeData = Array.from({ length: 8 }, () => ({
    tracking_id: uid("RTE"),
    driver_uuid: pick(insertedDrivers).id,
    vehicle_uuid: pick(insertedVehicles).id,
    status: pick(["draft", "scheduled", "active", "completed"]),
    distance: `${randFloat(10, 150, 1)} km`,
    duration: `${rand(30, 400)} min`,
    stops: rand(3, 15),
  }));
  await db.insert(routes).values(routeData);

  const issueData = Array.from({ length: 12 }, () => ({
    tracking_id: uid("ISS"),
    vehicle_uuid: pick(insertedVehicles).plate_number,
    reported_by: pick(names),
    type: pick(issueTypes),
    priority: pick(statuses.priority),
    status: pick(statuses.issue),
    description: pick(["Engine warning light on", "Flat tire on highway", "Brake squealing", "AC not working", "Battery drainage issue", "Transmission noise"]),
  }));
  await db.insert(issues).values(issueData);

  const fuelData = Array.from({ length: 20 }, () => ({
    tracking_id: uid("FUEL"),
    vehicle_uuid: pick(insertedVehicles).plate_number,
    driver_uuid: pick(insertedDrivers).name,
    volume: randFloat(20, 100, 1),
    cost: `${randFloat(50, 200, 2)}`,
    odometer: rand(10000, 150000),
    station: `${pick(cities)} ${pick(["ESSO", "Aramco", "Shell", "Total"])} Station`,
  }));
  await db.insert(fuel_reports).values(fuelData);

  const deviceData = Array.from({ length: 15 }, () => ({
    serial: `DEV-${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
    type: pick(deviceTypes),
    status: pick(statuses.device),
    battery_level: rand(10, 100),
  }));
  await db.insert(devices).values(deviceData);

  const woData = Array.from({ length: 10 }, () => ({
    tracking_id: uid("WO"),
    vehicle_uuid: pick(insertedVehicles).plate_number,
    type: pick(["repair", "maintenance", "inspection"]),
    status: pick(statuses.workOrder),
    priority: pick(["low", "medium", "high"]),
    cost: `${randFloat(50, 2000, 2)}`,
  }));
  await db.insert(work_orders).values(woData);

  const rateData = Array.from({ length: 10 }, () => ({
    name: `${pick(["Standard", "Express", "Economy", "Premium", "Same Day"])} Delivery`,
    service_type: pick(["parcel", "freight", "express"]),
    base_fee: `${randFloat(5, 50, 2)}`,
    per_km_flat_rate_fee: `${randFloat(0.5, 5, 2)}`,
    currency: "SAR",
  }));
  await db.insert(service_rates).values(rateData);

  const partNames = ["Oil Filter", "Brake Pads", "Air Filter", "Spark Plugs", "Timing Belt", "Radiator Hose", "Fuel Pump", "Alternator Belt", "Wiper Blades", "Coolant", "Transmission Fluid", "Battery Terminal", "Headlight Bulb", "Tire Valve", "Cabin Filter", "Power Steering Fluid", "Wheel Bearing", "Clutch Cable", "Exhaust Gasket", "Thermostat"];
  const partCategories = ["engine", "tires", "fluids", "electronics", "body"];
  const partLocations = ["A", "B", "C", "D", "E"];
  const partsData = partNames.map((name) => ({
    name,
    sku: `PRT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    category: pick(partCategories),
    stock: rand(0, 100),
    min_stock: rand(5, 20),
    cost: `${randFloat(10, 500, 2)}`,
    location: `Shelf ${pick(partLocations)}-${rand(1, 10)}`,
  }));
  await db.insert(parts).values(partsData);

  const cfData = [
    { model: "order", label: "Customer Reference", type: "text", required: false, sort_order: 1 },
    { model: "order", label: "Delivery Priority", type: "select", required: true, sort_order: 2 },
    { model: "driver", label: "License Expiry", type: "date", required: true, sort_order: 1 },
    { model: "vehicle", label: "Insurance Number", type: "text", required: false, sort_order: 1 },
    { model: "vehicle", label: "Last Service Date", type: "date", required: false, sort_order: 2 },
    { model: "place", label: "Operating Hours", type: "text", required: false, sort_order: 1 },
  ];
  await db.insert(custom_fields).values(cfData);

  const adminHash = await bcrypt.hash("admin123", 10);
  const dispatchHash = await bcrypt.hash("dispatch123", 10);
  await db.insert(users).values([
    { username: "admin", password: adminHash, name: "Admin User", email: "admin@fleetops.sa", role: "admin", status: "active" },
    { username: "dispatcher", password: dispatchHash, name: "Dispatcher", email: "dispatch@fleetops.sa", role: "dispatcher", status: "active" },
  ]);

  console.log("Database seeded successfully!");
}
