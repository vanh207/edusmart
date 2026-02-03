const sqlite3 = require('c:/Users/DO VIET ANH/OneDrive/Máy tính/project/server/node_modules/sqlite3').verbose();
const path = require('path');
const dbPath = 'c:/Users/DO VIET ANH/OneDrive/Máy tính/project/server/database.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('--- Starting Student Assignment Fix ---');

    // 1. Fix student @minh (ID 385)
    // He belongs to School 3 (THCS NINH LAI) and should be in Class 8 (6A for School 3)
    // Currently he has class_id = 10 (which is 6A for School 2)
    db.run(
        "UPDATE users SET class_id = 8, current_class_id = 8, class_name = '6A' WHERE id = 385",
        function (err) {
            if (err) console.error('Error updating @minh:', err);
            else console.log(`Updated @minh (ID 385): ${this.changes} rows changed.`);
        }
    );

    // 2. Fix student @student (ID 2) - General cleanup
    // Assigning to School 1 and Class 9 (7A) as a placeholder if active
    db.run(
        "UPDATE users SET school_id = 1, school = 'THPT SƠN NAM', class_id = 9, current_class_id = 9, class_name = '7A' WHERE id = 2 AND school_id IS NULL",
        function (err) {
            if (err) console.error('Error updating @student:', err);
            else console.log(`Updated @student (ID 2): ${this.changes} rows changed.`);
        }
    );

    // 3. Automated check for school-class mismatch
    console.log('\nChecking for school-class mismatch...');
    db.all(`
        SELECT u.id, u.username, u.school_id as user_school, c.school_id as class_school, c.name as class_name, c.id as class_id
        FROM users u
        JOIN classes c ON u.class_id = c.id
        WHERE u.school_id != c.school_id
    `, (err, rows) => {
        if (err) {
            console.error('Error during mismatch check:', err);
        } else if (rows.length > 0) {
            console.log(`Found ${rows.length} mismatches:`);
            rows.forEach(row => {
                console.log(`Student @${row.username} (School ${row.user_school}) is in Class ${row.class_name} (School ${row.class_school})`);

                // Try to find the correct class ID for this student's school
                db.get("SELECT id FROM classes WHERE name = ? AND school_id = ?", [row.class_name, row.user_school], (err, correctClass) => {
                    if (correctClass) {
                        console.log(`  -> Fixing: Moving to correct class ID ${correctClass.id}`);
                        db.run("UPDATE users SET class_id = ?, current_class_id = ? WHERE id = ?", [correctClass.id, correctClass.id, row.id]);
                    } else {
                        console.log(`  -> Warning: No class named "${row.class_name}" found in School ${row.user_school}`);
                    }
                });
            });
        } else {
            console.log('No mismatches found.');
        }
    });

    // 4. Verification Query
    setTimeout(() => {
        console.log('\n--- Final Verification ---');
        db.all(`
            SELECT u.username, u.full_name, u.school_id, u.class_id, u.class_name
            FROM users u
            WHERE u.role = 'student'
        `, (err, rows) => {
            if (err) console.error(err);
            else console.table(rows);
            db.close();
        });
    }, 2000);
});
