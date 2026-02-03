/**
 * Normalize Script: Uppercase All Class Names
 * 
 * Chuẩn hóa tất cả tên lớp trong database thành chữ HOA
 * Ví dụ: "6a" → "6A", "7b" → "7B"
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Normalizing class names to UPPERCASE...\n');

// Get all classes
db.all('SELECT id, name, grade_level, school_id FROM classes', [], (err, classes) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    if (classes.length === 0) {
        console.log('✅ No classes found');
        db.close();
        return;
    }

    console.log(`Found ${classes.length} class(es):\n`);

    let updated = 0;
    let alreadyUppercase = 0;
    let processed = 0;

    classes.forEach((c, idx) => {
        const original = c.name;
        const uppercase = original.toUpperCase();
        const needsUpdate = original !== uppercase;

        console.log(`${idx + 1}. "${original}" (Grade: ${c.grade_level}, School: ${c.school_id}) ${needsUpdate ? `→ "${uppercase}" ✏️` : '✅'}`);

        if (needsUpdate) {
            db.run('UPDATE classes SET name = ? WHERE id = ?', [uppercase, c.id], (err) => {
                if (err) {
                    console.error(`   ❌ Failed: ${err.message}`);
                } else {
                    console.log(`   ✓ Updated!`);
                    updated++;
                }

                processed++;
                if (processed === classes.length) {
                    finalize();
                }
            });
        } else {
            alreadyUppercase++;
            processed++;
            if (processed === classes.length) {
                finalize();
            }
        }
    });

    function finalize() {
        console.log(`\n${'='.repeat(50)}`);
        if (updated > 0) {
            console.log(`✅ Updated ${updated} class name(s) to UPPERCASE`);
        }
        if (alreadyUppercase > 0) {
            console.log(`✅ ${alreadyUppercase} class(es) already in UPPERCASE`);
        }
        console.log('='.repeat(50));

        // Also update class_name in users table
        console.log('\n🔧 Updating class_name in users table...\n');

        db.all('SELECT id, username, class_name FROM users WHERE class_name IS NOT NULL', [], (err, users) => {
            if (err || !users || users.length === 0) {
                console.log('✅ No users with class_name to update');
                db.close();
                return;
            }

            let userUpdated = 0;
            let userProcessed = 0;

            users.forEach(u => {
                const original = u.class_name;
                const uppercase = original.toUpperCase();

                if (original !== uppercase) {
                    db.run('UPDATE users SET class_name = ? WHERE id = ?', [uppercase, u.id], (err) => {
                        if (!err) {
                            console.log(`✓ ${u.username}: "${original}" → "${uppercase}"`);
                            userUpdated++;
                        }

                        userProcessed++;
                        if (userProcessed === users.length) {
                            console.log(`\n✅ Updated ${userUpdated} user(s)`);
                            db.close();
                        }
                    });
                } else {
                    userProcessed++;
                    if (userProcessed === users.length) {
                        console.log(`\n✅ All users already have uppercase class_name`);
                        db.close();
                    }
                }
            });
        });
    }
});
