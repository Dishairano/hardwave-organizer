import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  ping: () => ipcRenderer.invoke('ping'),

  // File operations
  files: {
    getAll: (limit?: number, offset?: number) => ipcRenderer.invoke('files:getAll', limit, offset),
    search: (query: string, filters: any) => ipcRenderer.invoke('files:search', query, filters),
    getById: (id: number) => ipcRenderer.invoke('files:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('files:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('files:delete', id),
    bulkTag: (fileIds: number[], tagIds: number[]) => ipcRenderer.invoke('files:bulkTag', fileIds, tagIds),
  },

  // Tag operations (to be implemented)
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    create: (data: any) => ipcRenderer.invoke('tags:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('tags:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
  },

  // Collection operations
  collections: {
    getAll: () => ipcRenderer.invoke('collections:getAll'),
    create: (data: any) => ipcRenderer.invoke('collections:create', data),
    getFiles: (collectionId: number) => ipcRenderer.invoke('collections:getFiles', collectionId),
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
})

// TypeScript type definitions for window.electron
declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      ping: () => Promise<string>
      files: {
        getAll: (limit?: number, offset?: number) => Promise<any[]>
        search: (query: string, filters: any) => Promise<any>
        getById: (id: number) => Promise<any>
        update: (id: number, data: any) => Promise<void>
        delete: (id: number) => Promise<void>
        bulkTag: (fileIds: number[], tagIds: number[]) => Promise<void>
      }
      tags: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<void>
        delete: (id: number) => Promise<void>
      }
      collections: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<any>
        getFiles: (collectionId: number) => Promise<any[]>
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
    }
  }
}
