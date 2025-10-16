export function formatCommitVersion(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0.00';
  const major = Math.floor(n / 100);
  const minor = n % 100;
  return `${major}.${minor.toString().padStart(2, '0')}`;
}
