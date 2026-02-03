/**
 * Quick Fix: Normalize Existing School Names to UPPERCASE
 * 
 * Chuẩn hóa tất cả tên trường hiện có trong bảng schools thành chữ HOA
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Normalizing school names to UPPERCASE...\n');

// Get all schools
db.all('SELECT id, name FROM schools', [], (err, schools) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    if (schools.length === 0) {
        console.log('✅ No schools found');
        db.close();
        return;
    }

    console.log(`Found ${schools.length} school(s):\n`);

    let updated = 0;
    let alreadyUppercase = 0;

    schools.forEach((s, idx) => {
        const original = s.name;
        const uppercase = original.toUpperCase();
        const needsUpdate = original !== uppercase;

        console.log(`${idx + 1}. "${original}" ${needsUpdate ? `→ "${uppercase}" ✏️` : '✅ (already uppercase)'}`);

        if (needsUpdate) {
            db.run('UPDATE schools SET name = ? WHERE id = ?', [uppercase, s.id], (err) => {
                if (err) {
                    console.error(`   ❌ Failed: ${err.message}`);
                } else {
                    console.log(`   ✓ Updated!`);
                    updated++;
                }

                if (idx === schools.length - 1) {
                    finalize();
                }
            });
        } else {
            alreadyUppercase++;
            if (idx === schools.length - 1) {
                finalize();
            }
        }
    });

    function finalize() {
        console.log(`\n${'='.repeat(50)}`);
        if (updated > 0) {
            console.log(`✅ Updated ${updated} school name(s) to UPPERCASE`);
        }
        if (alreadyUppercase > 0) {
            console.log(`✅ ${alreadyUppercase} school(s) already in UPPERCASE`);
        }
        console.log('='.repeat(50));
        db.close();
    }
});
