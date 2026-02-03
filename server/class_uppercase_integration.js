/**
 * API Integration Guide: Uppercase Class Names
 * 
 * Hướng dẫn thêm logic uppercase vào API tạo/sửa lớp học
 */

// ============================================
// THÊM VÀO API TẠO LỚP HỌC
// ============================================

/**
 * Ví dụ: API tạo lớp mới
 * Endpoint: POST /api/admin/classes
 */

app.post('/api/admin/classes', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { name, grade_level, teacher_id } = req.body;
    const school_id = req.schoolId; // Từ middleware

    // ✅ THÊM: Normalize tên lớp thành uppercase
    const normalizedName = name ? name.trim().toUpperCase() : null;

    if (!normalizedName || !grade_level || !school_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert class với tên đã uppercase
    db.run(`
    INSERT INTO classes (name, grade_level, school_id, teacher_id)
    VALUES (?, ?, ?, ?)
  `, [normalizedName, grade_level, school_id, teacher_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'Class created successfully',
                id: this.lastID,
                name: normalizedName // Trả về tên đã uppercase
            });
        });
});

// ============================================
// THÊM VÀO API SỬA LỚP HỌC
// ============================================

/**
 * Ví dụ: API sửa lớp
 * Endpoint: PUT /api/admin/classes/:id
 */

app.put('/api/admin/classes/:id', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { id } = req.params;
    const { name, grade_level, teacher_id } = req.body;
    const school_id = req.schoolId;

    // ✅ THÊM: Normalize tên lớp
    const normalizedName = name ? name.trim().toUpperCase() : name;

    // Verify class belongs to school
    db.get('SELECT id FROM classes WHERE id = ? AND school_id = ?', [id, school_id], (err, classRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!classRow) return res.status(404).json({ error: 'Class not found' });

        // Update class
        db.run(`
      UPDATE classes 
      SET name = ?, grade_level = ?, teacher_id = ?
      WHERE id = ?
    `, [normalizedName, grade_level, teacher_id, id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'Class updated successfully',
                name: normalizedName
            });
        });
    });
});

// ============================================
// FRONTEND: AUTO-UPPERCASE INPUT
// ============================================

/**
 * Trong form tạo lớp (React/Next.js)
 * File: client/app/admin/dashboard/page.tsx (hoặc tương tự)
 */

// State
const [className, setClassName] = useState('');

// Input với auto-uppercase
<input
    type="text"
    value={className}
    onChange={(e) => setClassName(e.target.value.toUpperCase())}
    placeholder="Tên lớp (VD: 6A, 7B)"
    maxLength={10}
/>

// Hoặc normalize khi submit
const handleCreateClass = async () => {
    const normalizedName = className.trim().toUpperCase();

    await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: normalizedName,
            grade_level: gradeLevel,
            teacher_id: teacherId
        })
    });
};

// ============================================
// TEST
// ============================================

/**
 * Test tạo lớp với tên viết thường
 */

// Request
POST / api / admin / classes
{
    "name": "6a",
        "grade_level": "thcs_6",
            "school_id": 1
}

// Response
{
    "message": "Class created successfully",
        "id": 11,
            "name": "6A"  // ✅ Đã uppercase
}

// Verify trong database
SELECT * FROM classes WHERE id = 11;
--name: "6A"(uppercase)

console.log('✅ Class name uppercase integration guide loaded');
