/**
 * Helper Function: Find School ID by Name
 * 
 * Hàm này tìm school_id dựa trên tên trường học sinh nhập
 * Thêm vào server/index.js trước các API endpoints
 */

// ============================================
// HELPER FUNCTION: FIND SCHOOL ID BY NAME
// ============================================

/**
 * Tìm school_id dựa trên tên trường
 * @param {string} schoolName - Tên trường học sinh nhập
 * @param {function} callback - Callback(err, school_id)
 * 
 * Logic:
 * - Nếu tên trường khớp với bảng schools → Trả về school_id
 * - Nếu không khớp → Trả về null
 * - So sánh không phân biệt hoa/thường
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

    // Tìm trong bảng schools
    db.get(
        'SELECT id, name FROM schools WHERE UPPER(TRIM(name)) = ?',
        [normalizedName],
        (err, school) => {
            if (err) {
                console.error('Error finding school by name:', err);
                return callback(err, null);
            }

            if (school) {
                console.log(`✓ Found school: "${school.name}" (ID: ${school.id})`);
                return callback(null, school.id);
            } else {
                console.log(`⚠️ School not found: "${schoolName}" - will set school_id = NULL`);
                return callback(null, null);
            }
        }
    );
}

// ============================================
// SỬ DỤNG TRONG API ĐĂNG KÝ
// ============================================

/**
 * Ví dụ: Thêm vào API đăng ký học sinh
 * 
 * TRƯỚC:
 * db.run('INSERT INTO users (..., school_id) VALUES (..., ?)', [..., req.body.school_id])
 * 
 * SAU:
 */

// Example API endpoint (thêm vào index.js)
app.post('/api/auth/register-student', (req, res) => {
    const { username, password, full_name, email, grade_level, class_name, school_name } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // ✅ BƯỚC 1: Tìm school_id từ tên trường
    findSchoolIdByName(school_name, (err, school_id) => {
        if (err) {
            return res.status(500).json({ error: 'Database error while finding school' });
        }

        // ✅ BƯỚC 2: Insert user với school_id (có thể là NULL)
        db.run(`
      INSERT INTO users (
        username, password, full_name, email, 
        grade_level, class_name, school_id, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'student')
    `, [username, hashedPassword, full_name, email, grade_level, class_name, school_id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const userId = this.lastID;

                // ✅ BƯỚC 3: Nếu có school_id, tự động gán vào lớp
                if (school_id) {
                    autoAssignStudentToClass(userId, (err) => {
                        if (err) console.error('Auto-assign to class failed:', err);
                    });
                }

                res.json({
                    message: 'Registration successful',
                    userId,
                    school_id: school_id || null,
                    note: school_id ? 'Assigned to school' : 'School not found, set to NULL'
                });
            });
    });
});

// ============================================
// PERIODIC SYNC: Gán school_id cho học sinh cũ
// ============================================

/**
 * Script này chạy định kỳ hoặc khi admin tạo trường mới
 * Tự động gán school_id cho học sinh có tên trường khớp nhưng chưa có school_id
 */
function syncStudentsToSchools(callback) {
    console.log('🔄 Syncing students to schools...');

    // Lấy tất cả học sinh chưa có school_id nhưng có tên trường
    db.all(`
    SELECT id, username, class_name, grade_level
    FROM users
    WHERE role = 'student' AND school_id IS NULL AND class_name IS NOT NULL
  `, [], (err, students) => {
        if (err) return callback(err);

        if (students.length === 0) {
            console.log('✅ No students to sync');
            return callback(null, 0);
        }

        let synced = 0;
        let processed = 0;

        students.forEach(student => {
            // Tìm lớp học của học sinh
            db.get(`
        SELECT school_id, name 
        FROM classes 
        WHERE name = ? AND grade_level = ?
        LIMIT 1
      `, [student.class_name, student.grade_level], (err, classInfo) => {
                if (!err && classInfo && classInfo.school_id) {
                    // Gán school_id
                    db.run('UPDATE users SET school_id = ? WHERE id = ?',
                        [classInfo.school_id, student.id],
                        (err) => {
                            if (!err) {
                                console.log(`✓ ${student.username} → School ID ${classInfo.school_id}`);
                                synced++;
                            }
                        }
                    );
                }

                processed++;
                if (processed === students.length) {
                    console.log(`✅ Synced ${synced}/${students.length} students`);
                    callback(null, synced);
                }
            });
        });
    });
}

// Export functions
module.exports = {
    findSchoolIdByName,
    syncStudentsToSchools
};

console.log('✅ School matching functions loaded');
