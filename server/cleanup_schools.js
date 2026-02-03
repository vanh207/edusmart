const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('DELETE FROM schools', (err) => {
        if (err) {
            console.error('Error deleting schools:', err.message);
        } else {
            console.log('All schools deleted successfully.');
        }
    });

    db.run('UPDATE users SET school_id = NULL, school = NULL', (err) => {
        if (err) {
            console.error('Error clearing users school references:', err.message);
        } else {
            console.log('All users school references cleared.');
        }
    });

    db.close();
});
