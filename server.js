const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'data.db'));

const PORT = process.env.PORT || 3000;

// Database setup
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;
db.exec(createTableQuery);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('register', {
    error: null,
    success: null,
    formData: {
      firstName: '',
      lastName: '',
      email: ''
    }
  });
});

app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const trimmed = {
    firstName: firstName ? firstName.trim() : '',
    lastName: lastName ? lastName.trim() : '',
    email: email ? email.trim().toLowerCase() : ''
  };

  if (!trimmed.firstName || !trimmed.lastName || !trimmed.email || !password || !confirmPassword) {
    return res.status(400).render('register', {
      error: 'Please fill in all fields.',
      success: null,
      formData: trimmed
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed.email)) {
    return res.status(400).render('register', {
      error: 'Please enter a valid email address.',
      success: null,
      formData: trimmed
    });
  }

  if (password.length < 8) {
    return res.status(400).render('register', {
      error: 'Password must be at least 8 characters long.',
      success: null,
      formData: trimmed
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('register', {
      error: 'Password confirmation does not match.',
      success: null,
      formData: trimmed
    });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const passwordHash = await bcrypt.hash(password, 10);
    insert.run(trimmed.firstName, trimmed.lastName, trimmed.email, passwordHash, new Date().toISOString());

    return res.render('register', {
      error: null,
      success: 'Registration successful! You can now sign in.',
      formData: {
        firstName: '',
        lastName: '',
        email: ''
      }
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).render('register', {
        error: 'This email address is already registered.',
        success: null,
        formData: trimmed
      });
    }

    console.error('Registration error:', error);
    return res.status(500).render('register', {
      error: 'Something went wrong while saving your registration. Please try again.',
      success: null,
      formData: trimmed
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
