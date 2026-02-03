// Student: Get all vocabulary with filters
app.get('/api/vocabulary', authenticateToken, (req, res) => {
    const { grade_level, subject, search } = req.query;
    let query = 'SELECT * FROM vocabulary WHERE 1=1';
    const params = [];

    if (grade_level) {
        query += ' AND grade_level = ?';
        params.push(grade_level);
    }
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    if (search) {
        query += ' AND (word LIKE ? OR meaning LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});
