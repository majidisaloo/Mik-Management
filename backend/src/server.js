import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import initializeDatabase, { resolveDatabaseFile } from './database.js';
import { ensureDatabaseConfig, getConfigFilePath } from './config.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pepperPassword = (password, secret) => `${password}${secret}`;

const hashPassword = (password, secret) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(pepperPassword(password, secret), salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password, secret, storedHash) => {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }

  const [salt, knownHash] = storedHash.split(':');
  if (!salt || !knownHash) {
    return false;
  }

  const comparisonHash = crypto
    .pbkdf2Sync(pepperPassword(password, secret), salt, 120000, 64, 'sha512')
    .toString('hex');

  const knownBuffer = Buffer.from(knownHash, 'hex');
  const comparisonBuffer = Buffer.from(comparisonHash, 'hex');

  if (knownBuffer.length !== comparisonBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(knownBuffer, comparisonBuffer);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders
  });
  res.end(body);
};

const sendNoContent = (res) => {
  res.writeHead(204, corsHeaders);
  res.end();
};

const parseJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk.toString();

      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });

const mapUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  createdAt: user.createdAt
});

const bootstrap = async () => {
  const config = await ensureDatabaseConfig();
  const databaseFile = resolveDatabaseFile(config.databasePath);
  const db = await initializeDatabase(config.databasePath);

  const port = Number.parseInt(process.env.PORT ?? '4000', 10) || 4000;

  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { message: 'Malformed request.' });
      return;
    }

    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      sendNoContent(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    const handleRegister = async () => {
      const body = await parseJsonBody(req);
      const { firstName, lastName, email, password, passwordConfirmation } = body ?? {};

      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      const normalizedEmail = normalizeString(email).toLowerCase();
      const rawPassword = typeof password === 'string' ? password : '';

      if (!normalizedFirstName) {
        sendJson(res, 400, { message: 'First name is required.' });
        return;
      }

      if (!normalizedLastName) {
        sendJson(res, 400, { message: 'Last name is required.' });
        return;
      }

      if (!normalizedEmail) {
        sendJson(res, 400, { message: 'Email is required.' });
        return;
      }

      if (!emailPattern.test(normalizedEmail)) {
        sendJson(res, 400, { message: 'Email must follow the format name@example.com.' });
        return;
      }

      if (!rawPassword) {
        sendJson(res, 400, { message: 'Password is required.' });
        return;
      }

      if (rawPassword.length < 8) {
        sendJson(res, 400, { message: 'Password must be at least 8 characters long.' });
        return;
      }

      if (passwordConfirmation !== undefined && rawPassword !== passwordConfirmation) {
        sendJson(res, 400, { message: 'Passwords must match.' });
        return;
      }

      try {
        const passwordHash = hashPassword(rawPassword, config.databasePassword);
        const result = await db.createUser({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          passwordHash
        });

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'This email is already registered.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create user.');
        }

        sendJson(res, 201, { message: 'User registered successfully.' });
      } catch (error) {
        console.error('Registration error', error);
        sendJson(res, 500, {
          message: 'Registration failed unexpectedly. Please review your input and try again.'
        });
      }
    };

    const handleLogin = async () => {
      const body = await parseJsonBody(req);
      const { email, password } = body ?? {};

      const normalizedEmail = normalizeString(email).toLowerCase();
      const rawPassword = typeof password === 'string' ? password : '';

      if (!normalizedEmail || !rawPassword) {
        sendJson(res, 400, { message: 'Email and password are required.' });
        return;
      }

      try {
        const user = await db.findUserByEmail(normalizedEmail);

        if (!user) {
          sendJson(res, 401, { message: 'Invalid credentials.' });
          return;
        }

        const passwordIsValid = verifyPassword(rawPassword, config.databasePassword, user.passwordHash);

        if (!passwordIsValid) {
          sendJson(res, 401, { message: 'Invalid credentials.' });
          return;
        }

        sendJson(res, 200, { message: 'Login successful.', user: mapUser(user) });
      } catch (error) {
        console.error('Login error', error);
        sendJson(res, 500, { message: 'Unexpected error. Please try again.' });
      }
    };

    const handleGetUser = async (userId) => {
      if (!Number.isInteger(userId) || userId <= 0) {
        sendJson(res, 400, { message: 'A valid user id is required.' });
        return;
      }

      try {
        const user = await db.getUserById(userId);

        if (!user) {
          sendJson(res, 404, { message: 'User not found.' });
          return;
        }

        sendJson(res, 200, { user: mapUser(user) });
      } catch (error) {
        console.error('Fetch user error', error);
        sendJson(res, 500, { message: 'Unable to load the requested user.' });
      }
    };

    const handleUpdateUser = async (userId) => {
      const body = await parseJsonBody(req);
      const { firstName, lastName, email } = body ?? {};

      if (!Number.isInteger(userId) || userId <= 0) {
        sendJson(res, 400, { message: 'A valid user id is required.' });
        return;
      }

      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      const normalizedEmail = normalizeString(email).toLowerCase();

      if (!normalizedFirstName) {
        sendJson(res, 400, { message: 'First name is required.' });
        return;
      }

      if (!normalizedLastName) {
        sendJson(res, 400, { message: 'Last name is required.' });
        return;
      }

      if (!normalizedEmail) {
        sendJson(res, 400, { message: 'Email is required.' });
        return;
      }

      if (!emailPattern.test(normalizedEmail)) {
        sendJson(res, 400, { message: 'Email must follow the format name@example.com.' });
        return;
      }

      try {
        const result = await db.updateUser(userId, {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'User not found.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'Another account already uses this email address.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update user.');
        }

        sendJson(res, 200, { message: 'User updated successfully.', user: mapUser(result.user) });
      } catch (error) {
        console.error('Update user error', error);
        sendJson(res, 500, { message: 'Unable to update the user at this time.' });
      }
    };

    try {
      if (method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (method === 'GET' && pathname === '/api/config-info') {
        sendJson(res, 200, {
          database: {
            driver: config.driver,
            file: databaseFile,
            configFile: getConfigFilePath()
          }
        });
        return;
      }

      if (method === 'POST' && pathname === '/api/register') {
        await handleRegister();
        return;
      }

      if (method === 'POST' && pathname === '/api/login') {
        await handleLogin();
        return;
      }

      if (pathname.startsWith('/api/users/')) {
        const idSegment = pathname.split('/')[3];
        const userId = Number.parseInt(idSegment, 10);

        if (method === 'GET') {
          await handleGetUser(userId);
          return;
        }

        if (method === 'PUT') {
          await handleUpdateUser(userId);
          return;
        }
      }

      sendJson(res, 404, { message: 'Not found.' });
    } catch (error) {
      console.error('Request handling error', error);
      sendJson(res, 500, { message: 'Unexpected server error.' });
    }
  });

  server.listen(port, () => {
    console.log(`API server ready at http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
