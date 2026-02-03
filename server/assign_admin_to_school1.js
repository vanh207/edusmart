/**
 * Fix Script: Assign Admin to School ID 1
 * 
 * Cập nhật tài khoản admin để quản lý School ID 1 (THCS NINH LAI)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Assigning admin to School ID 1...\n');

// Option 1: Update existing admin 'adminn' to School ID 1
const ADMIN_USERNAME = 'adminn'; // Thay đổi nếu muốn dùng admin khác
const TARGET_SCHOOL_ID = 1;

db.get('SELECT id, username, school_id FROM users WHERE username = ?', [ADMIN_USERNAME], (err, admin) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (!admin) {
        console.log(`❌ Admin '${ADMIN_USERNAME}' not found!`);
        console.log('\n💡 Available options:');
        console.log('   1. Create a new admin account for School ID 1');
        console.log('   2. Use a different admin username');
        db.close();
        return;
    }

    console.log(`Found admin: ${admin.username}`);
    console.log(`  Current school_id: ${admin.school_id}`);
    console.log(`  Will change to: ${TARGET_SCHOOL_ID}`);

    // Update admin's school_id
    db.run('UPDATE users SET school_id = ? WHERE id = ?', [TARGET_SCHOOL_ID, admin.id], (err) => {
        if (err) {
            console.error('❌ Error updating admin:', err);
            db.close();
            return;
        }

        console.log(`\n✅ Successfully updated admin '${admin.username}' to School ID ${TARGET_SCHOOL_ID}!`);

        // Verify
        db.get('SELECT username, school_id FROM users WHERE id = ?', [admin.id], (err, updated) => {
            if (updated) {
                console.log(`\n🔍 Verification:`);
                console.log(`   Username: ${updated.username}`);
                console.log(`   School ID: ${updated.school_id}`);
            }

            console.log('\n💡 Next steps:');
            console.log('   1. Logout from current session');
            console.log(`   2. Login with username: ${admin.username}`);
            console.log('   3. You will now see students from School ID 1 (THCS NINH LAI)');
            console.log('   4. The 2 students (hien, minh) will appear in admin dashboard');

            db.close();
        });
    });
});
