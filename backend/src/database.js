import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveDatabaseFile = (databasePath) => {
  if (!databasePath) {
    throw new Error('Database path must be provided.');
  }

  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(__dirname, '..', databasePath);
};

const initializeDatabase = async (databasePath) => {
  const databaseFile = resolveDatabaseFile(databasePath);

  const db = await open({
    filename: databaseFile,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
};

export default initializeDatabase;
