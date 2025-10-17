#!/usr/bin/env node

import { execSync } from 'child_process';

// Get commit count
const commitCount = execSync('git rev-list --count HEAD').toString().trim();
console.log('Current commit count:', commitCount);

// Format version
const formatCommitVersion = (commitCount) => {
  const count = Number(commitCount);
  if (!Number.isInteger(count) || count < 0) {
    return '0.0';
  }

  const major = Math.floor(count / 100) + 1;
  const minor = count % 100;
  
  return `${major}.${minor.toString().padStart(2, '0')}`;
};

const version = formatCommitVersion(commitCount);
console.log('Calculated version:', version);
console.log('Expected for 217 commits: 3.17');
