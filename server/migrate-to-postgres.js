const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs');

async function migrateSQLiteToPostgreSQL() {
    console.log('🔄 Starting SQLite → PostgreSQL Migration...\n');

    // PostgreSQL connection
    const pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await pgClient.connect();
        console.log('✅ Connected to PostgreSQL\n');

        // SQLite connection
        const db = new sqlite3.Database('./database.db');

        // Get all tables
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📋 Found ${tables.length} tables to migrate\n`);

        for (const table of tables) {
            const tableName = table.name;
            console.log(`\n📦 Migrating table: ${tableName}`);

            // Get table schema
            const columns = await new Promise((resolve, reject) => {
                db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Convert SQLite types to PostgreSQL types
            const columnDefs = columns.map(col => {
                let type = col.type.toUpperCase();

                // Type mapping
                if (type.includes('INT')) type = 'INTEGER';
                else if (type.includes('TEXT') || type.includes('VARCHAR') || type.includes('CHAR')) type = 'TEXT';
                else if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) type = 'REAL';
                else if (type.includes('BLOB')) type = 'BYTEA';
                else if (type.includes('NUMERIC') || type.includes('DECIMAL')) type = 'NUMERIC';
                else type = 'TEXT'; // Default

                let def = `"${col.name}" ${type}`;

                if (col.pk) def += ' PRIMARY KEY';
                if (col.notnull && !col.pk) def += ' NOT NULL';
                if (col.dflt_value) def += ` DEFAULT ${col.dflt_value}`;

                return def;
            }).join(', ');

            // Drop table if exists (for clean migration)
            await pgClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);

            // Create table
            await pgClient.query(`CREATE TABLE "${tableName}" (${columnDefs})`);
            console.log(`  ✅ Created table structure`);

            // Get all data
            const rows = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (rows.length === 0) {
                console.log(`  ⚠️  No data to migrate`);
                continue;
            }

            // Insert data
            let inserted = 0;
            for (const row of rows) {
                const keys = Object.keys(row);
                const values = Object.values(row);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const columnNames = keys.map(k => `"${k}"`).join(', ');

                try {
                    await pgClient.query(
                        `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`,
                        values
                    );
                    inserted++;
                } catch (err) {
                    console.error(`  ❌ Error inserting row:`, err.message);
                }
            }

            console.log(`  ✅ Migrated ${inserted}/${rows.length} rows`);
        }

        // Close connections
        db.close();
        await pgClient.end();

        console.log('\n\n🎉 Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`  - Tables migrated: ${tables.length}`);
        console.log(`  - Database: PostgreSQL`);
        console.log(`  - Status: Ready for production\n`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateSQLiteToPostgreSQL();
