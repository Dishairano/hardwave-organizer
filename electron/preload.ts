import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  ping: () => ipcRenderer.invoke('ping'),

  // Authentication
  auth: {
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    verify: () => ipcRenderer.invoke('auth:verify'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    hasSubscription: () => ipcRenderer.invoke('auth:hasSubscription'),
    openSubscribe: () => ipcRenderer.invoke('auth:openSubscribe'),
  },

  // Updates
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    checkManual: () => ipcRenderer.invoke('update:checkManual'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onChecking: (callback: () => void) => {
      const subscription = () => callback()
      ipcRenderer.on('update:checking', subscription)
      return () => ipcRenderer.removeListener('update:checking', subscription)
    },
    onAvailable: (callback: (info: any) => void) => {
      const subscription = (_: any, info: any) => callback(info)
      ipcRenderer.on('update:available', subscription)
      return () => ipcRenderer.removeListener('update:available', subscription)
    },
    onNotAvailable: (callback: () => void) => {
      const subscription = () => callback()
      ipcRenderer.on('update:not-available', subscription)
      return () => ipcRenderer.removeListener('update:not-available', subscription)
    },
    onProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('update:progress', subscription)
      return () => ipcRenderer.removeListener('update:progress', subscription)
    },
    onDownloaded: (callback: (info: any) => void) => {
      const subscription = (_: any, info: any) => callback(info)
      ipcRenderer.on('update:downloaded', subscription)
      return () => ipcRenderer.removeListener('update:downloaded', subscription)
    },
    onError: (callback: (error: any) => void) => {
      const subscription = (_: any, error: any) => callback(error)
      ipcRenderer.on('update:error', subscription)
      return () => ipcRenderer.removeListener('update:error', subscription)
    },
  },

  // File operations
  files: {
    getAll: (limit?: number, offset?: number) => ipcRenderer.invoke('files:getAll', limit, offset),
    search: (query: string, filters: any) => ipcRenderer.invoke('files:search', query, filters),
    getById: (id: number) => ipcRenderer.invoke('files:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('files:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('files:delete', id),
    bulkTag: (fileIds: number[], tagIds: number[]) => ipcRenderer.invoke('files:bulkTag', fileIds, tagIds),
    sync: (files: any[]) => ipcRenderer.invoke('files:sync', files),
  },

  // Tag operations
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    create: (data: any) => ipcRenderer.invoke('tags:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('tags:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
  },

  // Collection operations
  collections: {
    getAll: () => ipcRenderer.invoke('collections:getAll'),
    getById: (collectionId: number) => ipcRenderer.invoke('collections:getById', collectionId),
    create: (data: any) => ipcRenderer.invoke('collections:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('collections:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('collections:delete', id),
    addFiles: (collectionId: number, fileIds: number[]) => ipcRenderer.invoke('collections:addFiles', collectionId, fileIds),
    removeFiles: (collectionId: number, fileIds: number[]) => ipcRenderer.invoke('collections:removeFiles', collectionId, fileIds),
  },

  // Statistics
  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },

  // Folder operations
  folders: {
    selectFolder: () => ipcRenderer.invoke('folders:selectFolder'),
    scan: (folderPath: string, options?: any) => ipcRenderer.invoke('folders:scan', folderPath, options),
    scanMultiple: (folderPaths: string[], options?: any) => ipcRenderer.invoke('folders:scanMultiple', folderPaths, options),
    onScanProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('scan:progress', subscription)
      return () => ipcRenderer.removeListener('scan:progress', subscription)
    },
  },

  // Audio analysis
  audio: {
    analyze: (fileId: number, filePath: string) => ipcRenderer.invoke('audio:analyze', fileId, filePath),
    batchAnalyze: (files: Array<{ id: number; file_path: string }>) => ipcRenderer.invoke('audio:batchAnalyze', files),
    onProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('audio:progress', subscription)
      return () => ipcRenderer.removeListener('audio:progress', subscription)
    },
  },

  // FL Studio integration (to be implemented)
  fl: {
    dragFile: (fileId: number) => ipcRenderer.invoke('fl:dragFile', fileId),
  },

  // Cloud storage operations
  cloud: {
    selectFilesForUpload: () => ipcRenderer.invoke('cloud:selectFilesForUpload'),
    uploadFiles: (filePaths: string[]) => ipcRenderer.invoke('cloud:uploadFiles', filePaths),
    uploadFile: (filePath: string) => ipcRenderer.invoke('cloud:uploadFile', filePath),
    getFiles: (page?: number, limit?: number) => ipcRenderer.invoke('cloud:getFiles', page, limit),
    getFile: (id: number) => ipcRenderer.invoke('cloud:getFile', id),
    deleteFile: (id: number) => ipcRenderer.invoke('cloud:deleteFile', id),
    downloadFile: (id: number, originalFilename: string) =>
      ipcRenderer.invoke('cloud:downloadFile', id, originalFilename),
    shareFile: (id: number) => ipcRenderer.invoke('cloud:shareFile', id),
    revokeShare: (id: number) => ipcRenderer.invoke('cloud:revokeShare', id),
    getSharedWithMe: () => ipcRenderer.invoke('cloud:getSharedWithMe'),
    getStorage: () => ipcRenderer.invoke('cloud:getStorage'),
    copyShareLink: (shareUrl: string) => ipcRenderer.invoke('cloud:copyShareLink', shareUrl),
    openShareLink: (shareUrl: string) => ipcRenderer.invoke('cloud:openShareLink', shareUrl),
    onUploadProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('cloud:uploadProgress', subscription)
      return () => ipcRenderer.removeListener('cloud:uploadProgress', subscription)
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('cloud:downloadProgress', subscription)
      return () => ipcRenderer.removeListener('cloud:downloadProgress', subscription)
    },
  },
})

