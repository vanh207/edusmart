const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking database.sqlite for vocabulary...');

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='vocabulary'", [], (err, table) => {
    if (err || !table) {
        console.log('Vocabulary table not found in database.sqlite');
        db.close();
        return;
    }

    db.get("SELECT COUNT(*) as count FROM vocabulary", [], (err, result) => {
        if (err) {
            console.error('Error counting vocabulary:', err);
        } else {
            console.log(`Total rows in vocabulary table (database.sqlite): ${result.count}`);
        }
        db.close();
    });
});
