/**
 * Check Script: Find Admin/Teacher Accounts
 * 
 * Tìm tài khoản admin/teacher cho từng trường
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Finding admin/teacher accounts...\n');

// Get all schools
db.all('SELECT DISTINCT school_id FROM users WHERE school_id IS NOT NULL ORDER BY school_id', [], (err, schools) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log(`Found ${schools.length} school(s)\n`);

    let processed = 0;
    schools.forEach(school => {
        const schoolId = school.school_id;

        // Get school name
        db.get('SELECT name FROM classes WHERE school_id = ? LIMIT 1', [schoolId], (err, classInfo) => {
            const schoolName = classInfo ? `(from class data)` : 'Unknown';

            console.log(`=== SCHOOL ID: ${schoolId} ===`);

            // Get admins
            db.all(`
        SELECT id, username, full_name, role, email
        FROM users
        WHERE school_id = ? AND (role = 'admin' OR role = 'teacher')
        ORDER BY role, username
      `, [schoolId], (err, users) => {
                if (err) {
                    console.error('Error:', err);
                } else if (users.length === 0) {
                    console.log('  ❌ No admin/teacher found for this school!');
                } else {
                    users.forEach(u => {
                        console.log(`  ${u.role.toUpperCase()}: ${u.username} (${u.full_name || 'N/A'})`);
                        if (u.email) console.log(`    Email: ${u.email}`);
                    });
                }

                // Get student count
                db.get('SELECT COUNT(*) as count FROM users WHERE school_id = ? AND role = "student"', [schoolId], (err, result) => {
                    if (result) {
                        console.log(`  Students: ${result.count}`);
                    }
                    console.log('');

                    processed++;
                    if (processed === schools.length) {
                        db.close();
                    }
                });
            });
        });
    });
});
