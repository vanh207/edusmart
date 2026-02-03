// GET /api/teacher/students/:classId - Get students in a class
app.get('/api/teacher/students/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only teachers and admins can view class students' });
  }

  const classId = parseInt(req.params.classId);
  const school_id = req.schoolId;

  console.log(`[GET /api/teacher/students/${classId}] User: ${req.user.username}, Role: ${req.user.role}, School: ${school_id}`);

  let query = `
    SELECT
      id,
      username,
      full_name,
      email,
      grade_level
    FROM users
    WHERE class_id = ?
      AND role = 'student'
  `;

  const params = [classId];

  if (req.user.is_super_admin !== 1) {
    query += " AND school_id = ?";
    params.push(school_id);
  }

  query += " ORDER BY full_name";

  db.all(query, params, (err, students) => {
    if (err) {
      console.error('[GET /api/teacher/students/:classId] Database error:', err);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách học sinh' });
    }

    console.log(`[GET /api/teacher/students/${classId}] Found ${students.length} student(s)`);
    res.json({ students });
  });
});
