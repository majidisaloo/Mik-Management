export const formatCommitVersion = (commitCount, channel = 'beta') => {
  if (!Number.isInteger(commitCount) || commitCount < 0) {
    console.warn('Invalid commit count:', commitCount);
    return '0.0';
  }

  // Format as vX.XX where X.XX is the commit count divided by 100
  // 216 commits -> 2.16, 320 commits -> 3.20
  const major = Math.floor(commitCount / 100);
  const minor = commitCount % 100;
  
  const version = `${major}.${minor.toString().padStart(2, '0')}`;
  const suffix = channel === 'beta' ? '-beta' : '';
  
  console.log(`Version calculation: ${commitCount} commits -> v${version}${suffix} (${channel})`);
  
  return `${version}${suffix}`;
};

export const getVersion = () => {
  const commitCount = Number(import.meta.env.VITE_COMMIT_COUNT ?? 0);
  return formatCommitVersion(commitCount);
};
