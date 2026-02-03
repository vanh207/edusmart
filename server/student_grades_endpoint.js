// GET /api/student/grades - Get student's own grades
app.get('/api/student/grades', authenticateToken, enforceSchoolIsolation, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can view their own grades' });
    }

    const student_id = req.user.id;
    const { semester, year, subject, student_id: targetStudentId } = req.query;

    // Build query
    let query = `
    SELECT 
      g.id,
      g.student_id,
      g.class_id,
      g.subject,
      g.semester,
      g.year,
      g.grade_type,
      g.score,
      g.note,
      g.created_at,
      u.full_name as student_name,
      c.name as class_name
    FROM grades g
    LEFT JOIN users u ON g.student_id = u.id
    LEFT JOIN classes c ON g.class_id = c.id
    WHERE g.student_id = ?
  `;

    const params = [student_id];

    if (semester) {
        query += ' AND g.semester = ?';
        params.push(semester);
    }

    if (year) {
        query += ' AND g.year = ?';
        params.push(year);
    }

    if (subject) {
        query += ' AND g.subject = ?';
        params.push(subject);
    }

    query += ' ORDER BY g.created_at DESC';

    db.all(query, params, (err, grades) => {
        if (err) {
            console.error('[GET /api/student/grades] Database error:', err);
            return res.status(500).json({ error: 'Lỗi khi lấy điểm' });
        }

        console.log(`[GET /api/student/grades] Student ${student_id} has ${grades.length} grade(s)`);
        res.json(grades);
    });
});
