const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('--- RESETTING ALL MONITORING SETTINGS TO OFF ---');

db.serialize(() => {
    // 1. Tắt giám sát ở cấp độ hệ thống (Global Settings)
    db.run("UPDATE settings SET value = '0' WHERE key IN ('proctoring_enabled', 'social_monitoring_enabled', 'test_monitoring_enabled')", function (err) {
        if (err) {
            console.error('Error updating global settings:', err.message);
        } else {
            console.log(`Global settings updated: ${this.changes} rows affected.`);
        }
    });

    // 2. Tắt giám sát ở cấp độ lớp học (Classes)
    db.run("UPDATE classes SET study_monitoring_enabled = 0, test_monitoring_enabled = 0, social_media_monitoring_enabled = 0", function (err) {
        if (err) {
            console.error('Error updating classes monitoring:', err.message);
        } else {
            console.log(`Class-level monitoring updated: ${this.changes} rows affected.`);
        }
    });

    // 3. Tắt giám sát cá nhân của tất cả người dùng
    db.run("UPDATE users SET is_proctoring_enabled = 0", function (err) {
        if (err) {
            console.error('Error updating users monitoring:', err.message);
        } else {
            console.log(`User-level monitoring updated: ${this.changes} rows affected.`);
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
});
