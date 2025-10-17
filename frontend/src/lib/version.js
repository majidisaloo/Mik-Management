export const formatCommitVersion = (commitCount) => {
  if (!Number.isInteger(commitCount) || commitCount < 0) {
    console.warn('Invalid commit count:', commitCount);
    return '0.0';
  }

  // Format as v1.xx where xx is the commit count
  const major = Math.floor(commitCount / 100) + 1;
  const minor = commitCount % 100;
  
  const version = `${major}.${minor.toString().padStart(2, '0')}`;
  console.log(`Version calculation: ${commitCount} commits -> v${version}`);
  
  return version;
};

export const getVersion = () => {
  const commitCount = Number(import.meta.env.VITE_COMMIT_COUNT ?? 0);
  return formatCommitVersion(commitCount);
};
