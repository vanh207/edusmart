const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const addColumn = (table, column, type) => {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) return reject(err);
            const exists = rows.some(r => r.name === column);
            if (!exists) {
                console.log(`Adding column ${column} to ${table}...`);
                db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`Column ${column} added.`);
                        resolve();
                    }
                });
            } else {
                console.log(`Column ${column} already exists in ${table}.`);
                resolve();
            }
        });
    });
};

async function run() {
    try {
        await addColumn('users', 'current_class_id', 'INTEGER');

        console.log('Syncing current_class_id with class_id...');
        db.run("UPDATE users SET current_class_id = class_id WHERE current_class_id IS NULL AND class_id IS NOT NULL", (err) => {
            if (err) console.error('Sync failed:', err);
            else console.log('Sync completed.');

            db.close();
        });
    } catch (err) {
        console.error('Migration failed:', err);
        db.close();
    }
}

run();
