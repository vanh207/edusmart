// ============================================================================
// SUPER ADMIN - SCHOOL MANAGEMENT WITH SOFT DELETE
// ============================================================================

// GET /api/super-admin/schools - Get all schools (excluding deleted)
app.get('/api/super-admin/schools', authenticateToken, (req, res) => {
    if (req.user.is_super_admin !== 1) {
        return res.status(403).json({ error: 'Only super admin can view all schools' });
    }

    const includeDeleted = req.query.include_deleted === 'true';
    const query = includeDeleted
        ? 'SELECT * FROM schools ORDER BY name'
        : 'SELECT * FROM schools WHERE is_deleted = 0 ORDER BY name';

    db.all(query, (err, schools) => {
        if (err) {
            console.error('Error fetching schools:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(schools);
    });
});

// POST /api/super-admin/schools - Create new school
app.post('/api/super-admin/schools', authenticateToken, (req, res) => {
    if (req.user.is_super_admin !== 1) {
        return res.status(403).json({ error: 'Only super admin can create schools' });
    }

    const { name, district_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'School name is required' });
    }

    // Check if school with same name exists but is deleted
    db.get('SELECT id, is_deleted FROM schools WHERE UPPER(TRIM(name)) = ?', [name.trim().toUpperCase()], (err, existing) => {
        if (err) {
            console.error('Error checking existing school:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (existing && existing.is_deleted === 1) {
            // School exists but is deleted - suggest restore
            return res.status(409).json({
                error: 'School with this name was previously deleted',
                suggestion: 'restore',
                schoolId: existing.id,
                message: 'Would you like to restore the deleted school instead?'
            });
        }

        if (existing && existing.is_deleted === 0) {
            return res.status(400).json({ error: 'School with this name already exists' });
        }

        // Create new school
        db.run(
            'INSERT INTO schools (name, district_id, is_deleted) VALUES (?, ?, 0)',
            [name.trim(), district_id],
            function (err) {
                if (err) {
                    console.error('Error creating school:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                console.log(`✓ Created school: ${name} (ID: ${this.lastID})`);
                res.json({ message: 'School created successfully', id: this.lastID });
            }
        );
    });
});

// PUT /api/super-admin/schools/:id - Update school
app.put('/api/super-admin/schools/:id', authenticateToken, (req, res) => {
    if (req.user.is_super_admin !== 1) {
        return res.status(403).json({ error: 'Only super admin can update schools' });
    }

    const { id } = req.params;
    const { name, district_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'School name is required' });
    }

    db.run(
        'UPDATE schools SET name = ?, district_id = ? WHERE id = ? AND is_deleted = 0',
        [name.trim(), district_id, id],
        function (err) {
            if (err) {
                console.error('Error updating school:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'School not found or already deleted' });
            }
            console.log(`✓ Updated school ID ${id}`);
            res.json({ message: 'School updated successfully' });
        }
    );
});

// DELETE /api/super-admin/schools/:id - Soft delete school
app.delete('/api/super-admin/schools/:id', authenticateToken, (req, res) => {
    if (req.user.is_super_admin !== 1) {
        return res.status(403).json({ error: 'Only super admin can delete schools' });
    }

    const { id } = req.params;

    // Check if school has students
    db.get('SELECT COUNT(*) as count FROM users WHERE school_id = ? AND role = "student"', [id], (err, result) => {
        if (err) {
            console.error('Error checking students:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const studentCount = result.count;

        // Soft delete (mark as deleted)
        db.run(
            'UPDATE schools SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id],
            function (err) {
                if (err) {
                    console.error('Error deleting school:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'School not found' });
                }
                console.log(`✓ Soft deleted school ID ${id} (${studentCount} students preserved)`);
                res.json({
                    message: 'School deleted successfully',
                    note: studentCount > 0 ? `${studentCount} student(s) remain linked to this school` : null
                });
            }
        );
    });
});

// POST /api/super-admin/schools/:id/restore - Restore deleted school
app.post('/api/super-admin/schools/:id/restore', authenticateToken, (req, res) => {
    if (req.user.is_super_admin !== 1) {
        return res.status(403).json({ error: 'Only super admin can restore schools' });
    }

    const { id } = req.params;

    db.run(
        'UPDATE schools SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
        [id],
        function (err) {
            if (err) {
                console.error('Error restoring school:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'School not found' });
            }
            console.log(`✓ Restored school ID ${id}`);
            res.json({ message: 'School restored successfully' });
        }
    );
});
