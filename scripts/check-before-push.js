const path = require('path');
const { spawnSync } = require('child_process');

const repoDir = path.resolve(__dirname, '..');
const build = spawnSync(process.execPath, [path.join(repoDir, 'frontend/scripts/build.js')], {
  cwd: repoDir,
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'backend/build'], {
  cwd: repoDir,
  encoding: 'utf8',
});
if (status.error) throw status.error;
if (status.status !== 0) process.exit(status.status || 1);
if (status.stdout.trim()) {
  console.error('Push stopped: commit the freshly generated backend/build first.');
  console.error('Run: git add -A -- backend/build');
  console.error('Then commit and retry git push.');
  process.exit(1);
}
console.log('Production build matches the committed files; push may proceed.');
