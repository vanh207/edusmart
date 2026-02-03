/**
 * Debug Script: List All Students
 * 
 * Liệt kê tất cả học sinh trong database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Listing all students in database...\n');

db.all(`
  SELECT 
    id, 
    username, 
    full_name, 
    class_name, 
    current_class_id, 
    school_id, 
    grade_level,
    role
  FROM users 
  WHERE role = 'student'
  ORDER BY school_id, grade_level, class_name
`, [], (err, students) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    if (students.length === 0) {
        console.log('❌ No students found in database!');
        console.log('\n💡 You need to register students first.');
        db.close();
        return;
    }

    console.log(`✅ Found ${students.length} student(s):\n`);
    console.log('='.repeat(90));
    console.log('ID | Username | Full Name | Class | Class ID | School ID | Grade');
    console.log('='.repeat(90));

    students.forEach(s => {
        console.log(
            `${s.id.toString().padEnd(3)} | ` +
            `${(s.username || 'N/A').padEnd(10)} | ` +
            `${(s.full_name || 'N/A').padEnd(20)} | ` +
            `${(s.class_name || 'N/A').padEnd(6)} | ` +
            `${(s.current_class_id ? s.current_class_id.toString() : 'NULL').padEnd(8)} | ` +
            `${(s.school_id ? s.school_id.toString() : 'NULL').padEnd(9)} | ` +
            `${s.grade_level || 'N/A'}`
        );
    });

    console.log('='.repeat(90));

    // Also list all classes
    console.log('\n=== ALL CLASSES ===\n');
    db.all(`
    SELECT 
      id, 
      name, 
      grade_level, 
      school_id,
      teacher_id
    FROM classes 
    ORDER BY school_id, grade_level, name
  `, [], (err, classes) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        if (classes.length === 0) {
            console.log('❌ No classes found!');
        } else {
            console.log(`✅ Found ${classes.length} class(es):\n`);
            console.log('ID | Name | Grade Level | School ID | Teacher ID');
            console.log('-'.repeat(60));
            classes.forEach(c => {
                console.log(
                    `${c.id.toString().padEnd(3)} | ` +
                    `${(c.name || 'N/A').padEnd(5)} | ` +
                    `${(c.grade_level || 'N/A').padEnd(12)} | ` +
                    `${(c.school_id ? c.school_id.toString() : 'NULL').padEnd(9)} | ` +
                    `${c.teacher_id ? c.teacher_id.toString() : 'NULL'}`
                );
            });
        }

        db.close();
    });
});
