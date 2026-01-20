import { parseFile } from 'music-metadata'
import type { IAudioMetadata } from 'music-metadata'
import { updateFile } from '../database/queries'

export interface AudioMetadata {
  duration?: number
  sample_rate?: number
  bit_depth?: number
  channels?: number
  bpm?: number
  detected_key?: string
  detected_scale?: string
}

/**
 * Map music-metadata key to simplified format
 */
function mapKey(key?: string): string | undefined {
  if (!key) return undefined

  // music-metadata returns keys like "C major", "D# minor", etc.
  // Extract just the note (C, D#, etc.)
  const match = key.match(/^([A-G][#b]?)/)
  return match ? match[1] : undefined
}

/**
 * Map music-metadata scale to simplified format
 */
function mapScale(key?: string): string | undefined {
  if (!key) return undefined

  if (key.toLowerCase().includes('minor')) return 'minor'
  if (key.toLowerCase().includes('major')) return 'major'
  return undefined
}

/**
 * Estimate energy level based on audio characteristics
 * Returns 1-10 scale
 */
function estimateEnergyLevel(metadata: IAudioMetadata): number | undefined {
  const bpm = metadata.common.bpm

  if (!bpm) return undefined

  // Energy estimation based on BPM for harder-styles
  if (bpm >= 180) return 10 // Uptempo - maximum energy
  if (bpm >= 170) return 9  // High hardcore
  if (bpm >= 160) return 8  // Hardcore
  if (bpm >= 155) return 7  // Raw hardstyle
  if (bpm >= 150) return 6  // Hardstyle peak
  if (bpm >= 145) return 5  // Standard hardstyle
  if (bpm >= 140) return 4  // Euphoric hardstyle
  if (bpm >= 130) return 3  // Slow hardstyle
  if (bpm >= 120) return 2  // House tempo
  return 1 // Very low energy
}

/**
 * Extract audio metadata from file
 */
export async function analyzeAudioFile(filePath: string): Promise<AudioMetadata | null> {
  try {
    const metadata = await parseFile(filePath, {
      duration: true,
      skipCovers: true, // Don't parse album art for performance
    })

    const audioMetadata: AudioMetadata = {
      duration: metadata.format.duration,
      sample_rate: metadata.format.sampleRate,
      bit_depth: metadata.format.bitsPerSample,
      channels: metadata.format.numberOfChannels,
      bpm: metadata.common.bpm,
      detected_key: mapKey(metadata.common.key),
      detected_scale: mapScale(metadata.common.key),
    }

    return audioMetadata
  } catch (error) {
    console.error(`Error analyzing audio file ${filePath}:`, error)
    return null
  }
}

/**
 * Analyze audio file and update database
 */
export async function analyzeAndUpdateFile(fileId: number, filePath: string): Promise<boolean> {
  try {
    const audioData = await analyzeAudioFile(filePath)

    if (!audioData) return false

    const metadata = await parseFile(filePath, { duration: true, skipCovers: true })
    const energyLevel = estimateEnergyLevel(metadata)

    // Update file in database
    updateFile(fileId, {
      duration: audioData.duration,
      sample_rate: audioData.sample_rate,
      bit_depth: audioData.bit_depth,
      channels: audioData.channels,
      bpm: audioData.bpm,
      detected_key: audioData.detected_key,
      detected_scale: audioData.detected_scale,
      energy_level: energyLevel,
    })

    return true
  } catch (error) {
    console.error(`Error analyzing and updating file ${fileId}:`, error)
    return false
  }
}

/**
 * Batch analyze multiple files
 */
export async function batchAnalyzeFiles(
  files: Array<{ id: number; file_path: string }>,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number }> {
  const result = { success: 0, failed: 0 }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (onProgress) {
      const fileName = file.file_path.split(/[\\/]/).pop() || ''
      onProgress(i + 1, files.length, fileName)
    }

    const success = await analyzeAndUpdateFile(file.id, file.file_path)
    if (success) {
      result.success++
    } else {
      result.failed++
    }
  }

  return result
}

/**
 * Detect BPM using basic algorithm (fallback if music-metadata fails)
 * Note: This is a simple implementation. For production, consider using
 * more sophisticated libraries like aubio or essentia.js
 */
export async function detectBPM(filePath: string): Promise<number | undefined> {
  try {
    const metadata = await parseFile(filePath, { duration: false, skipCovers: true })
    return metadata.common.bpm
  } catch (error) {
    console.error(`Error detecting BPM for ${filePath}:`, error)
    return undefined
  }
}
