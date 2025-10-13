import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDirectory = path.resolve(__dirname, '..');
const configDirectory = path.resolve(rootDirectory, 'config');
const configFile = path.resolve(configDirectory, 'database.config.json');

const createDefaultConfig = () => ({
  driver: 'file',
  databasePath: './data/app.db',
  databasePassword: crypto.randomBytes(24).toString('hex')
});

export const ensureDatabaseConfig = async () => {
  await fs.mkdir(configDirectory, { recursive: true });

  try {
    const raw = await fs.readFile(configFile, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed?.databasePath || !parsed?.databasePassword) {
      throw new Error('Database configuration missing required fields.');
    }

    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Regenerating database configuration due to error:', error.message);
    }

    const config = createDefaultConfig();
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }
};

export const getConfigFilePath = () => configFile;
