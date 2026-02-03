/**
 * Fix Script: Connect Students to Schools
 * 
 * Tự động gán school_id cho học sinh dựa trên lớp học của họ
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Connecting students to their schools...\n');

// Find students with class but no school_id
db.all(`
  SELECT 
    u.id as user_id,
    u.username,
    u.full_name,
    u.current_class_id,
    c.name as class_name,
    c.school_id
  FROM users u
  INNER JOIN classes c ON u.current_class_id = c.id
  WHERE u.role = 'student' 
    AND (u.school_id IS NULL OR u.school_id != c.school_id)
`, [], (err, students) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    if (students.length === 0) {
        console.log('✅ All students are already connected to their schools!');
        db.close();
        return;
    }

    console.log(`📊 Found ${students.length} student(s) to connect:\n`);

    students.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.username} (${s.full_name})`);
        console.log(`   Class: ${s.class_name} → School ID: ${s.school_id}`);
    });

    console.log('\n🔧 Updating...\n');

    const stmt = db.prepare('UPDATE users SET school_id = ? WHERE id = ?');
    let successCount = 0;
    let errorCount = 0;

    students.forEach((s, idx) => {
        stmt.run(s.school_id, s.user_id, (err) => {
            if (err) {
                console.error(`❌ Failed: ${s.username} - ${err.message}`);
                errorCount++;
            } else {
                console.log(`✓ ${s.username} → School ID ${s.school_id}`);
                successCount++;
            }

            // Check if this is the last item
            if (idx === students.length - 1) {
                stmt.finalize(() => {
                    console.log('\n' + '='.repeat(50));
                    console.log(`✅ Connection completed!`);
                    console.log(`   Success: ${successCount}`);
                    console.log(`   Errors: ${errorCount}`);
                    console.log('='.repeat(50));

                    // Verify
                    console.log('\n🔍 Verifying connections...\n');
                    db.all(`
            SELECT 
              u.username,
              u.school_id,
              s.name as school_name
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.id IN (${students.map(st => st.user_id).join(',')})
          `, [], (err, verified) => {
                        if (verified) {
                            verified.forEach(v => {
                                console.log(`✓ ${v.username}: School ID ${v.school_id} (${v.school_name || 'N/A'})`);
                            });
                        }
                        db.close();
                    });
                });
            }
        });
    });
});
