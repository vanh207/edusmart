/**
 * Normalize Script: Convert All School Names to UPPERCASE
 * 
 * Chuẩn hóa tất cả tên trường trong database thành chữ HOA
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Converting all school names to UPPERCASE...\n');

// Get all unique school names from users table
db.all(`
  SELECT DISTINCT 
    CASE 
      WHEN school_name IS NOT NULL THEN school_name
      ELSE 'UNKNOWN'
    END as school_name
  FROM users 
  WHERE school_name IS NOT NULL
`, [], (err, schools) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    if (schools.length === 0) {
        console.log('✅ No school names found in users table (column may not exist)');
        console.log('\n💡 School names are likely managed through school_id references to classes table');
        db.close();
        return;
    }

    console.log(`Found ${schools.length} unique school name(s):\n`);

    schools.forEach((s, idx) => {
        const original = s.school_name;
        const uppercase = original.toUpperCase();
        const needsUpdate = original !== uppercase;

        console.log(`${idx + 1}. "${original}" ${needsUpdate ? `→ "${uppercase}" ✏️` : '✅'}`);
    });

    console.log('\n🔧 Updating...\n');

    let updated = 0;
    schools.forEach((s, idx) => {
        const original = s.school_name;
        const uppercase = original.toUpperCase();

        if (original !== uppercase) {
            db.run('UPDATE users SET school_name = ? WHERE school_name = ?', [uppercase, original], (err) => {
                if (err) {
                    console.error(`❌ Failed to update "${original}":`, err.message);
                } else {
                    console.log(`✓ Updated "${original}" → "${uppercase}"`);
                    updated++;
                }

                if (idx === schools.length - 1) {
                    console.log(`\n${'='.repeat(50)}`);
                    console.log(`✅ Completed! Updated ${updated} school name(s)`);
                    console.log('='.repeat(50));
                    db.close();
                }
            });
        } else {
            if (idx === schools.length - 1) {
                console.log(`\n${'='.repeat(50)}`);
                console.log(`✅ All school names are already in UPPERCASE!`);
                console.log('='.repeat(50));
                db.close();
            }
        }
    });
});
