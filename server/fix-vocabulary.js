const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('--- FIXING VOCABULARY DATA CORRUPTION ---');

db.serialize(() => {
    // 1. Identify corrupted rows
    db.all("SELECT id, word, type FROM vocabulary WHERE type LIKE '%object%'", [], (err, rows) => {
        if (err) {
            console.error('Error fetching corrupted rows:', err.message);
            return;
        }

        console.log(`Found ${rows.length} corrupted rows.`);

        if (rows.length > 0) {
            // 2. Fix corrupted rows
            // We set them to 'speaking' by default as per the system's intended behavior for missing/invalid types
            db.run("UPDATE vocabulary SET type = 'speaking' WHERE type LIKE '%object%'", function (err) {
                if (err) {
                    console.error('Error updating corrupted rows:', err.message);
                } else {
                    console.log(`Successfully fixed ${this.changes} rows.`);
                }
            });
        }
    });

    // 3. Ensure all types are valid
    db.run("UPDATE vocabulary SET type = 'speaking' WHERE type NOT IN ('speaking', 'writing', 'reading') OR type IS NULL OR type = ''", function (err) {
        if (err) {
            console.error('Error normalizing types:', err.message);
        } else {
            console.log(`Normalized ${this.changes} additional rows.`);
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
});
