const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('=== SCRIPT XÓA TOÀN BỘ DỮ LIỆU HỌC TẬP ===\n');

// Step 1: Backup data before deletion
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup_before_cleanup_${timestamp}.json`);

const backupData = {
    timestamp: new Date().toISOString(),
    lessons: [],
    exercises: [],
    vocabulary: [],
    tests: [],
    test_questions: []
};

db.serialize(() => {
    // Backup Lessons
    db.all('SELECT * FROM lessons', [], (err, rows) => {
        if (err) {
            console.error('❌ Lỗi backup lessons:', err);
            return;
        }
        backupData.lessons = rows;
        console.log(`📦 Backup ${rows.length} bài học`);
    });

    // Backup Exercises
    db.all('SELECT * FROM exercises', [], (err, rows) => {
        if (err) {
            console.error('❌ Lỗi backup exercises:', err);
            return;
        }
        backupData.exercises = rows;
        console.log(`📦 Backup ${rows.length} bài luyện tập`);
    });

    // Backup Vocabulary
    db.all('SELECT * FROM vocabulary', [], (err, rows) => {
        if (err) {
            console.error('❌ Lỗi backup vocabulary:', err);
            return;
        }
        backupData.vocabulary = rows;
        console.log(`📦 Backup ${rows.length} từ vựng`);
    });

    // Backup Tests
    db.all('SELECT * FROM tests', [], (err, rows) => {
        if (err) {
            console.error('❌ Lỗi backup tests:', err);
            return;
        }
        backupData.tests = rows;
        console.log(`📦 Backup ${rows.length} bài kiểm tra`);
    });

    // Backup Test Questions
    db.all('SELECT * FROM test_questions', [], (err, rows) => {
        if (err) {
            console.error('❌ Lỗi backup test_questions:', err);
            return;
        }
        backupData.test_questions = rows;
        console.log(`📦 Backup ${rows.length} câu hỏi kiểm tra\n`);

        // Save backup file
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup hoàn tất: ${backupFile}\n`);

        // Step 2: Delete data
        console.log('🗑️  DỮ LIỆU ĐÃ ĐƯỢC BACKUP (Logic xóa đã được tạm dừng để đảm bảo an toàn)...\n');

        /*
        // Delete in correct order (respect foreign keys)
        db.run('DELETE FROM test_results', function (err) {
            if (err) console.error('❌ Lỗi xóa test_results:', err);
            else console.log(`✅ Đã xóa ${this.changes} kết quả kiểm tra`);
        });

        db.run('DELETE FROM test_questions', function (err) {
            if (err) console.error('❌ Lỗi xóa test_questions:', err);
            else console.log(`✅ Đã xóa ${this.changes} câu hỏi kiểm tra`);
        });

        db.run('DELETE FROM tests', function (err) {
            if (err) console.error('❌ Lỗi xóa tests:', err);
            else console.log(`✅ Đã xóa ${this.changes} bài kiểm tra`);
        });

        db.run('DELETE FROM exercise_submissions', function (err) {
            if (err) console.error('❌ Lỗi xóa exercise_submissions:', err);
            else console.log(`✅ Đã xóa ${this.changes} bài nộp luyện tập`);
        });

        db.run('DELETE FROM exercises', function (err) {
            if (err) console.error('❌ Lỗi xóa exercises:', err);
            else console.log(`✅ Đã xóa ${this.changes} bài luyện tập`);
        });

        db.run('DELETE FROM vocabulary', function (err) {
            if (err) console.error('❌ Lỗi xóa vocabulary:', err);
            else console.log(`✅ Đã xóa ${this.changes} từ vựng`);
        });

        db.run('DELETE FROM user_progress', function (err) {
            if (err) console.error('❌ Lỗi xóa user_progress:', err);
            else console.log(`✅ Đã xóa ${this.changes} tiến trình học tập`);
        });

        db.run('DELETE FROM lessons', function (err) {
            if (err) console.error('❌ Lỗi xóa lessons:', err);
            else console.log(`✅ Đã xóa ${this.changes} bài học`);

            console.log('\n✅ HOÀN TẤT XÓA DỮ LIỆU!');
            console.log(`\n📁 File backup: ${backupFile}`);
            console.log('\n⚠️  LƯU Ý: Nếu cần khôi phục, hãy giữ file backup này!\n');

            db.close();
        });
        */
        console.log(`\n📁 File backup đã sẵn sàng: ${backupFile}`);
        console.log('\n⚠️  LƯU Ý: Đã tạm dừng logic xóa để bảo vệ dữ liệu.\n');
        db.close();
    });
});
