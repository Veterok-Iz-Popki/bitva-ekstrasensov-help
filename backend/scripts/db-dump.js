#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const outFile = path.join(__dirname, '..', 'dump.sql');
const tempFile = `${outFile}.tmp`;
const portableDump = path.join(__dirname, '../../.local/mariadb-11.4.11-winx64/bin/mariadb-dump.exe');
const executable = process.env.DB_DUMP_BIN || (fs.existsSync(portableDump) ? portableDump : 'mysqldump');
let descriptor;
try {
  if (!process.env.DB_NAME) throw new Error('Set DB_NAME in backend/.env');
  descriptor = fs.openSync(tempFile, 'w');
  const result = spawnSync(executable, [
    '--host', process.env.DB_HOST || 'localhost',
    '--port', process.env.DB_PORT || '3306',
    '--user', process.env.DB_USER || 'root',
    '--default-character-set=utf8mb4',
    '--single-transaction', '--routines', '--triggers',
    '--skip-comments', '--skip-dump-date', '--order-by-primary',
    process.env.DB_NAME,
  ], {
    env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' },
    stdio: ['ignore', descriptor, 'inherit'],
  });
  fs.closeSync(descriptor);
  descriptor = undefined;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Database export failed (exit ${result.status})`);
  if (!fs.statSync(tempFile).size) throw new Error('Database export is empty');
  // MariaDB's client-only sandbox header breaks older mysql clients; it is not SQL data.
  const sql = fs.readFileSync(tempFile, 'utf8')
    .replace(/^\/\*M!999999\\- enable the sandbox mode \*\/[ \t]*\r?\n/, '')
    .trimEnd();
  fs.writeFileSync(tempFile, `${sql}\n`, 'utf8');
  fs.renameSync(tempFile, outFile);
  console.log('Full local database exported to backend/dump.sql.');
} catch (error) {
  if (descriptor !== undefined) fs.closeSync(descriptor);
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  console.error(error.message);
  process.exit(1);
}
