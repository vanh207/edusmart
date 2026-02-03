// Quick test script - runs batch auto-assign directly on database
// No token needed!
// Usage: node quick-batch-assign.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔄 Running batch auto-assign for all students...\n');

// Get all students with class_name
db.all(
    `SELECT id, username, class_name, school_id, grade_level 
   FROM users 
   WHERE role = 'student' AND class_name IS NOT NULL`,
    (err, students) => {
        if (err) {
            console.error('❌ Error fetching students:', err);
            db.close();
            return;
        }

        console.log(`📊 Found ${students.length} students with class_name\n`);

        if (students.length === 0) {
            console.log('No students to assign.');
            db.close();
            return;
        }

        let assigned = 0;
        let notFound = 0;
        let processed = 0;

        students.forEach(student => {
            // Find matching class
            db.get(
                `SELECT id, name FROM classes 
         WHERE name = ? AND school_id = ? AND grade_level = ?
         LIMIT 1`,
                [student.class_name, student.school_id, student.grade_level],
                (err, targetClass) => {
                    processed++;

                    if (err) {
                        console.error(`❌ Error for ${student.username}:`, err);
                    } else if (targetClass) {
                        // Assign to class
                        db.run(
                            'UPDATE users SET class_id = ? WHERE id = ?',
                            [targetClass.id, student.id],
                            (err) => {
                                if (!err) {
                                    assigned++;
                                    console.log(`✓ ${student.username} → class ${targetClass.id} (${targetClass.name})`);
                                } else {
                                    console.error(`❌ Failed to assign ${student.username}:`, err);
                                }
                            }
                        );
                    } else {
                        notFound++;
                        console.log(`⚠️  ${student.username}: No class found for "${student.class_name}" (school: ${student.school_id}, grade: ${student.grade_level})`);
                    }

                    // Print summary when all processed
                    if (processed === students.length) {
                        setTimeout(() => {
                            console.log('\n' + '='.repeat(50));
                            console.log('📊 Summary:');
                            console.log(`   Total students: ${students.length}`);
                            console.log(`   ✓ Assigned: ${assigned}`);
                            console.log(`   ⚠ Not found: ${notFound}`);
                            console.log('='.repeat(50));

                            if (notFound > 0) {
                                console.log('\n💡 Students not found might have:');
                                console.log('   - Typo in class_name');
                                console.log('   - Wrong grade_level format');
                                console.log('   - Class not created yet');
                            }

                            db.close();
                        }, 1000);
                    }
                }
            );
        });
    }
);
