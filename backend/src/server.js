import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import initializeDatabase from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, '../data');

const bootstrap = async () => {
  await fs.mkdir(dataDirectory, { recursive: true });
  const db = await initializeDatabase();

  const app = express();
  const port = process.env.PORT || 4000;

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, passwordConfirmation } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (passwordConfirmation !== undefined && password !== passwordConfirmation) {
      return res.status(400).json({ message: 'Passwords must match.' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      await db.run(
        `INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
        [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash]
      );
      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ message: 'This email is already registered.' });
        return;
      }

      console.error('Registration error', error);
      res.status(500).json({ message: 'Unexpected error. Please try again.' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.get('SELECT password_hash FROM users WHERE email = ?', [normalizedEmail]);

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const passwordIsValid = await bcrypt.compare(password, user.password_hash);

      if (!passwordIsValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      res.json({ message: 'Login successful.' });
    } catch (error) {
      console.error('Login error', error);
      res.status(500).json({ message: 'Unexpected error. Please try again.' });
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
