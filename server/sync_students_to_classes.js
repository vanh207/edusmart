/**
 * Migration Script: Sync Students to Classes
 * 
 * Tự động gán học sinh vào lớp học dựa trên:
 * - school_id (trường học)
 * - grade_level (khối lớp)
 * - class_name (tên lớp)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting student-to-class synchronization...\n');

db.all(`
  SELECT 
    u.id as user_id, 
    u.username,
    u.class_name,
    u.grade_level,
    u.school_id,
    c.id as class_id,
    c.name as actual_class_name
  FROM users u
  INNER JOIN classes c ON 
    u.school_id = c.school_id AND
    u.grade_level = c.grade_level AND
    u.class_name = c.name
  WHERE u.role = 'student' 
    AND (u.current_class_id IS NULL OR u.current_class_id != c.id)
`, [], (err, matches) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }

    if (matches.length === 0) {
        console.log('✅ No students need synchronization. All students are already assigned to their classes.');
        db.close();
        return;
    }

    console.log(`📊 Found ${matches.length} student(s) to sync:\n`);

    matches.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.username} (${m.class_name}) → Class ID: ${m.class_id}`);
    });

    console.log('\n🔧 Updating database...\n');

    const stmt = db.prepare('UPDATE users SET current_class_id = ? WHERE id = ?');
    let successCount = 0;
    let errorCount = 0;

    matches.forEach((m, idx) => {
        stmt.run(m.class_id, m.user_id, (err) => {
            if (err) {
                console.error(`❌ Failed: ${m.username} - ${err.message}`);
                errorCount++;
            } else {
                console.log(`✓ ${m.username} → ${m.class_name} (Class ID: ${m.class_id})`);
                successCount++;
            }

            // Check if this is the last item
            if (idx === matches.length - 1) {
                stmt.finalize(() => {
                    console.log('\n' + '='.repeat(50));
                    console.log(`✅ Sync completed!`);
                    console.log(`   Success: ${successCount}`);
                    console.log(`   Errors: ${errorCount}`);
                    console.log('='.repeat(50));
                    db.close();
                });
            }
        });
    });
});
