import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { scanFolder, scanFolders } from './services/fileScanner'
import { analyzeAndUpdateFile, batchAnalyzeFiles } from './services/audioAnalysis'
import * as auth from './services/auth'
import { initUpdater, checkForUpdates, downloadUpdate, installUpdate, checkForUpdatesManual } from './services/updater'
import { filesApi, tagsApi, collectionsApi, statsApi, cloudApi } from './services/api'
import { uploadFile, uploadFiles, downloadFile } from './services/cloudUpload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Disable GPU acceleration on Windows for better compatibility
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#08080c',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Initialize auto-updater (only in production)
  if (!process.env.VITE_DEV_SERVER_URL) {
    initUpdater(mainWindow)
    // Check for updates on startup (after 5 seconds)
    setTimeout(() => {
      checkForUpdates()
    }, 5000)
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ============================================================================
// AUTH IPC HANDLERS
// ============================================================================

ipcMain.handle('auth:login', async (_, email: string, password: string) => {
  return await auth.login(email, password)
})

ipcMain.handle('auth:logout', async () => {
  auth.clearAuth()
  return { success: true }
})

ipcMain.handle('auth:verify', async () => {
  return await auth.verifySession()
})

ipcMain.handle('auth:getUser', async () => {
  const authData = auth.getAuth()
  if (!authData) return null
  return {
    user: authData.user,
    subscription: authData.subscription,
  }
})

ipcMain.handle('auth:hasSubscription', async () => {
  return auth.hasActiveSubscription()
})

ipcMain.handle('auth:openSubscribe', async () => {
  shell.openExternal('https://hardwavestudios.com/dashboard/subscription')
})

// ============================================================================
// UPDATE IPC HANDLERS
// ============================================================================

ipcMain.handle('update:check', async () => {
  checkForUpdates()
})

ipcMain.handle('update:checkManual', async () => {
  checkForUpdatesManual()
})

ipcMain.handle('update:download', async () => {
  downloadUpdate()
})

ipcMain.handle('update:install', async () => {
  installUpdate()
})

// ============================================================================
// APP INFO IPC HANDLERS
// ============================================================================

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPlatform', () => process.platform)
ipcMain.handle('ping', () => 'pong')

// ============================================================================
// FILE IPC HANDLERS (Cloud API)
// ============================================================================

ipcMain.handle('files:search', async (_, query, filters) => {
  try {
    const result = await filesApi.search(query, filters)
    return result.files
  } catch (error) {
    console.error('Error searching files:', error)
    throw error
  }
})

ipcMain.handle('files:getById', async (_, id: number) => {
  try {
    return await filesApi.getById(id)
  } catch (error) {
    console.error('Error getting file:', error)
    throw error
  }
})

ipcMain.handle('files:getAll', async (_, limit?: number, offset?: number) => {
  try {
    return await filesApi.getAll(limit || 100, offset || 0)
  } catch (error) {
    console.error('Error getting files:', error)
    throw error
  }
})

ipcMain.handle('files:update', async (_, id: number, data: any) => {
  try {
    await filesApi.update(id, data)
  } catch (error) {
    console.error('Error updating file:', error)
    throw error
  }
})

ipcMain.handle('files:delete', async (_, id: number) => {
  try {
    await filesApi.delete(id)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
})

ipcMain.handle('files:bulkTag', async (_, fileIds: number[], tagIds: number[]) => {
  try {
    // Add tags to each file
    for (const fileId of fileIds) {
      await filesApi.addTags(fileId, tagIds)
    }
  } catch (error) {
    console.error('Error bulk tagging:', error)
    throw error
  }
})

ipcMain.handle('files:sync', async (_, files: any[]) => {
  try {
    return await filesApi.sync(files)
  } catch (error) {
    console.error('Error syncing files:', error)
    throw error
  }
})

// Tag operations (Cloud API)
ipcMain.handle('tags:getAll', async () => {
  try {
    return await tagsApi.getAll()
  } catch (error) {
    console.error('Error getting tags:', error)
    throw error
  }
})

ipcMain.handle('tags:create', async (_, data: any) => {
  try {
    return await tagsApi.create(data.name, data.category, data.color)
  } catch (error) {
    console.error('Error creating tag:', error)
    throw error
  }
})

ipcMain.handle('tags:delete', async (_, id: number) => {
  try {
    await tagsApi.delete(id)
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
})

// Collection operations (Cloud API)
ipcMain.handle('collections:getAll', async () => {
  try {
    return await collectionsApi.getAll()
  } catch (error) {
    console.error('Error getting collections:', error)
    throw error
  }
})

ipcMain.handle('collections:create', async (_, data: any) => {
  try {
    return await collectionsApi.create(data.name, data.color, data.description)
  } catch (error) {
    console.error('Error creating collection:', error)
    throw error
  }
})

ipcMain.handle('collections:update', async (_, id: number, data: any) => {
  try {
    return await collectionsApi.update(id, data)
  } catch (error) {
    console.error('Error updating collection:', error)
    throw error
  }
})

ipcMain.handle('collections:delete', async (_, id: number) => {
  try {
    return await collectionsApi.delete(id)
  } catch (error) {
    console.error('Error deleting collection:', error)
    throw error
  }
})

ipcMain.handle('collections:addFiles', async (_, collectionId: number, fileIds: number[]) => {
  try {
    await collectionsApi.addFiles(collectionId, fileIds)
  } catch (error) {
    console.error('Error adding files to collection:', error)
    throw error
  }
})

ipcMain.handle('collections:removeFiles', async (_, collectionId: number, fileIds: number[]) => {
  try {
    await collectionsApi.removeFiles(collectionId, fileIds)
  } catch (error) {
    console.error('Error removing files from collection:', error)
    throw error
  }
})

ipcMain.handle('collections:getById', async (_, collectionId: number) => {
  try {
    return await collectionsApi.getById(collectionId)
  } catch (error) {
    console.error('Error getting collection:', error)
    throw error
  }
})

// Statistics (Cloud API)
ipcMain.handle('stats:get', async () => {
  try {
    return await statsApi.get()
  } catch (error) {
    console.error('Error getting stats:', error)
    throw error
  }
})

// Folder operations
ipcMain.handle('folders:selectFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Folder to Scan',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  } catch (error) {
    console.error('Error selecting folder:', error)
    throw error
  }
})

ipcMain.handle('folders:scan', async (_, folderPath: string, options: any) => {
  try {
    const result = await scanFolder(folderPath, {
      recursive: options?.recursive ?? true,
      autoTag: options?.autoTag ?? true,
      onProgress: (progress) => {
        mainWindow?.webContents.send('scan:progress', progress)
      },
    })

    return result
  } catch (error) {
    console.error('Error scanning folder:', error)
    throw error
  }
})

ipcMain.handle('folders:scanMultiple', async (_, folderPaths: string[], options: any) => {
  try {
    const result = await scanFolders(folderPaths, {
      recursive: options?.recursive ?? true,
      autoTag: options?.autoTag ?? true,
      onProgress: (progress) => {
        mainWindow?.webContents.send('scan:progress', progress)
      },
    })

    return result
  } catch (error) {
    console.error('Error scanning folders:', error)
    throw error
  }
})

// Audio analysis
ipcMain.handle('audio:analyze', async (_, fileId: number, filePath: string) => {
  try {
    return await analyzeAndUpdateFile(fileId, filePath)
  } catch (error) {
    console.error('Error analyzing audio:', error)
    throw error
  }
})

ipcMain.handle('audio:batchAnalyze', async (_, files: Array<{ id: number; file_path: string }>) => {
  try {
    const result = await batchAnalyzeFiles(files, (current, total, fileName) => {
      mainWindow?.webContents.send('audio:progress', { current, total, fileName })
    })
    return result
  } catch (error) {
    console.error('Error batch analyzing:', error)
    throw error
  }
})

// ============================================================================
// CLOUD FILE IPC HANDLERS
// ============================================================================

// Select files for upload
ipcMain.handle('cloud:selectFilesForUpload', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      title: 'Select Audio Files to Upload',
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'aiff'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths
  } catch (error) {
    console.error('Error selecting files:', error)
    throw error
  }
})

