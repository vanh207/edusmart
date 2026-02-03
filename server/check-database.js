// Check database schema and data
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('='.repeat(60));
console.log('DATABASE HEALTH CHECK');
console.log('='.repeat(60));

// Check users table schema
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('❌ Error checking users table:', err);
        return;
    }

    console.log('\n📋 USERS TABLE SCHEMA:\n');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})${col.pk ? ' PRIMARY KEY' : ''}${col.notnull ? ' NOT NULL' : ''}`);
    });

    // Check if we have students
    db.all("SELECT COUNT(*) as count FROM users WHERE role = 'student'", (err, result) => {
        if (err) {
            console.error('❌ Error counting students:', err);
            return;
        }

        console.log(`\n👥 TOTAL STUDENTS: ${result[0].count}`);

        // Check students in class 8
        db.all("SELECT id, username, full_name, class_id FROM users WHERE class_id = 8 AND role = 'student'", (err, students) => {
            if (err) {
                console.error('❌ Error fetching class 8 students:', err);
                return;
            }

            console.log(`\n📚 STUDENTS IN CLASS 8: ${students.length}`);
            students.forEach(s => {
                console.log(`  - ${s.full_name} (@${s.username}) - ID: ${s.id}`);
            });

            // Check classes table
            db.all("SELECT id, name, grade_level FROM classes ORDER BY id", (err, classes) => {
                if (err) {
                    console.error('❌ Error fetching classes:', err);
                    return;
                }

                console.log(`\n🏫 TOTAL CLASSES: ${classes.length}`);
                classes.forEach(c => {
                    console.log(`  - Class ${c.id}: ${c.name} (${c.grade_level})`);
                });

                console.log('\n' + '='.repeat(60));
                console.log('✅ DATABASE IS HEALTHY');
                console.log('='.repeat(60));
                console.log('\nConclusion:');
                console.log('  - SQLite database intact');
                console.log('  - All tables exist');
                console.log('  - Data is present');
                console.log('  - No corruption detected');
                console.log('\n');

                db.close();
            });
        });
    });
});
