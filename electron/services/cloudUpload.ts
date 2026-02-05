import { net } from 'electron'
import { createReadStream, statSync } from 'fs'
import path from 'path'
import { getStoredToken } from './auth'

const CLOUD_API_BASE = 'https://hardwavestudios.com/api/cloud'

export interface UploadProgress {
  filename: string
  loaded: number
  total: number
  percent: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

export interface UploadResult {
  success: boolean
  file?: any
  error?: string
}

export interface UploadOptions {
  metadata?: {
    duration_seconds?: number
    bpm?: number
    detected_key?: string
  }
  onProgress?: (progress: UploadProgress) => void
}

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.aiff']

function isAllowedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.aiff': 'audio/aiff',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

// Generate multipart boundary
function generateBoundary(): string {
  return '----ElectronUpload' + Math.random().toString(36).substring(2)
}

// Upload a single file with progress
export async function uploadFile(
  filePath: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const token = getStoredToken()

  if (!token) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!isAllowedFile(filePath)) {
    return {
      success: false,
      error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  const filename = path.basename(filePath)
  const fileStats = statSync(filePath)
  const fileSize = fileStats.size
  const mimeType = getMimeType(filePath)
  const boundary = generateBoundary()

  // Build multipart form data
  const metadataJson = options.metadata
    ? JSON.stringify({ [filename]: options.metadata })
    : '{}'

  // Multipart header for metadata
  const metadataHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${metadataJson}\r\n`

  // Multipart header for file
  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`

  // Multipart footer
  const footer = `\r\n--${boundary}--\r\n`

  const headerBuffer = Buffer.from(metadataHeader + fileHeader)
  const footerBuffer = Buffer.from(footer)
  const totalSize = headerBuffer.length + fileSize + footerBuffer.length

  return new Promise((resolve) => {
    const request = net.request({
      method: 'POST',
      url: `${CLOUD_API_BASE}/upload`,
    })

    request.setHeader('Authorization', `Bearer ${token}`)
    request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`)
    request.setHeader('Content-Length', String(totalSize))

    let responseData = ''
    let uploadedBytes = 0

    // Report initial progress
    if (options.onProgress) {
      options.onProgress({
        filename,
        loaded: 0,
        total: fileSize,
        percent: 0,
        status: 'uploading',
      })
    }

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })

      response.on('end', () => {
        try {
          const data = JSON.parse(responseData)

          if (response.statusCode && response.statusCode >= 400) {
            if (options.onProgress) {
              options.onProgress({
                filename,
                loaded: uploadedBytes,
                total: fileSize,
                percent: 100,
                status: 'error',
                error: data.error || `HTTP ${response.statusCode}`,
              })
            }
            resolve({
              success: false,
              error: data.error || `Upload failed with status ${response.statusCode}`,
            })
          } else {
            if (options.onProgress) {
              options.onProgress({
                filename,
                loaded: fileSize,
                total: fileSize,
                percent: 100,
                status: 'complete',
              })
            }

            // Return the first uploaded file
            const uploadedFile = data.data?.uploaded?.[0]
            resolve({
              success: true,
              file: uploadedFile,
            })
          }
        } catch (e) {
          if (options.onProgress) {
            options.onProgress({
              filename,
              loaded: uploadedBytes,
              total: fileSize,
              percent: 100,
              status: 'error',
              error: 'Failed to parse response',
            })
          }
          resolve({ success: false, error: 'Failed to parse server response' })
        }
      })
    })

    request.on('error', (error) => {
      if (options.onProgress) {
        options.onProgress({
          filename,
          loaded: uploadedBytes,
          total: fileSize,
          percent: Math.round((uploadedBytes / fileSize) * 100),
          status: 'error',
          error: error.message,
        })
      }
      resolve({ success: false, error: error.message })
    })

    // Write headers
    request.write(headerBuffer)

    // Stream file content
    const fileStream = createReadStream(filePath)

    fileStream.on('data', (chunk: Buffer) => {
      request.write(chunk)
      uploadedBytes += chunk.length

      if (options.onProgress) {
        options.onProgress({
          filename,
          loaded: uploadedBytes,
          total: fileSize,
          percent: Math.round((uploadedBytes / fileSize) * 100),
          status: 'uploading',
        })
      }
    })

    fileStream.on('end', () => {
      // Write footer and end request
      request.write(footerBuffer)
      request.end()
    })

    fileStream.on('error', (error) => {
      if (options.onProgress) {
        options.onProgress({
          filename,
          loaded: uploadedBytes,
          total: fileSize,
          percent: Math.round((uploadedBytes / fileSize) * 100),
          status: 'error',
          error: error.message,
        })
      }
      resolve({ success: false, error: error.message })
    })
  })
}

// Upload multiple files with combined progress
export interface BatchUploadProgress {
  current: number
  total: number
  currentFile: UploadProgress | null
  completed: UploadResult[]
  failed: { filename: string; error: string }[]
}

export async function uploadFiles(
  filePaths: string[],
  onProgress?: (progress: BatchUploadProgress) => void
): Promise<BatchUploadProgress> {
  const results: BatchUploadProgress = {
    current: 0,
    total: filePaths.length,
    currentFile: null,
    completed: [],
    failed: [],
  }

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]
    const filename = path.basename(filePath)

    results.current = i + 1

    try {
      const result = await uploadFile(filePath, {
        onProgress: (progress) => {
          results.currentFile = progress
          onProgress?.(results)
        },
      })

      if (result.success) {
        results.completed.push(result)
      } else {
        results.failed.push({ filename, error: result.error || 'Unknown error' })
      }
    } catch (error) {
      results.failed.push({
        filename,
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }

    onProgress?.(results)
  }

  results.currentFile = null
  return results
}

// Download file to specified path
export async function downloadFile(
  fileId: number,
  savePath: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  const token = getStoredToken()

  if (!token) {
    return { success: false, error: 'Not authenticated' }
  }

  return new Promise((resolve) => {
    const request = net.request({
      method: 'GET',
      url: `${CLOUD_API_BASE}/download/${fileId}`,
    })

    request.setHeader('Authorization', `Bearer ${token}`)

    const { createWriteStream } = require('fs')
    let fileStream: ReturnType<typeof createWriteStream> | null = null
    let totalSize = 0
    let downloadedSize = 0

    request.on('response', (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        let errorData = ''
        response.on('data', (chunk) => {
          errorData += chunk.toString()
        })
        response.on('end', () => {
          try {
            const error = JSON.parse(errorData)
            resolve({ success: false, error: error.error || `HTTP ${response.statusCode}` })
          } catch {
            resolve({ success: false, error: `Download failed with status ${response.statusCode}` })
          }
        })
        return
      }

      // Get content length
      const contentLength = response.headers['content-length']
      if (contentLength) {
        totalSize = parseInt(Array.isArray(contentLength) ? contentLength[0] : contentLength)
      }

      fileStream = createWriteStream(savePath)

      response.on('data', (chunk) => {
        fileStream?.write(chunk)
        downloadedSize += chunk.length
        onProgress?.(downloadedSize, totalSize)
      })

      response.on('end', () => {
        fileStream?.end()
        resolve({ success: true })
      })
    })

    request.on('error', (error) => {
      fileStream?.destroy()
      resolve({ success: false, error: error.message })
    })

    request.end()
  })
}