// Upload files to cloud
ipcMain.handle('cloud:uploadFiles', async (_, filePaths: string[]) => {
  try {
    const result = await uploadFiles(filePaths, (progress) => {
      mainWindow?.webContents.send('cloud:uploadProgress', progress)
    })
    return result
  } catch (error) {
    console.error('Error uploading files:', error)
    throw error
  }
})

// Upload single file
ipcMain.handle('cloud:uploadFile', async (_, filePath: string) => {
  try {
    const result = await uploadFile(filePath, {
      onProgress: (progress) => {
        mainWindow?.webContents.send('cloud:uploadProgress', {
          current: 1,
          total: 1,
          currentFile: progress,
          completed: [],
          failed: [],
        })
      },
    })
    return result
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
})

// Get cloud files
ipcMain.handle('cloud:getFiles', async (_, page?: number, limit?: number) => {
  try {
    const result = await cloudApi.getFiles(page, limit)
    return result
  } catch (error) {
    console.error('Error getting cloud files:', error)
    throw error
  }
})

// Get single cloud file
ipcMain.handle('cloud:getFile', async (_, id: number) => {
  try {
    const result = await cloudApi.getFile(id)
    return result.file
  } catch (error) {
    console.error('Error getting cloud file:', error)
    throw error
  }
})

// Delete cloud file
ipcMain.handle('cloud:deleteFile', async (_, id: number) => {
  try {
    await cloudApi.deleteFile(id)
    return { success: true }
  } catch (error) {
    console.error('Error deleting cloud file:', error)
    throw error
  }
})

// Download cloud file
ipcMain.handle('cloud:downloadFile', async (_, id: number, originalFilename: string) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save File',
      defaultPath: originalFilename,
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'aiff'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }

    const downloadResult = await downloadFile(id, result.filePath, (loaded, total) => {
      mainWindow?.webContents.send('cloud:downloadProgress', {
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
      })
    })

    return downloadResult
  } catch (error) {
    console.error('Error downloading cloud file:', error)
    throw error
  }
})

