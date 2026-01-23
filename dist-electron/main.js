"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");
const crypto = require("crypto");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
let Database;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.error("Failed to load better-sqlite3:", e);
  throw e;
}
let db = null;
function getDatabasePath() {
  const userDataPath = electron.app.getPath("userData");
  return path.join(userDataPath, "fl-organizer.db");
}
function initDatabase() {
  if (db) return db;
  const dbPath = getDatabasePath();
  console.log("Initializing database at:", dbPath);
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000");
  db.pragma("temp_store = MEMORY");
  const schema = `
-- FL Studio Organizer Database Schema
-- SQLite3 Database

-- Core file registry
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('sample', 'project', 'preset', 'midi', 'kickchain')),
  file_extension TEXT NOT NULL,
  file_size INTEGER,
  created_at INTEGER,
  modified_at INTEGER,
  last_accessed INTEGER,
  hash TEXT,
  indexed_at INTEGER NOT NULL,

  -- Audio metadata
  duration REAL,
  sample_rate INTEGER,
  bit_depth INTEGER,
  channels INTEGER,

  -- Musical metadata
  bpm REAL,
  detected_key TEXT,
  detected_scale TEXT,
  energy_level INTEGER,

  -- Custom fields
  notes TEXT,
  rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
  color_code TEXT,
  is_favorite INTEGER DEFAULT 0 CHECK(is_favorite IN (0, 1)),
  use_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_bpm ON files(bpm);
CREATE INDEX IF NOT EXISTS idx_files_key ON files(detected_key);
CREATE INDEX IF NOT EXISTS idx_files_favorite ON files(is_favorite);
CREATE INDEX IF NOT EXISTS idx_files_modified ON files(modified_at);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);

-- Full-text search on filenames and notes
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  filename,
  notes,
  content='files',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, filename, notes) VALUES (new.id, new.filename, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files BEGIN
  UPDATE files_fts SET filename = new.filename, notes = new.notes WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files BEGIN
  DELETE FROM files_fts WHERE rowid = old.id;
END;

-- Tags system
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK(category IN ('genre', 'instrument', 'energy', 'custom')),
  color TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Many-to-many relationship for file tags
CREATE TABLE IF NOT EXISTS file_tags (
  file_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (file_id, tag_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_smart INTEGER DEFAULT 0 CHECK(is_smart IN (0, 1)),
  smart_query TEXT
);

CREATE TABLE IF NOT EXISTS collection_files (
  collection_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  sort_order INTEGER,
  PRIMARY KEY (collection_id, file_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collection_files_collection ON collection_files(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_files_file ON collection_files(file_id);

-- Kickchains (special composite files)
CREATE TABLE IF NOT EXISTS kickchains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bpm REAL,
  notes TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kickchain_layers (
  kickchain_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  layer_order INTEGER NOT NULL,
  volume REAL DEFAULT 1.0 CHECK(volume >= 0 AND volume <= 2.0),
  notes TEXT,
  PRIMARY KEY (kickchain_id, layer_order),
  FOREIGN KEY (kickchain_id) REFERENCES kickchains(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Watched folders
CREATE TABLE IF NOT EXISTS watched_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  auto_tag_pattern TEXT,
  added_at INTEGER NOT NULL,
  last_scanned INTEGER
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  filters TEXT,
  result_count INTEGER,
  searched_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_history_date ON search_history(searched_at);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default tag presets for harder-styles
INSERT OR IGNORE INTO tags (name, category, color, created_at) VALUES
  ('Hardstyle', 'genre', '#FF00AA', strftime('%s', 'now')),
  ('Rawstyle', 'genre', '#FF0044', strftime('%s', 'now')),
  ('Hardcore', 'genre', '#FF3366', strftime('%s', 'now')),
  ('Uptempo', 'genre', '#AA00FF', strftime('%s', 'now')),
  ('Euphoric', 'genre', '#00D4FF', strftime('%s', 'now')),

  ('Kick', 'instrument', '#FF4466', strftime('%s', 'now')),
  ('Lead', 'instrument', '#00FFDD', strftime('%s', 'now')),
  ('Screech', 'instrument', '#FF8833', strftime('%s', 'now')),
  ('Atmosphere', 'instrument', '#0088FF', strftime('%s', 'now')),
  ('Vocal', 'instrument', '#FF00CC', strftime('%s', 'now')),
  ('FX', 'instrument', '#00FF88', strftime('%s', 'now')),

  ('High Energy', 'energy', '#FF0055', strftime('%s', 'now')),
  ('Medium Energy', 'energy', '#FFAA00', strftime('%s', 'now')),
  ('Low Energy', 'energy', '#00FF88', strftime('%s', 'now'));
  `;
  console.log("Executing database schema...");
  const statements = schema.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
  console.log(`Total statements to execute: ${statements.length}`);
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      db.exec(statement);
      console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
    } catch (error) {
      console.error(`✗ Error executing statement ${i + 1}/${statements.length}:`, error);
      console.error("Failed statement:", statement.substring(0, 100));
      throw error;
    }
  }
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Created tables:", tables.map((t) => t.name).join(", "));
  console.log("Database initialized successfully");
  return db;
}
function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log("Database closed");
  }
}
function getAllFiles(limit = 100, offset = 0) {
  const db2 = getDatabase();
  try {
    const tableCheck = db2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='files'").get();
    if (!tableCheck) {
      console.error("Files table does not exist! Re-initializing database...");
      const { initDatabase: initDatabase2 } = require("./index");
      initDatabase2();
    }
  } catch (e) {
    console.error("Error checking for files table:", e);
  }
  const stmt = db2.prepare(`
    SELECT * FROM files
    ORDER BY modified_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset);
}
function getFileById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM files WHERE id = ?");
  const file = stmt.get(id);
  if (!file) return null;
  file.tags = getFileTags(id);
  return file;
}
function insertFile(file) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
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
  `);
  const result = stmt.run(file);
  return result.lastInsertRowid;
}
function updateFile(id, updates) {
  const db2 = getDatabase();
  const fields = Object.keys(updates).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const sql = `UPDATE files SET ${setClause} WHERE id = @id`;
  const stmt = db2.prepare(sql);
  stmt.run({ ...updates, id });
}
function deleteFile(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM files WHERE id = ?");
  stmt.run(id);
}
function searchFiles(query) {
  var _a, _b;
  const db2 = getDatabase();
  let sql = "SELECT DISTINCT f.* FROM files f";
  const params = [];
  const whereClauses = [];
  if (query.filters.tags && query.filters.tags.length > 0) {
    sql += " INNER JOIN file_tags ft ON f.id = ft.file_id";
    whereClauses.push(`ft.tag_id IN (${query.filters.tags.map(() => "?").join(",")})`);
    params.push(...query.filters.tags);
  }
  if (query.text && query.text.trim()) {
    sql += " INNER JOIN files_fts fts ON f.id = fts.rowid";
    whereClauses.push("fts MATCH ?");
    params.push(query.text.trim());
  }
  if (query.filters.bpmRange) {
    whereClauses.push("f.bpm BETWEEN ? AND ?");
    params.push(query.filters.bpmRange[0], query.filters.bpmRange[1]);
  }
  if (query.filters.keys && query.filters.keys.length > 0) {
    whereClauses.push(`f.detected_key IN (${query.filters.keys.map(() => "?").join(",")})`);
    params.push(...query.filters.keys);
  }
  if (query.filters.fileTypes && query.filters.fileTypes.length > 0) {
    whereClauses.push(`f.file_type IN (${query.filters.fileTypes.map(() => "?").join(",")})`);
    params.push(...query.filters.fileTypes);
  }
  if (query.filters.isFavorite !== void 0) {
    whereClauses.push("f.is_favorite = ?");
    params.push(query.filters.isFavorite ? 1 : 0);
  }
  if (query.filters.minRating !== void 0) {
    whereClauses.push("f.rating >= ?");
    params.push(query.filters.minRating);
  }
  if (query.filters.minEnergy !== void 0) {
    whereClauses.push("f.energy_level >= ?");
    params.push(query.filters.minEnergy);
  }
  if (query.filters.maxEnergy !== void 0) {
    whereClauses.push("f.energy_level <= ?");
    params.push(query.filters.maxEnergy);
  }
  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }
  const sortField = ((_a = query.sort) == null ? void 0 : _a.field) || "modified_at";
  const sortDir = ((_b = query.sort) == null ? void 0 : _b.direction) || "desc";
  sql += ` ORDER BY f.${sortField} ${sortDir.toUpperCase()}`;
  const limit = query.limit || 100;
  const offset = query.offset || 0;
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const stmt = db2.prepare(sql);
  const files = stmt.all(...params);
  let countSql = sql.replace(/SELECT DISTINCT f\.\*/i, "SELECT COUNT(DISTINCT f.id) as count");
  countSql = countSql.replace(/ORDER BY.*$/i, "").replace(/LIMIT.*$/i, "");
  const countStmt = db2.prepare(countSql);
  const countResult = countStmt.get(...params.slice(0, -2));
  return {
    files,
    total: countResult.count,
    query
  };
}
function getAllTags() {
  const db2 = getDatabase();
  try {
    const tableCheck = db2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").get();
    if (!tableCheck) {
      console.error("Tags table does not exist! Re-initializing database...");
      const { initDatabase: initDatabase2 } = require("./index");
      initDatabase2();
    }
  } catch (e) {
    console.error("Error checking for tags table:", e);
  }
  const stmt = db2.prepare("SELECT * FROM tags ORDER BY name ASC");
  return stmt.all();
}
function getFileTags(fileId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN file_tags ft ON t.id = ft.tag_id
    WHERE ft.file_id = ?
  `);
  return stmt.all(fileId);
}
function createTag(tag) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO tags (name, category, color, created_at)
    VALUES (@name, @category, @color, @created_at)
  `);
  const result = stmt.run(tag);
  return result.lastInsertRowid;
}
function bulkAddFileTags(fileIds, tagIds) {
  const db2 = getDatabase();
  const stmt = db2.prepare("INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)");
  const transaction = db2.transaction(() => {
    for (const fileId of fileIds) {
      for (const tagId of tagIds) {
        stmt.run(fileId, tagId);
      }
    }
  });
  transaction();
}
function deleteTag(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM tags WHERE id = ?");
  stmt.run(id);
}
function getAllCollections() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT
      c.*,
      COUNT(cf.file_id) as file_count
    FROM collections c
    LEFT JOIN collection_files cf ON c.id = cf.collection_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  return stmt.all();
}
function createCollection(collection) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO collections (name, description, color, icon, created_at, updated_at, is_smart, smart_query)
    VALUES (@name, @description, @color, @icon, @created_at, @updated_at, @is_smart, @smart_query)
  `);
  const result = stmt.run(collection);
  return result.lastInsertRowid;
}
function addFilesToCollection(collectionId, fileIds) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT OR IGNORE INTO collection_files (collection_id, file_id, added_at)
    VALUES (?, ?, ?)
  `);
  const now = Date.now();
  const transaction = db2.transaction(() => {
    for (const fileId of fileIds) {
      stmt.run(collectionId, fileId, now);
    }
  });
  transaction();
}
function removeFilesFromCollection(collectionId, fileIds) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM collection_files WHERE collection_id = ? AND file_id = ?");
  const transaction = db2.transaction(() => {
    for (const fileId of fileIds) {
      stmt.run(collectionId, fileId);
    }
  });
  transaction();
}
function getCollectionFiles(collectionId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT f.* FROM files f
    INNER JOIN collection_files cf ON f.id = cf.file_id
    WHERE cf.collection_id = ?
    ORDER BY cf.added_at DESC
  `);
  return stmt.all(collectionId);
}
function getDatabaseStats() {
  const db2 = getDatabase();
  const fileCount = db2.prepare("SELECT COUNT(*) as count FROM files").get();
  const tagCount = db2.prepare("SELECT COUNT(*) as count FROM tags").get();
  const collectionCount = db2.prepare("SELECT COUNT(*) as count FROM collections").get();
  const favoriteCount = db2.prepare("SELECT COUNT(*) as count FROM files WHERE is_favorite = 1").get();
  return {
    totalFiles: fileCount.count,
    totalTags: tagCount.count,
    totalCollections: collectionCount.count,
    totalFavorites: favoriteCount.count
  };
}
const AUDIO_EXTENSIONS = [".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"];
const PROJECT_EXTENSIONS = [".flp"];
const MIDI_EXTENSIONS = [".mid", ".midi"];
const PRESET_EXTENSIONS = [".fst", ".nmsv", ".sylenth1", ".serum"];
function getFileType(ext) {
  if (AUDIO_EXTENSIONS.includes(ext)) return "sample";
  if (PROJECT_EXTENSIONS.includes(ext)) return "project";
  if (MIDI_EXTENSIONS.includes(ext)) return "midi";
  if (PRESET_EXTENSIONS.includes(ext)) return "preset";
  return null;
}
async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
async function scanFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileType = getFileType(ext);
    console.log(`Scanning: ${filePath}, ext: ${ext}, type: ${fileType}`);
    if (!fileType) {
      console.log(`Skipping file with unsupported extension: ${ext}`);
      return null;
    }
    const filename = path.basename(filePath);
    const hash = await hashFile(filePath);
    const fileData = {
      file_path: filePath,
      filename,
      file_type: fileType,
      file_extension: ext,
      file_size: stats.size,
      created_at: Math.floor(stats.birthtimeMs),
      modified_at: Math.floor(stats.mtimeMs),
      hash,
      indexed_at: Date.now(),
      // Audio metadata (to be filled by audio analysis)
      duration: void 0,
      sample_rate: void 0,
      bit_depth: void 0,
      channels: void 0,
      // Musical metadata (to be filled by audio analysis)
      bpm: void 0,
      detected_key: void 0,
      detected_scale: void 0,
      energy_level: void 0,
      // Default values
      notes: void 0,
      rating: 0,
      color_code: void 0,
      is_favorite: false,
      use_count: 0
    };
    return fileData;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return null;
  }
}
async function* walkDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }
        yield* walkDirectory(fullPath);
      } else if (entry.isFile()) {
        yield fullPath;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
}
function autoTagFile(filePath) {
  const tags = [];
  const filename = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  if (filename.includes("hardstyle") || dirName.includes("hardstyle")) tags.push("Hardstyle");
  if (filename.includes("rawstyle") || filename.includes("raw") || dirName.includes("rawstyle")) tags.push("Rawstyle");
  if (filename.includes("hardcore") || dirName.includes("hardcore")) tags.push("Hardcore");
  if (filename.includes("uptempo") || dirName.includes("uptempo")) tags.push("Uptempo");
  if (filename.includes("euphoric") || dirName.includes("euphoric")) tags.push("Euphoric");
  if (filename.includes("kick")) tags.push("Kick");
  if (filename.includes("lead")) tags.push("Lead");
  if (filename.includes("screech") || filename.includes("screecher")) tags.push("Screech");
  if (filename.includes("atmosphere") || filename.includes("atmo")) tags.push("Atmosphere");
  if (filename.includes("vocal")) tags.push("Vocal");
  if (filename.includes("fx") || filename.includes("effect")) tags.push("FX");
  const bpmMatch = filename.match(/(\d{3})\s*bpm/i);
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[1]);
    if (bpm >= 140 && bpm <= 155) tags.push("Hardstyle");
    if (bpm >= 150 && bpm <= 160) tags.push("Rawstyle");
    if (bpm >= 160 && bpm <= 180) tags.push("Hardcore");
    if (bpm >= 180) tags.push("Uptempo");
  }
  return tags;
}
async function scanFolder(folderPath, options = {}) {
  const { recursive = true, autoTag = true, onProgress } = options;
  console.log(`========================================`);
  console.log(`Starting scan of folder: ${folderPath}`);
  console.log(`Recursive: ${recursive}, AutoTag: ${autoTag}`);
  console.log(`========================================`);
  const result = {
    indexed: 0,
    duplicates: 0,
    errors: 0,
    files: []
  };
  let filesFound = [];
  if (recursive) {
    for await (const filePath of walkDirectory(folderPath)) {
      filesFound.push(filePath);
    }
  } else {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    filesFound = entries.filter((e) => e.isFile()).map((e) => path.join(folderPath, e.name));
  }
  const total = filesFound.length;
  console.log(`Found ${total} total files in directory`);
  if (onProgress) {
    onProgress({
      total,
      indexed: 0,
      status: "scanning"
    });
  }
  for (let i = 0; i < filesFound.length; i++) {
    const filePath = filesFound[i];
    try {
      const fileData = await scanFile(filePath);
      if (fileData) {
        const fileId = insertFile(fileData);
        if (autoTag) {
          const suggestedTags = autoTagFile(filePath);
          console.log(`Auto-tags for ${fileData.filename}:`, suggestedTags);
        }
        result.indexed++;
        result.files.push({ id: fileId, ...fileData });
      }
      if (onProgress && (i % 10 === 0 || i === filesFound.length - 1)) {
        onProgress({
          total,
          indexed: i + 1,
          current_file: path.basename(filePath),
          status: "scanning"
        });
      }
    } catch (error) {
      result.errors++;
      console.error(`Error processing ${filePath}:`, error);
    }
  }
  if (onProgress) {
    onProgress({
      total,
      indexed: result.indexed,
      status: "complete"
    });
  }
  return result;
}
async function scanFolders(folderPaths, options = {}) {
  const combinedResult = {
    indexed: 0,
    duplicates: 0,
    errors: 0,
    files: []
  };
  for (const folderPath of folderPaths) {
    const result = await scanFolder(folderPath, options);
    combinedResult.indexed += result.indexed;
    combinedResult.duplicates += result.duplicates;
    combinedResult.errors += result.errors;
    combinedResult.files.push(...result.files);
  }
  return combinedResult;
}
let parseFile;
const loadMusicMetadata = async () => {
  if (!parseFile) {
    const mm = await import("music-metadata");
    parseFile = mm.parseFile;
  }
  return parseFile;
};
function mapKey(key) {
  if (!key) return void 0;
  const match = key.match(/^([A-G][#b]?)/);
  return match ? match[1] : void 0;
}
function mapScale(key) {
  if (!key) return void 0;
  if (key.toLowerCase().includes("minor")) return "minor";
  if (key.toLowerCase().includes("major")) return "major";
  return void 0;
}
function estimateEnergyLevel(metadata) {
  const bpm = metadata.common.bpm;
  if (!bpm) return void 0;
  if (bpm >= 180) return 10;
  if (bpm >= 170) return 9;
  if (bpm >= 160) return 8;
  if (bpm >= 155) return 7;
  if (bpm >= 150) return 6;
  if (bpm >= 145) return 5;
  if (bpm >= 140) return 4;
  if (bpm >= 130) return 3;
  if (bpm >= 120) return 2;
  return 1;
}
async function analyzeAudioFile(filePath) {
  try {
    const parse = await loadMusicMetadata();
    const metadata = await parse(filePath, {
      duration: true,
      skipCovers: true
      // Don't parse album art for performance
    });
    const audioMetadata = {
      duration: metadata.format.duration,
      sample_rate: metadata.format.sampleRate,
      bit_depth: metadata.format.bitsPerSample,
      channels: metadata.format.numberOfChannels,
      bpm: metadata.common.bpm,
      detected_key: mapKey(metadata.common.key),
      detected_scale: mapScale(metadata.common.key)
    };
    return audioMetadata;
  } catch (error) {
    console.error(`Error analyzing audio file ${filePath}:`, error);
    return null;
  }
}
async function analyzeAndUpdateFile(fileId, filePath) {
  try {
    const audioData = await analyzeAudioFile(filePath);
    if (!audioData) return false;
    const parse = await loadMusicMetadata();
    const metadata = await parse(filePath, { duration: true, skipCovers: true });
    const energyLevel = estimateEnergyLevel(metadata);
    updateFile(fileId, {
      duration: audioData.duration,
      sample_rate: audioData.sample_rate,
      bit_depth: audioData.bit_depth,
      channels: audioData.channels,
      bpm: audioData.bpm,
      detected_key: audioData.detected_key,
      detected_scale: audioData.detected_scale,
      energy_level: energyLevel
    });
    return true;
  } catch (error) {
    console.error(`Error analyzing and updating file ${fileId}:`, error);
    return false;
  }
}
async function batchAnalyzeFiles(files, onProgress) {
  const result = { success: 0, failed: 0 };
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      const fileName = file.file_path.split(/[\\/]/).pop() || "";
      onProgress(i + 1, files.length, fileName);
    }
    const success = await analyzeAndUpdateFile(file.id, file.file_path);
    if (success) {
      result.success++;
    } else {
      result.failed++;
    }
  }
  return result;
}
const __dirname$1 = path.dirname(url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
if (process.platform === "win32") {
  electron.app.disableHardwareAcceleration();
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0A0A0F",
    frame: true,
    // Windows native frame
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false
    // Don't show until ready
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.on("before-quit", () => {
  closeDatabase();
});
electron.app.whenReady().then(() => {
  try {
    initDatabase();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
electron.ipcMain.handle("app:getPlatform", () => process.platform);
electron.ipcMain.handle("ping", () => "pong");
electron.ipcMain.handle("files:search", async (_, query, filters) => {
  try {
    const results = searchFiles({ text: query, filters });
    return results;
  } catch (error) {
    console.error("Error searching files:", error);
    throw error;
  }
});
electron.ipcMain.handle("files:getById", async (_, id) => {
  try {
    return getFileById(id);
  } catch (error) {
    console.error("Error getting file:", error);
    throw error;
  }
});
electron.ipcMain.handle("files:getAll", async (_, limit, offset) => {
  try {
    return getAllFiles(limit, offset);
  } catch (error) {
    console.error("Error getting files:", error);
    throw error;
  }
});
electron.ipcMain.handle("files:update", async (_, id, data) => {
  try {
    updateFile(id, data);
  } catch (error) {
    console.error("Error updating file:", error);
    throw error;
  }
});
electron.ipcMain.handle("files:delete", async (_, id) => {
  try {
    deleteFile(id);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
});
electron.ipcMain.handle("files:bulkTag", async (_, fileIds, tagIds) => {
  try {
    bulkAddFileTags(fileIds, tagIds);
  } catch (error) {
    console.error("Error bulk tagging:", error);
    throw error;
  }
});
electron.ipcMain.handle("tags:getAll", async () => {
  try {
    return getAllTags();
  } catch (error) {
    console.error("Error getting tags:", error);
    throw error;
  }
});
electron.ipcMain.handle("tags:create", async (_, data) => {
  try {
    const id = createTag({
      name: data.name,
      category: data.category,
      color: data.color,
      created_at: Date.now()
    });
    return { id, ...data };
  } catch (error) {
    console.error("Error creating tag:", error);
    throw error;
  }
});
electron.ipcMain.handle("tags:delete", async (_, id) => {
  try {
    deleteTag(id);
  } catch (error) {
    console.error("Error deleting tag:", error);
    throw error;
  }
});
electron.ipcMain.handle("collections:getAll", async () => {
  try {
    return getAllCollections();
  } catch (error) {
    console.error("Error getting collections:", error);
    throw error;
  }
});
electron.ipcMain.handle("collections:create", async (_, data) => {
  try {
    const now = Date.now();
    const id = createCollection({
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      created_at: now,
      updated_at: now,
      is_smart: data.is_smart || false,
      smart_query: data.smart_query
    });
    return { id, ...data, created_at: now, updated_at: now };
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error;
  }
});
electron.ipcMain.handle("collections:addFiles", async (_, collectionId, fileIds) => {
  try {
    addFilesToCollection(collectionId, fileIds);
  } catch (error) {
    console.error("Error adding files to collection:", error);
    throw error;
  }
});
electron.ipcMain.handle("collections:removeFiles", async (_, collectionId, fileIds) => {
  try {
    removeFilesFromCollection(collectionId, fileIds);
  } catch (error) {
    console.error("Error removing files from collection:", error);
    throw error;
  }
});
electron.ipcMain.handle("collections:getFiles", async (_, collectionId) => {
  try {
    return getCollectionFiles(collectionId);
  } catch (error) {
    console.error("Error getting collection files:", error);
    throw error;
  }
});
electron.ipcMain.handle("stats:get", async () => {
  try {
    return getDatabaseStats();
  } catch (error) {
    console.error("Error getting stats:", error);
    throw error;
  }
});
electron.ipcMain.handle("folders:selectFolder", async () => {
  try {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Folder to Scan"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    console.error("Error selecting folder:", error);
    throw error;
  }
});
electron.ipcMain.handle("folders:scan", async (_, folderPath, options) => {
  try {
    const result = await scanFolder(folderPath, {
      recursive: (options == null ? void 0 : options.recursive) ?? true,
      autoTag: (options == null ? void 0 : options.autoTag) ?? true,
      onProgress: (progress) => {
        mainWindow == null ? void 0 : mainWindow.webContents.send("scan:progress", progress);
      }
    });
    return result;
  } catch (error) {
    console.error("Error scanning folder:", error);
    throw error;
  }
});
electron.ipcMain.handle("folders:scanMultiple", async (_, folderPaths, options) => {
  try {
    const result = await scanFolders(folderPaths, {
      recursive: (options == null ? void 0 : options.recursive) ?? true,
      autoTag: (options == null ? void 0 : options.autoTag) ?? true,
      onProgress: (progress) => {
        mainWindow == null ? void 0 : mainWindow.webContents.send("scan:progress", progress);
      }
    });
    return result;
  } catch (error) {
    console.error("Error scanning folders:", error);
    throw error;
  }
});
electron.ipcMain.handle("audio:analyze", async (_, fileId, filePath) => {
  try {
    return await analyzeAndUpdateFile(fileId, filePath);
  } catch (error) {
    console.error("Error analyzing audio:", error);
    throw error;
  }
});
electron.ipcMain.handle("audio:batchAnalyze", async (_, files) => {
  try {
    const result = await batchAnalyzeFiles(files, (current, total, fileName) => {
      mainWindow == null ? void 0 : mainWindow.webContents.send("audio:progress", { current, total, fileName });
    });
    return result;
  } catch (error) {
    console.error("Error batch analyzing:", error);
    throw error;
  }
});
