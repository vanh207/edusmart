const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Listing all tables in database...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Error listing tables:', err);
        process.exit(1);
    }
    console.log('Tables:', tables.map(t => t.name).join(', '));

    db.get("SELECT COUNT(*) as count FROM vocabulary", [], (err, result) => {
        if (err) {
            console.error('Error counting vocabulary:', err);
        } else {
            console.log(`Total rows in vocabulary table: ${result.count}`);
        }

        db.all("SELECT * FROM vocabulary LIMIT 5", [], (err, rows) => {
            if (rows && rows.length > 0) {
                console.log('\nSample rows from vocabulary:');
                rows.forEach(row => console.log(JSON.stringify(row)));
            } else {
                console.log('\nVocabulary table is empty.');
            }
            db.close();
        });
    });
});
