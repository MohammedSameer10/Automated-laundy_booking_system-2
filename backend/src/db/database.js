import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../laundry.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

export function initializeDatabase() {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Migrate: add role column if it doesn't exist
    const cols = db.prepare("PRAGMA table_info(users)").all();
    const hasRole = cols.some(c => c.name === 'role');
    if (!hasRole) {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))");
    }

    // Seed admin user if not present
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@laundry.com');
    if (!admin) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare(
            "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)"
        ).run('admin@laundry.com', hash, 'Admin', 'admin');
        console.log('Admin user seeded (admin@laundry.com / admin123)');
    }

    console.log('Database initialized successfully');
}

export default db;
