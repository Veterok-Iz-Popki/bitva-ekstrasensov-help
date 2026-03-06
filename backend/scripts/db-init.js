#!/usr/bin/env node
// Creates database and tables from schema.sql using .env credentials
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  // Connect without database to create it
  const conn = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  console.log(`Creating database "${DB_NAME}"...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Remove USE statement from schema (we already selected the DB)
  const cleanSchema = schema.replace(/^USE\s+\w+;\s*/im, '');
  await conn.query(cleanSchema);

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`Done. Tables created: ${tables.length}`);
  tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));

  await conn.end();
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
