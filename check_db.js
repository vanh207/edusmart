const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking vocabulary table for speaking words...');

db.all("SELECT id, word, type, school_id, grade_level, subject FROM vocabulary WHERE type = 'speaking'", [], (err, rows) => {
    if (err) {
        console.error('Error querying vocabulary:', err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} speaking words.`);
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Word: ${row.word}, Type: ${row.type}, School: ${row.school_id}, Grade: ${row.grade_level}, Subject: ${row.subject}`);
    });

    db.all("SELECT id, word, type, school_id FROM vocabulary WHERE word LIKE '%test%'", [], (err, rows) => {
        console.log('\nChecking for words with "test" in them:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Word: ${row.word}, Type: ${row.type}, School: ${row.school_id}`);
        });
        db.close();
    });
});
