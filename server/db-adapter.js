// Database Adapter - Supports both SQLite and PostgreSQL
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

class DatabaseAdapter {
    constructor() {
        this.type = process.env.DATABASE_URL ? 'postgresql' : 'sqlite';
        this.db = null;
    }

    async connect() {
        if (this.type === 'postgresql') {
            const { Client } = require('pg');
            this.db = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            await this.db.connect();
            console.log('✅ Connected to PostgreSQL');
        } else {
            this.db = new sqlite3.Database('./database.db');
            console.log('✅ Connected to SQLite');
        }
    }

    // Execute query with automatic type conversion
    async query(sql, params = []) {
        if (this.type === 'postgresql') {
            // Convert ? placeholders to $1, $2, etc.
            let pgSql = sql;
            let paramIndex = 1;
            pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

            const result = await this.db.query(pgSql, params);
            return result.rows;
        } else {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }
    }

    // Execute single row query
    async get(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0];
    }

    // Execute insert/update/delete
    async run(sql, params = []) {
        if (this.type === 'postgresql') {
            let pgSql = sql;
            let paramIndex = 1;
            pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

            const result = await this.db.query(pgSql, params);
            return {
                lastID: result.rows[0]?.id,
                changes: result.rowCount
            };
        } else {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        }
    }

    async close() {
        if (this.type === 'postgresql') {
            await this.db.end();
        } else {
            this.db.close();
        }
    }
}

// Export singleton instance
const db = new DatabaseAdapter();
module.exports = db;
