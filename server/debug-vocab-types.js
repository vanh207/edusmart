const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT type, count(*) as count FROM vocabulary GROUP BY type", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Vocabulary Types:");
    rows.forEach(row => {
        console.log(`- ${row.type}: ${row.count}`);
    });
    db.close();
});
