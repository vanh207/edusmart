const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
    console.log('Starting migration for classes table uniqueness...');

    // 1. Get existing columns
    db.all("PRAGMA table_info(classes)", (err, columns) => {
        if (err) {
            console.error('Error getting table info:', err);
            process.exit(1);
        }

        const columnNames = columns.map(c => c.name).join(', ');
        console.log('Columns identified:', columnNames);

        // 2. Create new table with school_id in initial schema and composite UNIQUE constraint
        const createTableSql = `
            CREATE TABLE classes_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                grade_level TEXT NOT NULL,
                teacher_id INTEGER,
                schedule_start TEXT,
                schedule_end TEXT,
                schedule_days TEXT,
                study_monitoring_enabled INTEGER DEFAULT 0,
                test_monitoring_enabled INTEGER DEFAULT 0,
                social_media_monitoring_enabled INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                school_id INTEGER,
                FOREIGN KEY(teacher_id) REFERENCES users(id),
                UNIQUE(name, school_id)
            )
        `;

        db.run(createTableSql, (err) => {
            if (err) {
                console.error('Error creating new table:', err);
                // If classes_new already exists, we might need to handle it or exit
                process.exit(1);
            }
            console.log('Created classes_new table.');

            // 3. Move data
            db.run(`INSERT INTO classes_new (${columnNames}) SELECT ${columnNames} FROM classes`, (err) => {
                if (err) {
                    console.error('Error moving data:', err);
                    process.exit(1);
                }
                console.log('Data moved to classes_new.');

                // 4. Swap tables
                db.run("DROP TABLE classes", (err) => {
                    if (err) {
                        console.error('Error dropping old table:', err);
                        process.exit(1);
                    }
                    console.log('Dropped old classes table.');

                    db.run("ALTER TABLE classes_new RENAME TO classes", (err) => {
                        if (err) {
                            console.error('Error renaming table:', err);
                            process.exit(1);
                        }
                        console.log('Renamed classes_new to classes.');
                        console.log('Migration successful!');
                        db.close();
                    });
                });
            });
        });
    });
});
