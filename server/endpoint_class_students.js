// ============================================================================
// ADMIN - Get students by class_id
// ============================================================================
// GET /api/admin/classes/:id/students - Get all students in a specific class
app.get('/api/admin/classes/:id/students', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ admin và giáo viên mới có quyền xem danh sách học sinh' });
  }

  const classId = parseInt(req.params.id);
  const schoolId = req.schoolId;

  console.log(`[GET /api/admin/classes/${classId}/students] User: ${req.user.username}, Role: ${req.user.role}, School: ${schoolId}`);

  // Query to get all students in the class
  let query = `
    SELECT 
      u.id,
      u.username,
      u.full_name,
      u.email,
      u.class_name,
      u.class_id,
      u.grade_level,
      u.school_level,
      u.created_at
    FROM users u
    WHERE u.class_id = ? 
      AND u.role = 'student'
  `;

  const params = [classId];

  if (req.user.is_super_admin !== 1) {
    query += " AND u.school_id = ?";
    params.push(schoolId);
  }

  query += " ORDER BY u.full_name ASC";

  db.all(query, params, (err, students) => {
    if (err) {
      console.error('[GET /api/admin/classes/:id/students] Database error:', err);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách học sinh' });
    }

    console.log(`[GET /api/admin/classes/${classId}/students] Found ${students.length} student(s)`);
    res.json(students);
  });
});
