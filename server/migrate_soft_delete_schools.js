const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('=== MIGRATING SCHOOLS TABLE FOR SOFT DELETE ===\n');

db.serialize(() => {
    // Step 1: Check if columns already exist
    db.all("PRAGMA table_info(schools)", (err, columns) => {
        if (err) {
            console.error('Error checking table structure:', err);
            db.close();
            return;
        }

        const hasIsDeleted = columns.some(col => col.name === 'is_deleted');
        const hasDeletedAt = columns.some(col => col.name === 'deleted_at');

        if (hasIsDeleted && hasDeletedAt) {
            console.log('✅ Migration already completed - columns exist');
            db.close();
            return;
        }

        console.log('📊 Current schools table structure:');
        console.table(columns.map(c => ({ name: c.name, type: c.type })));

        // Step 2: Add is_deleted column
        if (!hasIsDeleted) {
            console.log('\n🔧 Adding is_deleted column...');
            db.run(`ALTER TABLE schools ADD COLUMN is_deleted INTEGER DEFAULT 0`, (err) => {
                if (err) {
                    console.error('Error adding is_deleted column:', err);
                } else {
                    console.log('✅ Added is_deleted column');
                }
            });
        }

        // Step 3: Add deleted_at column
        if (!hasDeletedAt) {
            console.log('🔧 Adding deleted_at column...');
            db.run(`ALTER TABLE schools ADD COLUMN deleted_at DATETIME`, (err) => {
                if (err) {
                    console.error('Error adding deleted_at column:', err);
                } else {
                    console.log('✅ Added deleted_at column');
                }
            });
        }

        // Step 4: Update existing schools to set is_deleted = 0
        setTimeout(() => {
            console.log('\n🔧 Setting is_deleted = 0 for all existing schools...');
            db.run(`UPDATE schools SET is_deleted = 0 WHERE is_deleted IS NULL`, function (err) {
                if (err) {
                    console.error('Error updating existing schools:', err);
                } else {
                    console.log(`✅ Updated ${this.changes} school(s)`);
                }

                // Step 5: Verify migration
                console.log('\n📊 Verifying migration...');
                db.all("PRAGMA table_info(schools)", (err, newColumns) => {
                    if (err) {
                        console.error('Error:', err);
                    } else {
                        console.table(newColumns.map(c => ({ name: c.name, type: c.type, default: c.dflt_value })));
                    }

                    // Check schools data
                    db.all("SELECT id, name, is_deleted, deleted_at FROM schools LIMIT 5", (err, schools) => {
                        if (err) {
                            console.error('Error:', err);
                        } else {
                            console.log('\n📋 Sample schools data:');
                            console.table(schools);
                        }

                        console.log('\n✅ MIGRATION COMPLETE!');
                        console.log('💡 You can now use soft delete for schools');
                        db.close();
                    });
                });
            });
        }, 500);
    });
});
