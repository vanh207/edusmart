// Comprehensive debug script for students endpoint
const sqlite3 = require('sqlite3').verbose();
const http = require('http');

console.log('='.repeat(60));
console.log('🔍 DEBUGGING STUDENTS ENDPOINT');
console.log('='.repeat(60));

// Step 1: Check database directly
console.log('\n📊 STEP 1: Checking database...\n');

const db = new sqlite3.Database('./database.db');

db.all('SELECT id, name, grade_level FROM classes ORDER BY id', (err, classes) => {
    if (err) {
        console.error('❌ Error fetching classes:', err);
        return;
    }

    console.log(`Found ${classes.length} classes:`);
    classes.forEach(c => {
        console.log(`  - Class ${c.id}: ${c.name} (${c.grade_level})`);
    });

    // Check students for each class
    console.log('\n📚 Checking students in each class:\n');

    classes.forEach(classItem => {
        db.all(
            `SELECT id, username, full_name, role, class_id 
       FROM users 
       WHERE class_id = ? AND role = 'student'`,
            [classItem.id],
            (err, students) => {
                if (err) {
                    console.error(`❌ Error fetching students for class ${classItem.id}:`, err);
                    return;
                }

                console.log(`Class ${classItem.id} (${classItem.name}):`);
                if (students.length === 0) {
                    console.log('  ⚠️  No students found');
                } else {
                    students.forEach(s => {
                        console.log(`  ✓ ${s.full_name} (@${s.username}) - ID: ${s.id}`);
                    });
                }
            }
        );
    });

    // Wait a bit then test API
    setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        console.log('🌐 STEP 2: Testing API endpoint...\n');

        // Test with class ID 8 (change if needed)
        const testClassId = 8;

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api/classes/${testClassId}/students`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        console.log(`Testing: http://localhost:5000/api/classes/${testClassId}/students\n`);

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`Status Code: ${res.statusCode}`);
                console.log(`Headers:`, res.headers);
                console.log('\nResponse Body:');

                try {
                    const json = JSON.parse(data);
                    console.log(JSON.stringify(json, null, 2));

                    if (res.statusCode === 200) {
                        if (json.students && Array.isArray(json.students)) {
                            console.log(`\n✅ SUCCESS! Found ${json.students.length} students`);
                            json.students.forEach((s, i) => {
                                console.log(`  ${i + 1}. ${s.full_name} (@${s.username})`);
                            });
                        } else {
                            console.log('\n❌ PROBLEM: Response does not have "students" array');
                            console.log('Expected format: { students: [...] }');
                        }
                    } else {
                        console.log(`\n❌ PROBLEM: HTTP ${res.statusCode}`);
                        if (res.statusCode === 401) {
                            console.log('Authentication required - endpoint still blocked by middleware');
                        } else if (res.statusCode === 404) {
                            console.log('Endpoint not found - check if server restarted');
                        }
                    }
                } catch (e) {
                    console.log('Raw response:', data);
                    console.log('\n❌ PROBLEM: Response is not valid JSON');
                }

                console.log('\n' + '='.repeat(60));
                console.log('🎯 SUMMARY & NEXT STEPS');
                console.log('='.repeat(60));
                console.log('\nIf you see:');
                console.log('  ✅ Status 200 + students array → Frontend issue');
                console.log('  ❌ Status 401 → Middleware still blocking');
                console.log('  ❌ Status 404 → Server not restarted or endpoint missing');
                console.log('  ❌ No students in DB → Need to add students to class');
                console.log('\n');

                db.close();
            });
        });

        req.on('error', (error) => {
            console.error('❌ CONNECTION ERROR:', error.message);
            console.log('\nPossible causes:');
            console.log('  1. Server is not running (start with: node index.js)');
            console.log('  2. Server is on different port');
            console.log('  3. Firewall blocking connection');
            console.log('\n');
            db.close();
        });

        req.end();
    }, 1000);
});
