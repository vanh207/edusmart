/**
 * Complete Solution: Auto-Uppercase School Name
 * 
 * Giải pháp hoàn chỉnh để tự động chuyển tên trường thành HOA
 * khi học sinh đăng ký, đảm bảo so sánh chính xác với bảng schools
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// ============================================
// HELPER FUNCTION
// ============================================

/**
 * Tìm school_id dựa trên tên trường (không phân biệt hoa/thường)
 */
function findSchoolIdByName(schoolName, callback) {
    if (!schoolName || typeof schoolName !== 'string') {
        return callback(null, null);
    }

    // Normalize: Trim và uppercase
    const normalizedName = schoolName.trim().toUpperCase();

    if (!normalizedName) {
        return callback(null, null);
    }

    // Tìm trong bảng schools (so sánh uppercase)
    db.get(
        'SELECT id, name FROM schools WHERE UPPER(TRIM(name)) = ?',
        [normalizedName],
        (err, school) => {
            if (err) {
                console.error('Error finding school by name:', err);
                return callback(err, null);
            }

            if (school) {
                console.log(`  ✓ Found school: "${school.name}" (ID: ${school.id})`);
                return callback(null, school.id);
            } else {
                console.log(`  ⚠️ School not found: "${schoolName}" → school_id = NULL`);
                return callback(null, null);
            }
        }
    );
}

// ============================================
// DEMO: Đăng ký học sinh với tên trường
// ============================================

function registerStudent(studentData) {
    const { username, full_name, email, grade_level, class_name, school_name } = studentData;

    console.log(`\n📝 Registering student: ${username}`);
    console.log(`   Input school_name: "${school_name}"`);

    // ✅ BƯỚC 1: Normalize tên trường thành HOA
    const normalizedSchoolName = school_name ? school_name.trim().toUpperCase() : null;
    const normalizedClassName = class_name ? class_name.trim().toUpperCase() : null;

    console.log(`   Normalized school_name: "${normalizedSchoolName}"`);
    console.log(`   Normalized class_name: "${normalizedClassName}"`);

    // ✅ BƯỚC 2: Tìm school_id
    findSchoolIdByName(normalizedSchoolName, (err, school_id) => {
        if (err) {
            console.error('   ❌ Error:', err);
            return;
        }

        console.log(`   → school_id: ${school_id || 'NULL'}`);

        // ✅ BƯỚC 3: Insert vào database (demo - không thực sự insert)
        console.log('\n   📊 Would insert into database:');
        console.log(`      username: ${username}`);
        console.log(`      full_name: ${full_name}`);
        console.log(`      email: ${email}`);
        console.log(`      grade_level: ${grade_level}`);
        console.log(`      class_name: ${normalizedClassName} (UPPERCASE)`);
        console.log(`      school_id: ${school_id || 'NULL'}`);
        console.log(`      role: student`);

        if (school_id) {
            console.log(`   ✅ Student will be linked to school ID ${school_id}`);
        } else {
            console.log(`   ⚠️ Student will have school_id = NULL (school not found)`);
        }
    });
}

// ============================================
// TEST CASES
// ============================================

console.log('🧪 Testing student registration with school name normalization...\n');
console.log('='.repeat(70));

// Test 1: Tên trường viết hoa (khớp)
registerStudent({
    username: 'test1',
    full_name: 'Test Student 1',
    email: 'test1@example.com',
    grade_level: 'thcs_6',
    class_name: '6a',
    school_name: 'THCS NINH LAI'
});

setTimeout(() => {
    console.log('\n' + '='.repeat(70));

    // Test 2: Tên trường viết thường (khớp)
    registerStudent({
        username: 'test2',
        full_name: 'Test Student 2',
        email: 'test2@example.com',
        grade_level: 'thcs_6',
        class_name: '6b',
        school_name: 'thcs ninh lai'
    });
}, 100);

setTimeout(() => {
    console.log('\n' + '='.repeat(70));

    // Test 3: Tên trường không tồn tại
    registerStudent({
        username: 'test3',
        full_name: 'Test Student 3',
        email: 'test3@example.com',
        grade_level: 'thcs_7',
        class_name: '7a',
        school_name: 'THCS XYZ'
    });
}, 200);

setTimeout(() => {
    console.log('\n' + '='.repeat(70));

    // Test 4: Tên trường với khoảng trắng
    registerStudent({
        username: 'test4',
        full_name: 'Test Student 4',
        email: 'test4@example.com',
        grade_level: 'thpt_10',
        class_name: '10a',
        school_name: '  thpt sơn nam  '
    });
}, 300);

setTimeout(() => {
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ All tests completed!');
    console.log('\n💡 KEY POINTS:');
    console.log('   1. Tên trường được tự động chuyển thành HOA');
    console.log('   2. So sánh không phân biệt hoa/thường');
    console.log('   3. Nếu khớp → Gán school_id');
    console.log('   4. Nếu không khớp → school_id = NULL');
    console.log('   5. Tên lớp cũng được uppercase (6a → 6A)');

    db.close();
}, 400);
