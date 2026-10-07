const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frontendDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(frontendDir, '..');
const buildDir = path.resolve(repoDir, 'backend', 'build');
process.chdir(frontendDir);

// Match CRA's production environment-file precedence before checking the API URL.
process.env.NODE_ENV = 'production';
require('react-scripts/config/env');
if (process.env.REACT_APP_BACKEND_URL === undefined) {
  console.error('Set REACT_APP_BACKEND_URL in frontend/.env.production.local or the environment (an empty string means same-origin API).');
  process.exit(1);
}

const craco = require.resolve('@craco/craco/dist/bin/craco.js');
// Delete only the fixed repository build directory; never accept a deletion path from the environment.
if (buildDir !== path.join(repoDir, 'backend', 'build') || fs.lstatSync(path.dirname(buildDir)).isSymbolicLink()) {
  throw new Error('Unsafe build directory');
}
if (fs.existsSync(buildDir) && fs.lstatSync(buildDir).isSymbolicLink()) {
  throw new Error('Build directory must not be a symbolic link');
}
fs.rmSync(buildDir, { recursive: true, force: true });
const env = { ...process.env, BUILD_PATH: buildDir };
for (const args of [[craco, 'build'], [path.join(__dirname, 'postbuild-rename-index.js')]]) {
  const result = spawnSync(process.execPath, args, { cwd: frontendDir, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

for (const file of ['index.template.html', 'asset-manifest.json']) {
  if (!fs.existsSync(path.join(buildDir, file))) throw new Error(`Missing build artifact: ${file}`);
}
console.log('Fresh production build is ready in backend/build.');
