import { getDatabase } from './index'
import type { File, Tag, Collection, SearchQuery, SearchResults } from '../../src/types'

// ============================================================================
// FILE QUERIES
// ============================================================================

export function getAllFiles(limit = 100, offset = 0): File[] {
  const db = getDatabase()

  // Verify table exists
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='files'").get()
    if (!tableCheck) {
      console.error('Files table does not exist! Re-initializing database...')
      const { initDatabase } = require('./index')
      initDatabase()
    }
  } catch (e) {
    console.error('Error checking for files table:', e)
  }

  const stmt = db.prepare(`
    SELECT * FROM files
    ORDER BY modified_at DESC
    LIMIT ? OFFSET ?
  `)
  return stmt.all(limit, offset) as File[]
}

export function getFileById(id: number): File | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?')
  const file = stmt.get(id) as File | undefined

  if (!file) return null

  // Get tags for this file
  file.tags = getFileTags(id)

  return file
}

export function insertFile(file: Omit<File, 'id'>): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO files (
      file_path, filename, file_type, file_extension, file_size,
      created_at, modified_at, hash, indexed_at,
      duration, sample_rate, bit_depth, channels,
      bpm, detected_key, detected_scale, energy_level,
      notes, rating, color_code, is_favorite, use_count
    ) VALUES (
      @file_path, @filename, @file_type, @file_extension, @file_size,
      @created_at, @modified_at, @hash, @indexed_at,
      @duration, @sample_rate, @bit_depth, @channels,
      @bpm, @detected_key, @detected_scale, @energy_level,
      @notes, @rating, @color_code, @is_favorite, @use_count
    )
  `)

  const result = stmt.run(file)
  return result.lastInsertRowid as number
}

export function updateFile(id: number, updates: Partial<File>): void {
  const db = getDatabase()

  // Build dynamic update query
  const fields = Object.keys(updates).filter(k => k !== 'id')
  if (fields.length === 0) return

  const setClause = fields.map(f => `${f} = @${f}`).join(', ')
  const sql = `UPDATE files SET ${setClause} WHERE id = @id`

  const stmt = db.prepare(sql)
  stmt.run({ ...updates, id })
}

export function deleteFile(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM files WHERE id = ?')
  stmt.run(id)
}

export function searchFiles(query: SearchQuery): SearchResults {
  const db = getDatabase()
  let sql = 'SELECT DISTINCT f.* FROM files f'
  const params: any[] = []
  const whereClauses: string[] = []

  // Join with tags if filtering by tags
  if (query.filters.tags && query.filters.tags.length > 0) {
    sql += ' INNER JOIN file_tags ft ON f.id = ft.file_id'
    whereClauses.push(`ft.tag_id IN (${query.filters.tags.map(() => '?').join(',')})`)
    params.push(...query.filters.tags)
  }

  // Text search
  if (query.text && query.text.trim()) {
    sql += ' INNER JOIN files_fts fts ON f.id = fts.rowid'
    whereClauses.push('fts MATCH ?')
    params.push(query.text.trim())
  }

  // BPM range filter
  if (query.filters.bpmRange) {
    whereClauses.push('f.bpm BETWEEN ? AND ?')
    params.push(query.filters.bpmRange[0], query.filters.bpmRange[1])
  }

  // Key filter
  if (query.filters.keys && query.filters.keys.length > 0) {
    whereClauses.push(`f.detected_key IN (${query.filters.keys.map(() => '?').join(',')})`)
    params.push(...query.filters.keys)
  }

  // File type filter
  if (query.filters.fileTypes && query.filters.fileTypes.length > 0) {
    whereClauses.push(`f.file_type IN (${query.filters.fileTypes.map(() => '?').join(',')})`)
    params.push(...query.filters.fileTypes)
  }

  // Favorite filter
  if (query.filters.isFavorite !== undefined) {
    whereClauses.push('f.is_favorite = ?')
    params.push(query.filters.isFavorite ? 1 : 0)
  }

  // Rating filter
  if (query.filters.minRating !== undefined) {
    whereClauses.push('f.rating >= ?')
    params.push(query.filters.minRating)
  }

  // Energy filter
  if (query.filters.minEnergy !== undefined) {
    whereClauses.push('f.energy_level >= ?')
    params.push(query.filters.minEnergy)
  }
  if (query.filters.maxEnergy !== undefined) {
    whereClauses.push('f.energy_level <= ?')
    params.push(query.filters.maxEnergy)
  }

  // Build WHERE clause
  if (whereClauses.length > 0) {
    sql += ' WHERE ' + whereClauses.join(' AND ')
  }

  // Sorting
  const sortField = query.sort?.field || 'modified_at'
  const sortDir = query.sort?.direction || 'desc'
  sql += ` ORDER BY f.${sortField} ${sortDir.toUpperCase()}`

  // Pagination
  const limit = query.limit || 100
  const offset = query.offset || 0
  sql += ' LIMIT ? OFFSET ?'
  params.push(limit, offset)

  // Execute query
  const stmt = db.prepare(sql)
  const files = stmt.all(...params) as File[]

  // Get total count (without limit/offset)
  let countSql = sql.replace(/SELECT DISTINCT f\.\*/i, 'SELECT COUNT(DISTINCT f.id) as count')
  countSql = countSql.replace(/ORDER BY.*$/i, '').replace(/LIMIT.*$/i, '')
  const countStmt = db.prepare(countSql)
  const countResult = countStmt.get(...params.slice(0, -2)) as { count: number }

  return {
    files,
    total: countResult.count,
    query,
  }
}

// ============================================================================
// TAG QUERIES
// ============================================================================

export function getAllTags(): Tag[] {
  const db = getDatabase()

  // Verify table exists
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").get()
    if (!tableCheck) {
      console.error('Tags table does not exist! Re-initializing database...')
      const { initDatabase } = require('./index')
      initDatabase()
    }
  } catch (e) {
    console.error('Error checking for tags table:', e)
  }

  const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC')
  return stmt.all() as Tag[]
}

export function getFileTags(fileId: number): Tag[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN file_tags ft ON t.id = ft.tag_id
    WHERE ft.file_id = ?
  `)
  return stmt.all(fileId) as Tag[]
}

