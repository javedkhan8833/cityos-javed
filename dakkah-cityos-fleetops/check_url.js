const { Client } = require('pg');

async function checkServers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, name, url, api_key, is_active FROM fleetbase_servers');
        console.log("Configured Fleetbase Servers:");
        console.table(res.rows);
    } catch (err) {
        console.error('Error connecting to database:', err);
    } finally {
        await client.end();
    }
}

checkServers();
