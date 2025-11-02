import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Get current commit count
export const getCommitCount = () => {
  try {
    const output = execSync('git rev-list --count HEAD', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
    return Number.parseInt(output, 10);
  } catch (error) {
    console.error('Error getting commit count:', error);
    return 0;
  }
};

// Format version from commit count
export const formatVersion = (commitCount) => {
  const major = Math.floor(commitCount / 100);
  const minor = commitCount % 100;
  return `v${major}.${minor.toString().padStart(2, '0')}`;
};

// Get current version (based on commit count)
export const getCurrentVersion = () => {
  const commitCount = getCommitCount();
  return formatVersion(commitCount);
};

// Get version info for API (simplified - single version)
export const getVersionInfo = () => {
  const currentVersion = getCurrentVersion();
  
  return {
    currentVersion,
    latestVersion: currentVersion,
    commitCount: getCommitCount()
  };
};

// Legacy exports for backward compatibility (deprecated)
export const getStableVersion = getCurrentVersion;
export const getBetaVersion = getCurrentVersion;
export const isBetaAhead = () => false;
export const setStableVersion = () => false;
export const promoteBetaToStable = () => false;