export function createTag(tag: Omit<Tag, 'id'>): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO tags (name, category, color, created_at)
    VALUES (@name, @category, @color, @created_at)
  `)
  const result = stmt.run(tag)
  return result.lastInsertRowid as number
}

export function addFileTag(fileId: number, tagId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)')
  stmt.run(fileId, tagId)
}

export function removeFileTag(fileId: number, tagId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?')
  stmt.run(fileId, tagId)
}

export function bulkAddFileTags(fileIds: number[], tagIds: number[]): void {
  const db = getDatabase()
  const stmt = db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)')

  const transaction = db.transaction(() => {
    for (const fileId of fileIds) {
      for (const tagId of tagIds) {
        stmt.run(fileId, tagId)
      }
    }
  })

  transaction()
}

export function deleteTag(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?')
  stmt.run(id)
}

// ============================================================================
// COLLECTION QUERIES
// ============================================================================

export function getAllCollections(): Collection[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT
      c.*,
      COUNT(cf.file_id) as file_count
    FROM collections c
    LEFT JOIN collection_files cf ON c.id = cf.collection_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `)
  return stmt.all() as Collection[]
}

export function createCollection(collection: Omit<Collection, 'id' | 'file_count'>): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO collections (name, description, color, icon, created_at, updated_at, is_smart, smart_query)
    VALUES (@name, @description, @color, @icon, @created_at, @updated_at, @is_smart, @smart_query)
  `)
  const result = stmt.run(collection)
  return result.lastInsertRowid as number
}

export function addFilesToCollection(collectionId: number, fileIds: number[]): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO collection_files (collection_id, file_id, added_at)
    VALUES (?, ?, ?)
  `)

  const now = Date.now()
  const transaction = db.transaction(() => {
    for (const fileId of fileIds) {
      stmt.run(collectionId, fileId, now)
    }
  })

  transaction()
}

export function removeFilesFromCollection(collectionId: number, fileIds: number[]): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM collection_files WHERE collection_id = ? AND file_id = ?')

  const transaction = db.transaction(() => {
    for (const fileId of fileIds) {
      stmt.run(collectionId, fileId)
    }
  })

  transaction()
}

export function getCollectionFiles(collectionId: number): File[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT f.* FROM files f
    INNER JOIN collection_files cf ON f.id = cf.file_id
    WHERE cf.collection_id = ?
    ORDER BY cf.added_at DESC
  `)
  return stmt.all(collectionId) as File[]
}

// ============================================================================
// STATISTICS
// ============================================================================

export function getDatabaseStats() {
  const db = getDatabase()

  const fileCount = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }
  const tagCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
  const collectionCount = db.prepare('SELECT COUNT(*) as count FROM collections').get() as { count: number }
  const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM files WHERE is_favorite = 1').get() as { count: number }

  return {
    totalFiles: fileCount.count,
    totalTags: tagCount.count,
    totalCollections: collectionCount.count,
    totalFavorites: favoriteCount.count,
  }
}
