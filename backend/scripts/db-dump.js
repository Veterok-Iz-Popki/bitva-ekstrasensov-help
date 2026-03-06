#!/usr/bin/env node
// Dumps the database to backend/dump.sql using .env credentials
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const outFile = path.join(__dirname, '..', 'dump.sql');

const passArg = DB_PASSWORD ? `-p${DB_PASSWORD}` : '';
const cmd = `mysqldump -h ${DB_HOST || 'localhost'} -u ${DB_USER || 'root'} ${passArg} --default-character-set=utf8mb4 --single-transaction --routines --triggers ${DB_NAME} > ${outFile}`;

console.log(`Dumping database "${DB_NAME}" to dump.sql...`);
try {
  execSync(cmd, { stdio: 'inherit', shell: true });
  console.log(`Done. Dump saved to: dump.sql`);
} catch (err) {
  console.error('Error creating dump');
  process.exit(1);
}
