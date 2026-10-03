import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'node:url'

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url))
const databaseName = process.env.DB_NAME || 'Birthday'

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.')
}

export async function createDatabasePool() {
  const credentials = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  }
  const bootstrap = await mysql.createConnection(credentials)
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await bootstrap.end()

  const pool = mysql.createPool({
    ...credentials,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    charset: 'utf8mb4',
  })
  await pool.query(await readFile(schemaPath, 'utf8'))
  return pool
}
