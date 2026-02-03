const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('=== MIGRATION: Tạo bảng GRADES ===\n');

db.serialize(() => {
    // Create grades table
    db.run(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      semester INTEGER NOT NULL,
      year TEXT NOT NULL,
      grade_type TEXT NOT NULL,
      score REAL NOT NULL,
      teacher_id INTEGER NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
        if (err) {
            console.error('❌ Lỗi tạo bảng grades:', err);
        } else {
            console.log('✅ Đã tạo bảng grades');
        }
    });

    // Create indexes for better performance
    db.run(`
    CREATE INDEX IF NOT EXISTS idx_grades_student 
    ON grades(student_id)
  `, (err) => {
        if (err) console.error('❌ Lỗi tạo index student:', err);
        else console.log('✅ Đã tạo index cho student_id');
    });

    db.run(`
    CREATE INDEX IF NOT EXISTS idx_grades_class 
    ON grades(class_id)
  `, (err) => {
        if (err) console.error('❌ Lỗi tạo index class:', err);
        else console.log('✅ Đã tạo index cho class_id');
    });

    db.run(`
    CREATE INDEX IF NOT EXISTS idx_grades_school 
    ON grades(school_id)
  `, (err) => {
        if (err) console.error('❌ Lỗi tạo index school:', err);
        else console.log('✅ Đã tạo index cho school_id');
    });

    db.run(`
    CREATE INDEX IF NOT EXISTS idx_grades_subject_semester 
    ON grades(subject, semester, year)
  `, (err) => {
        if (err) console.error('❌ Lỗi tạo index subject/semester:', err);
        else console.log('✅ Đã tạo index cho subject/semester/year');
    });

    // Verify table creation
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='grades'", (err, row) => {
        if (err) {
            console.error('❌ Lỗi kiểm tra bảng:', err);
        } else if (row) {
            console.log('\n✅ MIGRATION HOÀN TẤT!');
            console.log('\n📊 Cấu trúc bảng grades:');
            console.log('  - id: INTEGER PRIMARY KEY');
            console.log('  - student_id: INTEGER (FK -> users)');
            console.log('  - class_id: INTEGER (FK -> classes)');
            console.log('  - school_id: INTEGER (FK -> schools) [SCHOOL ISOLATION]');
            console.log('  - subject: TEXT (toan, van, anh, ly, hoa, sinh...)');
            console.log('  - semester: INTEGER (1 hoặc 2)');
            console.log('  - year: TEXT (2025-2026)');
            console.log('  - grade_type: TEXT (oral, quiz_15, test_45, midterm, final)');
            console.log('  - score: REAL (0-10)');
            console.log('  - teacher_id: INTEGER (FK -> users)');
            console.log('  - note: TEXT');
            console.log('  - created_at: TEXT');
            console.log('  - updated_at: TEXT\n');
        } else {
            console.error('❌ Không tìm thấy bảng grades sau khi tạo!');
        }
        db.close();
    });
});
