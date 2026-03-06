#!/usr/bin/env node
// Restores database from backend/dump.sql using .env credentials
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const dumpFile = path.join(__dirname, '..', 'dump.sql');

if (!fs.existsSync(dumpFile)) {
  console.error('Error: dump.sql not found. Run "npm run db:dump" first.');
  process.exit(1);
}

const passArg = DB_PASSWORD ? `-p${DB_PASSWORD}` : '';

// Create DB if not exists
console.log(`Creating database "${DB_NAME}" if not exists...`);
execSync(`mysql -h ${DB_HOST || 'localhost'} -u ${DB_USER || 'root'} ${passArg} -e "CREATE DATABASE IF NOT EXISTS \\\`${DB_NAME}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"`, { shell: true });

// Restore dump
console.log(`Restoring dump.sql into "${DB_NAME}"...`);
try {
  execSync(`mysql -h ${DB_HOST || 'localhost'} -u ${DB_USER || 'root'} ${passArg} ${DB_NAME} < ${dumpFile}`, { stdio: 'inherit', shell: true });
  console.log('Done. Database restored from dump.sql');
} catch (err) {
  console.error('Error restoring dump');
  process.exit(1);
}
