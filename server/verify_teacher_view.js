/**
 * Final Check: Verify Student Data for Teacher View
 * 
 * Kiểm tra xem học sinh có đủ điều kiện hiển thị trong trang giáo viên không
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const CLASS_ID = 8; // Lớp 6A

console.log(`🔍 Checking students for class ID ${CLASS_ID}...\n`);

// 1. Check class info
db.get('SELECT * FROM classes WHERE id = ?', [CLASS_ID], (err, classInfo) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (!classInfo) {
        console.log(`❌ Class ID ${CLASS_ID} not found!`);
        db.close();
        return;
    }

    console.log('=== CLASS INFO ===');
    console.log(`  ID: ${classInfo.id}`);
    console.log(`  Name: ${classInfo.name}`);
    console.log(`  Grade Level: ${classInfo.grade_level}`);
    console.log(`  School ID: ${classInfo.school_id}`);
    console.log(`  Teacher ID: ${classInfo.teacher_id}`);

    // 2. Check students in this class
    console.log('\n=== STUDENTS IN CLASS (API Query) ===');
    db.all(`
    SELECT id, username, full_name, email, grade_level, current_class_id, school_id
    FROM users
    WHERE current_class_id = ? AND role = 'student' AND school_id = ?
    ORDER BY full_name
  `, [CLASS_ID, classInfo.school_id], (err, students) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        if (students.length === 0) {
            console.log('❌ No students found!');
            console.log('\n💡 Checking why...\n');

            // Check students with this class_id but wrong school_id
            db.all(`
        SELECT id, username, full_name, current_class_id, school_id
        FROM users
        WHERE current_class_id = ? AND role = 'student'
      `, [CLASS_ID], (err, allStudents) => {
                if (allStudents && allStudents.length > 0) {
                    console.log('⚠️ Found students with current_class_id = 8 but different school_id:');
                    allStudents.forEach(s => {
                        console.log(`  - ${s.username}: school_id = ${s.school_id} (class requires ${classInfo.school_id})`);
                    });
                } else {
                    console.log('❌ No students have current_class_id = 8 at all!');
                }
                db.close();
            });
        } else {
            console.log(`✅ Found ${students.length} student(s):\n`);
            students.forEach(s => {
                console.log(`  ${s.id}. ${s.username} (${s.full_name})`);
                console.log(`     Email: ${s.email || 'N/A'}`);
                console.log(`     Grade: ${s.grade_level}`);
                console.log(`     Class ID: ${s.current_class_id}`);
                console.log(`     School ID: ${s.school_id}`);
                console.log('');
            });

            console.log('✅ These students SHOULD appear in teacher\'s view!');
            console.log('\n💡 If they don\'t appear:');
            console.log('   1. Restart the server');
            console.log('   2. Hard refresh browser (Ctrl + Shift + R)');
            console.log('   3. Check browser console for errors');

            db.close();
        }
    });
});
