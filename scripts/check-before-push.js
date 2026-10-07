const path = require('path');
const { spawnSync } = require('child_process');

const repoDir = path.resolve(__dirname, '..');
const dump = spawnSync(process.execPath, [path.join(repoDir, 'backend/scripts/db-dump.js')], {
  cwd: repoDir,
  stdio: 'inherit',
});
if (dump.error) throw dump.error;
if (dump.status !== 0) process.exit(dump.status || 1);

const build = spawnSync(process.execPath, [path.join(repoDir, 'frontend/scripts/build.js')], {
  cwd: repoDir,
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'backend/build', 'backend/dump.sql'], {
  cwd: repoDir,
  encoding: 'utf8',
});
if (status.error) throw status.error;
if (status.status !== 0) process.exit(status.status || 1);
if (status.stdout.trim()) {
  console.error('Push stopped: commit the fresh backend/build and backend/dump.sql first.');
  console.error('Run: git add -A -- backend/build backend/dump.sql');
  console.error('Then commit and retry git push.');
  process.exit(1);
}
console.log('Production build and database dump match the committed files; push may proceed.');
