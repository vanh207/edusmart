const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('=== SIMULATING STUDENT GRADES API CALL ===\n');

const studentUsername = process.argv[2] || 'hien';

// Get student
db.get('SELECT id, username, school_id, class_id FROM users WHERE username = ? AND role = "student"', [studentUsername], (err, student) => {
    if (err || !student) {
        console.error('Student not found');
        db.close();
        return;
    }

    console.log(`Simulating API call for student @${studentUsername} (ID: ${student.id})\n`);

    // Simulate the exact query from backend endpoint
    const semester = null; // No filter
    const year = null; // No filter
    const subject = null; // No filter
    const school_id = student.school_id;
    const targetStudentId = student.id;

    let query = `
    SELECT g.*, u.full_name as student_name
    FROM grades g
    JOIN users u ON g.student_id = u.id
    WHERE g.student_id = ?
  `;
    const params = [targetStudentId];

    if (school_id) {
        query += ' AND g.school_id = ?';
        params.push(school_id);
    }

    if (semester) {
        query += ' AND g.semester = ?';
        params.push(parseInt(semester));
    }

    if (year) {
        query += ' AND g.year = ?';
        params.push(year);
    }

    if (subject && subject !== 'all') {
        query += ' AND g.subject = ?';
        params.push(subject);
    }

    query += ' ORDER BY g.subject, g.semester, g.grade_type';

    console.log('📋 SQL Query:');
    console.log(query);
    console.log('\n📋 Params:', params);
    console.log('');

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
            db.close();
            return;
        }

        console.log(`✅ API would return ${rows.length} grade(s):\n`);
        if (rows.length > 0) {
            console.table(rows);
            console.log('\n💡 Student SHOULD see these grades in frontend!');
            console.log('💡 If student does NOT see grades, check:');
            console.log('   1. Browser console for errors (F12)');
            console.log('   2. Network tab - check if API call succeeds');
            console.log('   3. Frontend rendering logic');
        } else {
            console.log('❌ No grades found - this is why student sees empty page');
            console.log('💡 Teacher needs to input grades for this student');
        }
        db.close();
    });
});
