const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking activity_logs for vocabulary actions...');

db.all("SELECT * FROM activity_logs WHERE action LIKE '%vocabulary%' OR action LIKE '%từ vựng%' ORDER BY created_at DESC LIMIT 20", [], (err, rows) => {
    if (err) {
        console.error('Error querying activity_logs:', err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} relevant logs.`);
    rows.forEach(row => {
        console.log(`[${row.created_at}] User: ${row.username}, Action: ${row.action}, Details: ${row.details}`);
    });
    db.close();
});
