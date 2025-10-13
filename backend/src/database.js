import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultState = () => ({
  lastUserId: 0,
  users: []
});

export const resolveDatabaseFile = (databasePath = './data/app.db') => {
  if (!databasePath) {
    throw new Error('Database path must be provided.');
  }

  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(__dirname, '..', databasePath);
};

const ensureDirectory = async (databaseFile) => {
  const directory = path.dirname(databaseFile);
  await fs.mkdir(directory, { recursive: true });
};

const readDatabase = async (databaseFile) => {
  try {
    const raw = await fs.readFile(databaseFile, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.users)) {
      data.users = [];
    }

    if (!Number.isInteger(data.lastUserId)) {
      data.lastUserId = data.users.reduce((max, user) => Math.max(max, Number.parseInt(user.id, 10) || 0), 0);
    }

    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialState = defaultState();
      await fs.writeFile(databaseFile, JSON.stringify(initialState, null, 2), 'utf-8');
      return initialState;
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        `Unable to parse the database at ${databaseFile}. Remove the file and rerun \"npm run prepare:db\" to re-initialize it.`
      );
    }

    throw error;
  }
};

const writeDatabase = async (databaseFile, data) => {
  await fs.writeFile(databaseFile, JSON.stringify(data, null, 2), 'utf-8');
};

const initializeDatabase = async (databasePath) => {
  const databaseFile = resolveDatabaseFile(databasePath);

  await ensureDirectory(databaseFile);
  await readDatabase(databaseFile);

  const load = () => readDatabase(databaseFile);
  const persist = (state) => writeDatabase(databaseFile, state);

  return {
    async createUser({ firstName, lastName, email, passwordHash }) {
      const state = await load();
      const existing = state.users.find((user) => user.email === email);

      if (existing) {
        return { success: false, reason: 'duplicate-email' };
      }

      const nextId = (Number.isInteger(state.lastUserId) ? state.lastUserId : 0) + 1;
      const createdAt = new Date().toISOString();
      const user = {
        id: nextId,
        firstName,
        lastName,
        email,
        passwordHash,
        createdAt
      };

      state.users.push(user);
      state.lastUserId = nextId;
      await persist(state);

      return { success: true, user };
    },

    async findUserByEmail(email) {
      const state = await load();
      return state.users.find((user) => user.email === email) ?? null;
    },

    async getUserById(id) {
      const state = await load();
      return state.users.find((user) => user.id === id) ?? null;
    },

    async updateUser(id, { firstName, lastName, email }) {
      const state = await load();
      const index = state.users.findIndex((user) => user.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const duplicateEmail = state.users.some((user, position) => position !== index && user.email === email);

      if (duplicateEmail) {
        return { success: false, reason: 'duplicate-email' };
      }

      const existing = state.users[index];
      const updatedUser = {
        ...existing,
        firstName,
        lastName,
        email
      };

      state.users[index] = updatedUser;
      await persist(state);

      return { success: true, user: updatedUser };
    },

    async close() {
      return Promise.resolve();
    }
  };
};

export default initializeDatabase;