// TypeScript type definitions for window.electron
declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      ping: () => Promise<string>
      auth: {
        login: (email: string, password: string) => Promise<{ success: boolean; error?: string; data?: any }>
        logout: () => Promise<{ success: boolean }>
        verify: () => Promise<{ valid: boolean; hasSubscription: boolean; data?: any }>
        getUser: () => Promise<{ user: any; subscription: any } | null>
        hasSubscription: () => Promise<boolean>
        openSubscribe: () => Promise<void>
      }
      updates: {
        check: () => Promise<void>
        checkManual: () => Promise<void>
        download: () => Promise<void>
        install: () => Promise<void>
        onChecking: (callback: () => void) => () => void
        onAvailable: (callback: (info: any) => void) => () => void
        onNotAvailable: (callback: () => void) => () => void
        onProgress: (callback: (progress: any) => void) => () => void
        onDownloaded: (callback: (info: any) => void) => () => void
        onError: (callback: (error: any) => void) => () => void
      }
      files: {
        getAll: (limit?: number, offset?: number) => Promise<any[]>
        search: (query: string, filters: any) => Promise<any>
        getById: (id: number) => Promise<any>
        update: (id: number, data: any) => Promise<void>
        delete: (id: number) => Promise<void>
        bulkTag: (fileIds: number[], tagIds: number[]) => Promise<void>
        sync: (files: any[]) => Promise<{ results: any[] }>
      }
      tags: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<void>
        delete: (id: number) => Promise<void>
      }
      collections: {
        getAll: () => Promise<any[]>
        getById: (collectionId: number) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<void>
        delete: (id: number) => Promise<void>
        addFiles: (collectionId: number, fileIds: number[]) => Promise<void>
        removeFiles: (collectionId: number, fileIds: number[]) => Promise<void>
      }
      stats: {
        get: () => Promise<{
          totalFiles: number
          totalTags: number
          totalCollections: number
          totalFavorites: number
        }>
      }
      folders: {
        selectFolder: () => Promise<string | null>
        scan: (folderPath: string, options?: any) => Promise<any>
        scanMultiple: (folderPaths: string[], options?: any) => Promise<any>
        onScanProgress: (callback: (progress: any) => void) => () => void
      }
      audio: {
        analyze: (fileId: number, filePath: string) => Promise<boolean>
        batchAnalyze: (files: Array<{ id: number; file_path: string }>) => Promise<{ success: number; failed: number }>
        onProgress: (callback: (progress: any) => void) => () => void
      }
      fl: {
        dragFile: (fileId: number) => Promise<any>
      }
      cloud: {
        selectFilesForUpload: () => Promise<string[] | null>
        uploadFiles: (filePaths: string[]) => Promise<{
          current: number
          total: number
          currentFile: any
          completed: any[]
          failed: { filename: string; error: string }[]
        }>
        uploadFile: (filePath: string) => Promise<{ success: boolean; file?: any; error?: string }>
        getFiles: (page?: number, limit?: number) => Promise<{ files: any[]; pagination: any }>
        getFile: (id: number) => Promise<any>
        deleteFile: (id: number) => Promise<{ success: boolean }>
        downloadFile: (id: number, originalFilename: string) => Promise<{
          success: boolean
          canceled?: boolean
          error?: string
        }>
        shareFile: (id: number) => Promise<{
          share_token: string
          share_url: string
          is_public: boolean
        }>
        revokeShare: (id: number) => Promise<{ success: boolean }>
        getSharedWithMe: () => Promise<any[]>
        getStorage: () => Promise<{
          used_bytes: number
          used_formatted: string
          file_count: number
          quota_bytes: number
          quota_formatted: string
          quota_unlimited: boolean
          usage_percent: number
        }>
        copyShareLink: (shareUrl: string) => Promise<{ success: boolean }>
        openShareLink: (shareUrl: string) => Promise<{ success: boolean }>
        onUploadProgress: (callback: (progress: any) => void) => () => void
        onDownloadProgress: (callback: (progress: any) => void) => () => void
      }
    }
  }
}
