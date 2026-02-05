import { net } from 'electron'
import { getStoredToken } from './auth'

const API_BASE = 'https://hardwavestudios.com/api/library'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: any
  params?: Record<string, string | number>
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options
  const token = getStoredToken()

  if (!token) {
    throw new Error('Not authenticated')
  }

  let url = `${API_BASE}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    }
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  return new Promise((resolve, reject) => {
    const request = net.request({
      method,
      url,
    })

    request.setHeader('Authorization', `Bearer ${token}`)
    request.setHeader('Content-Type', 'application/json')

    let responseData = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })

      response.on('end', () => {
        try {
          const data = JSON.parse(responseData)
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(data.error || `HTTP ${response.statusCode}`))
          } else {
            resolve(data as T)
          }
        } catch (e) {
          reject(new Error('Failed to parse response'))
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    if (body) {
      request.write(JSON.stringify(body))
    }

    request.end()
  })
}

// Files API
export const filesApi = {
  async getAll(limit = 100, offset = 0, search?: string) {
    const result = await apiRequest<{ files: any[]; total: number }>('/files', {
      params: { limit, offset, ...(search && { search }) }
    })
    return result.files
  },

  async search(query: string, filters: any = {}) {
    const result = await apiRequest<{ files: any[]; total: number }>('/files', {
      params: { search: query, ...filters }
    })
    return { files: result.files, total: result.total }
  },

  async getById(id: number) {
    return apiRequest<any>(`/files/${id}`)
  },

  async sync(files: any[]) {
    return apiRequest<{ results: any[] }>('/files/sync', {
      method: 'POST',
      body: { files }
    })
  },

  async update(id: number, data: any) {
    return apiRequest<{ success: boolean }>(`/files/${id}`, {
      method: 'PATCH',
      body: data
    })
  },

  async delete(id: number) {
    return apiRequest<{ success: boolean }>(`/files/${id}`, {
      method: 'DELETE'
    })
  },

  async setFavorite(id: number, favorite: boolean) {
    return this.update(id, { is_favorite: favorite ? 1 : 0 })
  },

  async setRating(id: number, rating: number) {
    return this.update(id, { rating })
  },

  async addTags(id: number, tagIds: number[]) {
    const file = await this.getById(id)
    const currentTags = file.tags?.map((t: any) => t.id) || []
    return this.update(id, { tagIds: [...new Set([...currentTags, ...tagIds])] })
  },

  async removeTags(id: number, tagIds: number[]) {
    const file = await this.getById(id)
    const currentTags = file.tags?.map((t: any) => t.id) || []
    return this.update(id, { tagIds: currentTags.filter((id: number) => !tagIds.includes(id)) })
  }
}

// Tags API
export const tagsApi = {
  async getAll() {
    const result = await apiRequest<{ tags: any[] }>('/tags')
    return result.tags
  },

  async create(name: string, category?: string, color?: string) {
    return apiRequest<any>('/tags', {
      method: 'POST',
      body: { name, category, color }
    })
  },

  async delete(id: number) {
    return apiRequest<{ success: boolean }>('/tags', {
      method: 'DELETE',
      body: { id }
    })
  }
}

// Collections API
export const collectionsApi = {
  async getAll() {
    const result = await apiRequest<{ collections: any[] }>('/collections')
    return result.collections
  },

  async getById(id: number) {
    return apiRequest<any>(`/collections/${id}`)
  },

  async create(name: string, color?: string, description?: string) {
    return apiRequest<any>('/collections', {
      method: 'POST',
      body: { name, color, description }
    })
  },

  async update(id: number, data: any) {
    return apiRequest<{ success: boolean }>(`/collections/${id}`, {
      method: 'PATCH',
      body: data
    })
  },

  async delete(id: number) {
    return apiRequest<{ success: boolean }>(`/collections/${id}`, {
      method: 'DELETE'
    })
  },

  async addFiles(id: number, fileIds: number[]) {
    return this.update(id, { addFileIds: fileIds })
  },

  async removeFiles(id: number, fileIds: number[]) {
    return this.update(id, { removeFileIds: fileIds })
  }
}

// Stats API
export const statsApi = {
  async get() {
    return apiRequest<{
      totalFiles: number
      totalTags: number
      totalCollections: number
      totalFavorites: number
    }>('/stats')
  }
}

// Cloud Files API
export interface CloudFile {
  id: number
  user_id: number
  filename: string
  original_filename: string
  storage_path: string
  file_hash: string
  file_type: 'wav' | 'mp3' | 'flac' | 'ogg' | 'aiff'
  file_size_bytes: number
  mime_type: string
  duration_seconds?: number
  bpm?: number
  detected_key?: string
  is_public: boolean
  share_token?: string
  download_count: number
  uploaded_at: string
}

export interface StorageUsage {
  used_bytes: number
  used_formatted: string
  file_count: number
  quota_bytes: number
  quota_formatted: string
  quota_unlimited: boolean
  usage_percent: number
}

export interface ShareResult {
  share_token: string
  share_url: string
  is_public: boolean
}

const CLOUD_API_BASE = 'https://hardwavestudios.com/api/cloud'

export const cloudApi = {
  // Get all cloud files
  async getFiles(page = 1, limit = 50) {
    return apiRequest<{ files: CloudFile[]; pagination: any }>('/cloud/files', {
      params: { page, limit }
    })
  },

  // Get single cloud file
  async getFile(id: number) {
    return apiRequest<{ file: CloudFile }>(`/cloud/files/${id}`)
  },

  // Delete cloud file
  async deleteFile(id: number) {
    return apiRequest<{ success: boolean; message: string }>(`/cloud/files/${id}`, {
      method: 'DELETE'
    })
  },

  // Get download URL for a file
  getDownloadUrl(id: number): string {
    const token = getStoredToken()
    return `${CLOUD_API_BASE}/download/${id}?token=${token}`
  },

  // Get share download URL
  getShareDownloadUrl(shareToken: string): string {
    return `${CLOUD_API_BASE}/download/share/${shareToken}`
  },

  // Create share link
  async shareFile(id: number, isPublic = true) {
    return apiRequest<{ data: ShareResult }>(`/cloud/share/${id}`, {
      method: 'POST',
      body: { is_public: isPublic }
    })
  },

  // Revoke share link
  async revokeShare(id: number) {
    return apiRequest<{ success: boolean; message: string }>(`/cloud/share/${id}`, {
      method: 'DELETE'
    })
  },

  // Get files shared with current user
  async getSharedWithMe() {
    return apiRequest<{ files: (CloudFile & { shared_by_name: string; shared_at: string })[] }>(
      '/cloud/shared-with-me'
    )
  },

  // Get storage usage
  async getStorage() {
    return apiRequest<{ data: StorageUsage }>('/cloud/storage')
  },

  // Get public file info by share token
  async getFileInfo(shareToken: string) {
    return apiRequest<{ data: { file: any } }>(`/cloud/file-info/${shareToken}`)
  }
}
