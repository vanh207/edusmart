/**
 * Grades API Endpoints
 * 
 * Add these endpoints to your server/index.js file
 * Place them BEFORE the app.listen() or server startup code
 */

// ============================================
// TEACHER ENDPOINTS
// ============================================

// GET /api/teacher/students/:classId - Get all students in a class
app.get('/api/teacher/students/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { classId } = req.params;
    const teacherSchoolId = req.user.school_id;

    // Verify class belongs to teacher's school
    db.get('SELECT school_id FROM classes WHERE id = ?', [classId], (err, classData) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!classData) {
            return res.status(404).json({ error: 'Class not found' });
        }

        if (classData.school_id !== teacherSchoolId) {
            return res.status(403).json({ error: 'Access denied: Class belongs to different school' });
        }

        // Get all students in this class
        let studentQuery = `
          SELECT 
            id, 
            username, 
            full_name, 
            email, 
            grade_level
          FROM users 
          WHERE current_class_id = ? 
            AND role = 'student'
        `;
        const studentParams = [classId];

        if (req.user.is_super_admin !== 1) {
            studentQuery += " AND school_id = ?";
            studentParams.push(teacherSchoolId);
        }

        studentQuery += " ORDER BY full_name";

        db.all(studentQuery, studentParams, (err, students) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ students });
        });
    });
});

// POST /api/teacher/grades - Create a new grade
app.post('/api/teacher/grades', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { student_id, class_id, subject, semester, year, grade_type, score, note } = req.body;
    const teacher_id = req.user.id;
    const school_id = req.user.school_id;

    // Validate score
    if (score < 0 || score > 10) {
        return res.status(400).json({ error: 'Score must be between 0 and 10' });
    }

    // Verify student belongs to the class and school
    db.get(`
    SELECT u.id, u.school_id, u.current_class_id 
    FROM users u 
    WHERE u.id = ? AND u.role = 'student'
  `, [student_id], (err, student) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.school_id !== school_id) {
            return res.status(403).json({ error: 'Access denied: Student belongs to different school' });
        }

        if (student.current_class_id !== class_id) {
            return res.status(400).json({ error: 'Student does not belong to this class' });
        }

        // Insert grade
        db.run(`
      INSERT INTO grades (
        student_id, class_id, school_id, subject, semester, 
        year, grade_type, score, teacher_id, note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [student_id, class_id, school_id, subject, semester, year, grade_type, score, teacher_id, note],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    message: 'Grade created successfully',
                    id: this.lastID
                });
            });
    });
});

// GET /api/teacher/grades/:classId - Get all grades for a class
app.get('/api/teacher/grades/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { classId } = req.params;
    const { subject, semester, year } = req.query;
    const school_id = req.user.school_id;

    let query = `
    SELECT 
      g.*,
      u.full_name as student_name
    FROM grades g
    INNER JOIN users u ON g.student_id = u.id
    WHERE g.class_id = ?
  `;

    const params = [classId];

    if (req.user.is_super_admin !== 1) {
        query += " AND g.school_id = ?";
        params.push(school_id);
    }

    if (subject) {
        query += ' AND g.subject = ?';
        params.push(subject);
    }

    if (semester) {
        query += ' AND g.semester = ?';
        params.push(semester);
    }

    if (year) {
        query += ' AND g.year = ?';
        params.push(year);
    }

    query += ' ORDER BY u.full_name, g.created_at DESC';

    db.all(query, params, (err, grades) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(grades);
    });
});

// PUT /api/teacher/grades/:id - Update a grade
app.put('/api/teacher/grades/:id', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { id } = req.params;
    const { score, note, semester, year } = req.body;
    const school_id = req.user.school_id;

    // Validate score
    if (score !== undefined && (score < 0 || score > 10)) {
        return res.status(400).json({ error: 'Score must be between 0 and 10' });
    }

    // Verify grade belongs to teacher's school or user is super admin
    db.get('SELECT school_id, score, note, semester, year FROM grades WHERE id = ?', [id], (err, grade) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!grade) {
            return res.status(404).json({ error: 'Grade not found' });
        }

        if (req.user.is_super_admin !== 1 && grade.school_id !== school_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update grade - build dynamic query for provided fields
        const finalScore = score !== undefined ? score : grade.score;
        const finalNote = note !== undefined ? note : grade.note;
        const finalSemester = semester !== undefined ? semester : grade.semester;
        const finalYear = year !== undefined ? year : grade.year;

        db.run(`
      UPDATE grades 
      SET score = ?, note = ?, semester = ?, year = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [finalScore, finalNote, finalSemester, finalYear, id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'Grade updated successfully' });
        });
    });
});

// DELETE /api/teacher/grades/:id - Delete a grade
app.delete('/api/teacher/grades/:id', authenticateToken, enforceSchoolIsolation, (req, res) => {
    const { id } = req.params;
    const school_id = req.user.school_id;

    // Verify grade belongs to teacher's school
    db.get('SELECT school_id FROM grades WHERE id = ?', [id], (err, grade) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!grade) {
            return res.status(404).json({ error: 'Grade not found' });
        }

        if (grade.school_id !== school_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete grade
        db.run('DELETE FROM grades WHERE id = ?', [id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'Grade deleted successfully' });
        });
    });
});

// ============================================
// STUDENT ENDPOINTS
// ============================================

// GET /api/student/grades - Get student's own grades
app.get('/api/student/grades', authenticateToken, (req, res) => {
    const student_id = req.user.id;
    const { semester, year, subject } = req.query;

    let query = `
    SELECT 
      g.*,
      c.name as class_name
    FROM grades g
    LEFT JOIN classes c ON g.class_id = c.id
    WHERE g.student_id = ?
  `;

    const params = [student_id];

    if (subject) {
        query += ' AND g.subject = ?';
        params.push(subject);
    }

    if (semester) {
        query += ' AND g.semester = ?';
        params.push(semester);
    }

    if (year) {
        query += ' AND g.year = ?';
        params.push(year);
    }

    query += ' ORDER BY g.created_at DESC';

    db.all(query, params, (err, grades) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(grades);
    });
});

console.log('✅ Grades API endpoints loaded');
