/**
 * School Matching Module
 * 
 * Module này cung cấp hàm để tự động so sánh và gán school_id
 * khi học sinh đăng ký. Thêm vào đầu file server/index.js:
 * 
 * const { findSchoolIdByName, normalizeSchoolData } = require('./school_matching_module');
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize school và class name thành uppercase
 * @param {Object} data - { school_name, class_name }
 * @returns {Object} - { school_name, class_name } đã uppercase
 */
function normalizeSchoolData(data) {
    return {
        school_name: data.school_name ? data.school_name.trim().toUpperCase() : null,
        class_name: data.class_name ? data.class_name.trim().toUpperCase() : null
    };
}

/**
 * Tìm school_id dựa trên tên trường (không phân biệt hoa/thường)
 * @param {Object} db - SQLite database instance
 * @param {string} schoolName - Tên trường
 * @param {function} callback - Callback(err, school_id)
 */
function findSchoolIdByName(db, schoolName, callback) {
    if (!schoolName || typeof schoolName !== 'string') {
        return callback(null, null);
    }

    const normalizedName = schoolName.trim().toUpperCase();

    if (!normalizedName) {
        return callback(null, null);
    }

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
                console.log(`⚠️ School not found: "${schoolName}" → school_id = NULL`);
                return callback(null, null);
            }
        }
    );
}

/**
 * Tự động gán học sinh vào lớp dựa trên school_id, grade_level, class_name
 * (Hàm này đã tồn tại trong index.js, chỉ cần đảm bảo nó được gọi)
 */
function autoAssignStudentToClass(db, userId, callback) {
    db.get(
        'SELECT school_id, grade_level, class_name, role FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err || !user || user.role !== 'student') {
                return callback && callback(err);
            }

            if (!user.class_name || !user.school_id || !user.grade_level) {
                console.log(`User ${userId} missing class_name/school/grade, skipping auto-assign`);
                return callback && callback(null);
            }

            // Find exact class match
            db.get(
                `SELECT id FROM classes 
         WHERE name = ? AND school_id = ? AND grade_level = ?
         LIMIT 1`,
                [user.class_name, user.school_id, user.grade_level],
                (err, targetClass) => {
                    if (err) return callback && callback(err);

                    if (!targetClass) {
                        console.log(`⚠️ No class found: "${user.class_name}" (school: ${user.school_id}, grade: ${user.grade_level})`);
                        return callback && callback(null);
                    }

                    // Assign student to class
                    db.run(
                        'UPDATE users SET current_class_id = ? WHERE id = ?',
                        [targetClass.id, userId],
                        (err) => {
                            if (!err) {
                                console.log(`✓ User ${userId} auto-assigned to class ${targetClass.id} (${user.class_name})`);
                            }
                            callback && callback(err);
                        }
                    );
                }
            );
        }
    );
}

// ============================================
// EXPORT
// ============================================

module.exports = {
    normalizeSchoolData,
    findSchoolIdByName,
    autoAssignStudentToClass
};

// ============================================
// USAGE EXAMPLE
// ============================================

/*
// Trong server/index.js, thêm vào đầu file:
const { findSchoolIdByName, normalizeSchoolData, autoAssignStudentToClass } = require('./school_matching_module');

// Trong API đăng ký học sinh:
app.post('/api/auth/register', (req, res) => {
  const { username, password, full_name, email, grade_level, class_name, school_name } = req.body;
  
  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // ✅ BƯỚC 1: Normalize tên trường và lớp
  const normalized = normalizeSchoolData({ school_name, class_name });
  
  // ✅ BƯỚC 2: Tìm school_id
  findSchoolIdByName(db, normalized.school_name, (err, school_id) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // ✅ BƯỚC 3: Insert user
    db.run(`
      INSERT INTO users (username, password, full_name, email, grade_level, class_name, school_id, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student')
    `, [username, hashedPassword, full_name, email, grade_level, normalized.class_name, school_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const userId = this.lastID;
      
      // ✅ BƯỚC 4: Auto-assign to class
      if (school_id) {
        autoAssignStudentToClass(db, userId, (err) => {
          if (err) console.error('Auto-assign failed:', err);
        });
      }
      
      res.json({ 
        message: 'Registration successful',
        userId,
        school_id: school_id || null
      });
    });
  });
});
*/
