import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(repoRoot, 'VERSION');

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

// Get stable version from file
export const getStableVersion = () => {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const version = fs.readFileSync(VERSION_FILE, 'utf8').trim();
      return version;
    }
  } catch (error) {
    console.error('Error reading stable version:', error);
  }
  
  // Fallback: use current commit count as stable
  const commitCount = getCommitCount();
  return formatVersion(commitCount);
};

// Set stable version
export const setStableVersion = (version) => {
  try {
    fs.writeFileSync(VERSION_FILE, version);
    console.log(`Stable version set to: ${version}`);
    return true;
  } catch (error) {
    console.error('Error setting stable version:', error);
    return false;
  }
};

// Get beta version (current commit count)
export const getBetaVersion = () => {
  const commitCount = getCommitCount();
  return formatVersion(commitCount);
};

// Check if beta is ahead of stable
export const isBetaAhead = () => {
  const stableVersion = getStableVersion();
  const betaVersion = getBetaVersion();
  
  // Extract commit counts from versions
  const stableCommitCount = extractCommitCountFromVersion(stableVersion);
  const betaCommitCount = getCommitCount();
  
  return betaCommitCount > stableCommitCount;
};

// Extract commit count from version string
const extractCommitCountFromVersion = (version) => {
  const match = version.match(/v(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    return major * 100 + minor;
  }
  return 0;
};

// Promote beta to stable (create release)
export const promoteBetaToStable = () => {
  const betaVersion = getBetaVersion();
  const success = setStableVersion(betaVersion);
  
  if (success) {
    // Create git tag for the release
    try {
      execSync(`git tag ${betaVersion}`, { cwd: repoRoot });
      console.log(`Created git tag: ${betaVersion}`);
    } catch (error) {
      console.error('Error creating git tag:', error);
    }
  }
  
  return success;
};

// Get version info for API
export const getVersionInfo = () => {
  const stableVersion = getStableVersion();
  const betaVersion = getBetaVersion();
  const isAhead = isBetaAhead();
  
  return {
    stableVersion,
    betaVersion,
    currentVersion: stableVersion, // Default to stable
    isBetaAhead: isAhead,
    commitCount: getCommitCount()
  };
};
