import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

let cachedVersion = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const formatVersion = (count) => {
  if (!Number.isInteger(count) || count < 0) {
    return '0.0';
  }

  return `0.${count}`;
};

export const getProjectVersion = () => {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const output = execSync('git rev-list --count HEAD', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();

    const commitCount = Number.parseInt(output, 10);
    cachedVersion = formatVersion(commitCount);
  } catch (error) {
    cachedVersion = '0.0';
  }

  return cachedVersion;
};

export default getProjectVersion;
