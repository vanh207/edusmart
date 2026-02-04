const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking users table for class assignment data...');

db.all("SELECT id, username, role, school_id, class_name, class_id, current_class_id, school FROM users WHERE role = 'student' LIMIT 20", [], (err, rows) => {
    if (err) {
        console.error('Error querying users:', err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} students.`);
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Username: ${row.username}, SchoolID: ${row.school_id}, SchoolName: ${row.school}, ClassName: ${row.class_name}, ClassID: ${row.class_id}, CurrentClassID: ${row.current_class_id}`);
    });

    db.all("SELECT id, name, school_id FROM classes LIMIT 20", [], (err, classes) => {
        console.log('\nExisting Classes:');
        classes.forEach(cls => {
            console.log(`ID: ${cls.id}, Name: ${cls.name}, SchoolID: ${cls.school_id}`);
        });
        db.close();
    });
});
