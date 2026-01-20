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