// Share file (create share link)
ipcMain.handle('cloud:shareFile', async (_, id: number) => {
  try {
    const result = await cloudApi.shareFile(id, true)
    return result.data
  } catch (error) {
    console.error('Error sharing file:', error)
    throw error
  }
})

// Revoke share link
ipcMain.handle('cloud:revokeShare', async (_, id: number) => {
  try {
    await cloudApi.revokeShare(id)
    return { success: true }
  } catch (error) {
    console.error('Error revoking share:', error)
    throw error
  }
})

// Get files shared with current user
ipcMain.handle('cloud:getSharedWithMe', async () => {
  try {
    const result = await cloudApi.getSharedWithMe()
    return result.files
  } catch (error) {
    console.error('Error getting shared files:', error)
    throw error
  }
})

// Get storage usage
ipcMain.handle('cloud:getStorage', async () => {
  try {
    const result = await cloudApi.getStorage()
    return result.data
  } catch (error) {
    console.error('Error getting storage:', error)
    throw error
  }
})

// Copy share link to clipboard
ipcMain.handle('cloud:copyShareLink', async (_, shareUrl: string) => {
  try {
    clipboard.writeText(shareUrl)
    return { success: true }
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    throw error
  }
})

// Open share link in browser
ipcMain.handle('cloud:openShareLink', async (_, shareUrl: string) => {
  try {
    await shell.openExternal(shareUrl)
    return { success: true }
  } catch (error) {
    console.error('Error opening share link:', error)
    throw error
  }
})
