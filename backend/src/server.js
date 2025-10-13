import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import initializeDatabase from './database.js';
import { ensureDatabaseConfig, getConfigFilePath } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveDatabaseFile = (databasePath) => {
  if (path.isAbsolute(databasePath)) {
    return databasePath;
  }

  return path.resolve(__dirname, '..', databasePath);
};

const pepperPassword = (password, secret) => `${password}${secret}`;

const bootstrap = async () => {
  const config = await ensureDatabaseConfig();
  const databaseFile = resolveDatabaseFile(config.databasePath);
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });

  const db = await initializeDatabase(databaseFile);

  const app = express();
  const port = process.env.PORT || 4000;

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config-info', (_req, res) => {
    res.json({
      database: {
        driver: config.driver,
        file: databaseFile,
        configFile: getConfigFilePath()
      }
    });
  });

  app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, passwordConfirmation } = req.body ?? {};

    const normalizedFirstName = normalizeString(firstName);
    const normalizedLastName = normalizeString(lastName);
    const normalizedEmail = normalizeString(email).toLowerCase();
    const rawPassword = typeof password === 'string' ? password : '';

    if (!normalizedFirstName) {
      return res.status(400).json({ message: 'First name is required.' });
    }

    if (!normalizedLastName) {
      return res.status(400).json({ message: 'Last name is required.' });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email must follow the format name@example.com.' });
    }

    if (!rawPassword) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    if (rawPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    if (passwordConfirmation !== undefined && rawPassword !== passwordConfirmation) {
      return res.status(400).json({ message: 'Passwords must match.' });
    }

    try {
      const passwordHash = await bcrypt.hash(pepperPassword(rawPassword, config.databasePassword), 12);
      await db.run(
        `INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
        [normalizedFirstName, normalizedLastName, normalizedEmail, passwordHash]
      );
      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ message: 'This email is already registered.' });
        return;
      }

      console.error('Registration error', error);
      res.status(500).json({ message: 'Registration failed unexpectedly. Please review your input and try again.' });
    }
  });

  const mapUserRow = (row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    createdAt: row.created_at
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body ?? {};

    const normalizedEmail = normalizeString(email).toLowerCase();
    const rawPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail || !rawPassword) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const user = await db.get(
        'SELECT id, first_name, last_name, email, password_hash, created_at FROM users WHERE email = ?',
        [normalizedEmail]
      );

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const passwordIsValid = await bcrypt.compare(
        pepperPassword(rawPassword, config.databasePassword),
        user.password_hash
      );

      if (!passwordIsValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      res.json({ message: 'Login successful.', user: mapUserRow(user) });
    } catch (error) {
      console.error('Login error', error);
      res.status(500).json({ message: 'Unexpected error. Please try again.' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'A valid user id is required.' });
    }

    try {
      const user = await db.get(
        'SELECT id, first_name, last_name, email, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.json({ user: mapUserRow(user) });
    } catch (error) {
      console.error('Fetch user error', error);
      res.status(500).json({ message: 'Unable to load the requested user.' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'A valid user id is required.' });
    }

    const { firstName, lastName, email } = req.body ?? {};

    const normalizedFirstName = normalizeString(firstName);
    const normalizedLastName = normalizeString(lastName);
    const normalizedEmail = normalizeString(email).toLowerCase();

    if (!normalizedFirstName) {
      return res.status(400).json({ message: 'First name is required.' });
    }

    if (!normalizedLastName) {
      return res.status(400).json({ message: 'Last name is required.' });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email must follow the format name@example.com.' });
    }

    try {
      const result = await db.run(
        'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
        [normalizedFirstName, normalizedLastName, normalizedEmail, userId]
      );

      if (result.changes === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const updatedUser = await db.get(
        'SELECT id, first_name, last_name, email, created_at FROM users WHERE id = ?',
        [userId]
      );

      res.json({ message: 'User updated successfully.', user: mapUserRow(updatedUser) });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ message: 'Another account already uses this email address.' });
        return;
      }

      console.error('Update user error', error);
      res.status(500).json({ message: 'Unable to update the user at this time.' });
    }
  });

  app.listen(port, () => {
    console.log(`API server ready at http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
