import Database from 'better-sqlite3'
import { readFileSync, statSync, mkdirSync, readdirSync } from 'fs'
import { join, relative, extname, basename, dirname } from 'path'
import { parseNote } from './markdown-parser'

export interface NoteIndex {
  path: string
  title: string | null
  note_type: string | null
  tags: string[]
  wikilinks: string[]
  modified: number
}

export class Indexer {
  private db: Database.Database

  constructor(vaultPath: string) {
    const dbDir = join(vaultPath, '.folio')
    mkdirSync(dbDir, { recursive: true })
    const dbPath = join(dbDir, 'index.db')

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.createSchema()
  }

  private createSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        path TEXT PRIMARY KEY,
        title TEXT,
        note_type TEXT,
        content TEXT,
        frontmatter TEXT,
        modified INTEGER
      );

      CREATE TABLE IF NOT EXISTS tags (
        note_path TEXT,
        tag TEXT,
        UNIQUE(note_path, tag),
        FOREIGN KEY (note_path) REFERENCES notes(path) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS wikilinks (
        source_path TEXT,
        target TEXT,
        UNIQUE(source_path, target),
        FOREIGN KEY (source_path) REFERENCES notes(path) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS properties (
        note_path TEXT,
        key TEXT,
        value TEXT,
        UNIQUE(note_path, key),
        FOREIGN KEY (note_path) REFERENCES notes(path) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_wikilinks_target ON wikilinks(target);
      CREATE INDEX IF NOT EXISTS idx_properties_key ON properties(key);
      CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);
    `)
  }

  indexFile(vaultPath: string, filePath: string): void {
    const relPath = relative(vaultPath, filePath)
    const raw = readFileSync(filePath, 'utf-8')
    const stat = statSync(filePath)
    const parsed = parseNote(raw)

    const noteType = parsed.frontmatter.type as string | undefined

    // Upsert note
    this.db.prepare(`
      INSERT OR REPLACE INTO notes (path, title, note_type, content, frontmatter, modified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      relPath,
      parsed.title,
      noteType ?? null,
      parsed.content,
      JSON.stringify(parsed.frontmatter),
      Math.floor(stat.mtimeMs)
    )

    // Clear and re-insert tags
    this.db.prepare('DELETE FROM tags WHERE note_path = ?').run(relPath)
    const insertTag = this.db.prepare('INSERT OR IGNORE INTO tags (note_path, tag) VALUES (?, ?)')
    for (const tag of parsed.tags) {
      insertTag.run(relPath, tag)
    }

    // Clear and re-insert wikilinks
    this.db.prepare('DELETE FROM wikilinks WHERE source_path = ?').run(relPath)
    const insertLink = this.db.prepare('INSERT OR IGNORE INTO wikilinks (source_path, target) VALUES (?, ?)')
    for (const link of parsed.wikilinks) {
      insertLink.run(relPath, link)
    }

    // Clear and re-insert properties
    this.db.prepare('DELETE FROM properties WHERE note_path = ?').run(relPath)
    const insertProp = this.db.prepare('INSERT OR IGNORE INTO properties (note_path, key, value) VALUES (?, ?, ?)')
    for (const [key, value] of Object.entries(parsed.frontmatter)) {
      insertProp.run(relPath, key, JSON.stringify(value))
    }
  }

  removeFile(vaultPath: string, filePath: string): void {
    const relPath = relative(vaultPath, filePath)
    this.db.prepare('DELETE FROM notes WHERE path = ?').run(relPath)
  }

  fullIndex(vaultPath: string): number {
    let count = 0
    const walk = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        // Skip hidden dirs/files
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
        } else if (extname(entry.name) === '.md') {
          try {
            this.indexFile(vaultPath, fullPath)
            count++
          } catch (err) {
            console.error(`Failed to index ${fullPath}:`, err)
          }
        }
      }
    }
    walk(vaultPath)
    return count
  }

  search(query: string): NoteIndex[] {
    const pattern = `%${query}%`
    const rows = this.db.prepare(`
      SELECT path, title, note_type, modified
      FROM notes
      WHERE content LIKE ? OR title LIKE ? OR path LIKE ?
      ORDER BY modified DESC
      LIMIT 100
    `).all(pattern, pattern, pattern) as Array<{
      path: string
      title: string | null
      note_type: string | null
      modified: number
    }>

    return rows.map((row) => ({
      path: row.path,
      title: row.title,
      note_type: row.note_type,
      tags: this.getTagsForNote(row.path),
      wikilinks: this.getWikilinksForNote(row.path),
      modified: row.modified,
    }))
  }

  listNotes(): NoteIndex[] {
    const rows = this.db.prepare(`
      SELECT path, title, note_type, modified
      FROM notes
      ORDER BY path
    `).all() as Array<{
      path: string
      title: string | null
      note_type: string | null
      modified: number
    }>

    return rows.map((row) => ({
      path: row.path,
      title: row.title,
      note_type: row.note_type,
      tags: this.getTagsForNote(row.path),
      wikilinks: this.getWikilinksForNote(row.path),
      modified: row.modified,
    }))
  }

  backlinks(noteName: string): string[] {
    const rows = this.db.prepare(
      'SELECT source_path FROM wikilinks WHERE target = ?'
    ).all(noteName) as Array<{ source_path: string }>

    return rows.map((r) => r.source_path)
  }

  noteCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }
    return row.count
  }

  private getTagsForNote(path: string): string[] {
    const rows = this.db.prepare('SELECT tag FROM tags WHERE note_path = ?').all(path) as Array<{ tag: string }>
    return rows.map((r) => r.tag)
  }

  private getWikilinksForNote(path: string): string[] {
    const rows = this.db.prepare('SELECT target FROM wikilinks WHERE source_path = ?').all(path) as Array<{ target: string }>
    return rows.map((r) => r.target)
  }

  close(): void {
    this.db.close()
  }
}
