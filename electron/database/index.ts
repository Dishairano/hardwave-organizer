import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// Database instance
let db: Database.Database | null = null

// Get database path in user data directory
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'fl-organizer.db')
}

// Initialize database
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  console.log('Initializing database at:', dbPath)

  // Create database
  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Performance optimizations
  db.pragma('journal_mode = WAL') // Write-Ahead Logging for better concurrency
  db.pragma('synchronous = NORMAL') // Balance between safety and speed
  db.pragma('cache_size = -64000') // 64MB cache
  db.pragma('temp_store = MEMORY') // Use memory for temp tables

  // Read and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')

  // Execute schema (split by semicolons and execute each statement)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const statement of statements) {
    try {
      db.exec(statement)
    } catch (error) {
      console.error('Error executing schema statement:', error)
      throw error
    }
  }

  console.log('Database initialized successfully')
  return db
}

// Get database instance
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase()
  }
  return db
}

// Close database
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database closed')
  }
}

// Export database path for debugging
export { getDatabasePath }
