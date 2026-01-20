import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { insertFile, updateFile } from '../database/queries'
import type { File } from '../../src/types'

// Supported file extensions
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.aiff', '.ogg', '.m4a']
const PROJECT_EXTENSIONS = ['.flp']
const MIDI_EXTENSIONS = ['.mid', '.midi']
const PRESET_EXTENSIONS = ['.fst', '.nmsv', '.sylenth1', '.serum']

export interface ScanOptions {
  recursive?: boolean
  autoTag?: boolean
  onProgress?: (progress: ScanProgress) => void
}

export interface ScanProgress {
  total: number
  indexed: number
  current_file?: string
  status: 'scanning' | 'analyzing' | 'complete' | 'error'
  error?: string
}

export interface ScanResult {
  indexed: number
  duplicates: number
  errors: number
  files: File[]
}

/**
 * Get file type from extension
 */
function getFileType(ext: string): File['file_type'] | null {
  if (AUDIO_EXTENSIONS.includes(ext)) return 'sample'
  if (PROJECT_EXTENSIONS.includes(ext)) return 'project'
  if (MIDI_EXTENSIONS.includes(ext)) return 'midi'
  if (PRESET_EXTENSIONS.includes(ext)) return 'preset'
  return null
}

/**
 * Calculate SHA256 hash of file for duplicate detection
 */
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Scan a single file and return metadata
 */
async function scanFile(filePath: string): Promise<Omit<File, 'id'> | null> {
  try {
    const stats = fs.statSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const fileType = getFileType(ext)

    if (!fileType) return null

    const filename = path.basename(filePath)
    const hash = await hashFile(filePath)

    const fileData: Omit<File, 'id'> = {
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
      duration: undefined,
      sample_rate: undefined,
      bit_depth: undefined,
      channels: undefined,

      // Musical metadata (to be filled by audio analysis)
      bpm: undefined,
      detected_key: undefined,
      detected_scale: undefined,
      energy_level: undefined,

      // Default values
      notes: undefined,
      rating: 0,
      color_code: undefined,
      is_favorite: false,
      use_count: 0,
    }

    return fileData
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error)
    return null
  }
}

/**
 * Recursively scan directory for files
 */
async function* walkDirectory(dirPath: string): AsyncGenerator<string> {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // Skip hidden directories and system folders
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue
        }
        yield* walkDirectory(fullPath)
      } else if (entry.isFile()) {
        yield fullPath
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error)
  }
}

/**
 * Auto-tag file based on filename and folder structure
 */
function autoTagFile(filePath: string): string[] {
  const tags: string[] = []
  const filename = path.basename(filePath).toLowerCase()
  const dirName = path.dirname(filePath).toLowerCase()

  // Genre detection
  if (filename.includes('hardstyle') || dirName.includes('hardstyle')) tags.push('Hardstyle')
  if (filename.includes('rawstyle') || filename.includes('raw') || dirName.includes('rawstyle')) tags.push('Rawstyle')
  if (filename.includes('hardcore') || dirName.includes('hardcore')) tags.push('Hardcore')
  if (filename.includes('uptempo') || dirName.includes('uptempo')) tags.push('Uptempo')
  if (filename.includes('euphoric') || dirName.includes('euphoric')) tags.push('Euphoric')

  // Instrument detection
  if (filename.includes('kick')) tags.push('Kick')
  if (filename.includes('lead')) tags.push('Lead')
  if (filename.includes('screech') || filename.includes('screecher')) tags.push('Screech')
  if (filename.includes('atmosphere') || filename.includes('atmo')) tags.push('Atmosphere')
  if (filename.includes('vocal')) tags.push('Vocal')
  if (filename.includes('fx') || filename.includes('effect')) tags.push('FX')

  // BPM detection from filename
  const bpmMatch = filename.match(/(\d{3})\s*bpm/i)
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[1])
    if (bpm >= 140 && bpm <= 155) tags.push('Hardstyle')
    if (bpm >= 150 && bpm <= 160) tags.push('Rawstyle')
    if (bpm >= 160 && bpm <= 180) tags.push('Hardcore')
    if (bpm >= 180) tags.push('Uptempo')
  }

  return tags
}

/**
 * Scan a folder and index all files
 */
export async function scanFolder(
  folderPath: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const { recursive = true, autoTag = true, onProgress } = options

  const result: ScanResult = {
    indexed: 0,
    duplicates: 0,
    errors: 0,
    files: [],
  }

  let filesFound: string[] = []

  // Collect all files first
  if (recursive) {
    for await (const filePath of walkDirectory(folderPath)) {
      filesFound.push(filePath)
    }
  } else {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    filesFound = entries
      .filter((e) => e.isFile())
      .map((e) => path.join(folderPath, e.name))
  }

  const total = filesFound.length

  // Report initial progress
  if (onProgress) {
    onProgress({
      total,
      indexed: 0,
      status: 'scanning',
    })
  }

  // Process each file
  for (let i = 0; i < filesFound.length; i++) {
    const filePath = filesFound[i]

    try {
      const fileData = await scanFile(filePath)

      if (fileData) {
        // Check for duplicates by hash
        // TODO: Query database for existing hash
        // For now, just insert

        const fileId = insertFile(fileData)

        // Auto-tag if enabled
        if (autoTag) {
          const suggestedTags = autoTagFile(filePath)
          // TODO: Add tags to file
          console.log(`Auto-tags for ${fileData.filename}:`, suggestedTags)
        }

        result.indexed++
        result.files.push({ id: fileId, ...fileData })
      }

      // Report progress
      if (onProgress && (i % 10 === 0 || i === filesFound.length - 1)) {
        onProgress({
          total,
          indexed: i + 1,
          current_file: path.basename(filePath),
          status: 'scanning',
        })
      }
    } catch (error) {
      result.errors++
      console.error(`Error processing ${filePath}:`, error)
    }
  }

  // Complete
  if (onProgress) {
    onProgress({
      total,
      indexed: result.indexed,
      status: 'complete',
    })
  }

  return result
}

/**
 * Scan multiple folders
 */
export async function scanFolders(
  folderPaths: string[],
  options: ScanOptions = {}
): Promise<ScanResult> {
  const combinedResult: ScanResult = {
    indexed: 0,
    duplicates: 0,
    errors: 0,
    files: [],
  }

  for (const folderPath of folderPaths) {
    const result = await scanFolder(folderPath, options)
    combinedResult.indexed += result.indexed
    combinedResult.duplicates += result.duplicates
    combinedResult.errors += result.errors
    combinedResult.files.push(...result.files)
  }

  return combinedResult
}
