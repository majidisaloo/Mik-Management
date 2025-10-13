import initializeDatabase, { resolveDatabaseFile } from '../database.js';
import { ensureDatabaseConfig, getConfigFilePath } from '../config.js';

const run = async () => {
  const config = await ensureDatabaseConfig();
  const databaseFile = resolveDatabaseFile(config.databasePath);

  const db = await initializeDatabase(config.databasePath);
  await db.close();

  console.log('File-backed database is ready.');
  console.log(`Data file: ${databaseFile}`);
  console.log(`Configuration file: ${getConfigFilePath()}`);
  console.log('Next step: start the API with "npm run start".');
};

run().catch((error) => {
  console.error('Unable to prepare the database:', error);
  process.exit(1);
});
