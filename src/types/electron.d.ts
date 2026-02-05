// TypeScript type definitions for window.electron
// These match the preload script exposed API

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

export {}
