/**
 * Check Script: Find School Name Fields
 * 
 * Tìm xem tên trường được lưu ở đâu trong database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking for school name fields...\n');

// Check if schools table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schools'", [], (err, table) => {
    if (table) {
        console.log('✅ SCHOOLS table exists!\n');

        // Get structure
        db.all("PRAGMA table_info(schools)", [], (err, columns) => {
            console.log('=== SCHOOLS TABLE STRUCTURE ===');
            columns.forEach(col => {
                console.log(`  ${col.name.padEnd(20)} ${col.type}`);
            });

            // Get sample data
            db.all("SELECT * FROM schools LIMIT 5", [], (err, schools) => {
                if (schools && schools.length > 0) {
                    console.log('\n=== SAMPLE SCHOOLS ===');
                    schools.forEach(s => {
                        console.log(`  ID ${s.id}: ${s.name || 'N/A'}`);
                    });
                } else {
                    console.log('\n  No schools found yet.');
                }

                checkClassesTable();
            });
        });
    } else {
        console.log('❌ SCHOOLS table does NOT exist');
        console.log('   School names are likely embedded in class names or managed differently\n');
        checkClassesTable();
    }
});

function checkClassesTable() {
    console.log('\n=== CLASSES TABLE ===');
    db.all("SELECT id, name, grade_level, school_id FROM classes LIMIT 5", [], (err, classes) => {
        if (classes && classes.length > 0) {
            classes.forEach(c => {
                console.log(`  Class ID ${c.id}: "${c.name}" (Grade: ${c.grade_level}, School: ${c.school_id})`);
            });
        }

        console.log('\n💡 Recommendation:');
        console.log('   If you want to normalize school names, they are likely:');
        console.log('   1. In the SCHOOLS table (if it exists)');
        console.log('   2. Or managed through school_id references');
        console.log('   3. Class names (like "6A", "7B") can also be normalized');

        db.close();
    });
}
