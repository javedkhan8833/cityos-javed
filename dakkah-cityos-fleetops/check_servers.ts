import { db } from "./server/db";
import { fleetbase_servers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const servers = await db.select().from(fleetbase_servers);
  console.log(JSON.stringify(servers, null, 2));

  // If the active server has the wrong key, let's update it!
  const wrongKey = 'flb_live_uE2GYXFAD07Hv0Gx7hBf';
  const rightKey = 'flb_live_2hYe5d9YsAMZFbJykakI';
  
  for (const server of servers) {
    if (server.api_key === wrongKey || server.api_key !== rightKey) {
        console.log(`Updating server ${server.id} to use new key!`);
        await db.update(fleetbase_servers).set({ api_key: rightKey }).where(eq(fleetbase_servers.id, server.id));
    }
  }
  
  console.log("Done checking servers.");
  process.exit(0);
}

run();
