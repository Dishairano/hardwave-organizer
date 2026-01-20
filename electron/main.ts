import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, closeDatabase } from './database'
import * as db from './database/queries'
import { scanFolder, scanFolders } from './services/fileScanner'
import { analyzeAndUpdateFile, batchAnalyzeFiles } from './services/audioAnalysis'

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
    backgroundColor: '#0A0A0F',
    frame: true, // Windows native frame
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false, // Don't show until ready
  })

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools() // Auto-open DevTools in development
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialize database before app is ready
app.on('before-quit', () => {
  closeDatabase()
})

// App lifecycle
app.whenReady().then(() => {
  // Initialize database
  try {
    initDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

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
// IPC HANDLERS
// ============================================================================

// App info
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPlatform', () => process.platform)
ipcMain.handle('ping', () => 'pong')

// File operations
ipcMain.handle('files:search', async (_, query, filters) => {
  try {
    const results = db.searchFiles({ text: query, filters })
    return results
  } catch (error) {
    console.error('Error searching files:', error)
    throw error
  }
})

ipcMain.handle('files:getById', async (_, id: number) => {
  try {
    return db.getFileById(id)
  } catch (error) {
    console.error('Error getting file:', error)
    throw error
  }
})

ipcMain.handle('files:getAll', async (_, limit?: number, offset?: number) => {
  try {
    return db.getAllFiles(limit, offset)
  } catch (error) {
    console.error('Error getting files:', error)
    throw error
  }
})

ipcMain.handle('files:update', async (_, id: number, data: any) => {
  try {
    db.updateFile(id, data)
  } catch (error) {
    console.error('Error updating file:', error)
    throw error
  }
})

ipcMain.handle('files:delete', async (_, id: number) => {
  try {
    db.deleteFile(id)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
})

ipcMain.handle('files:bulkTag', async (_, fileIds: number[], tagIds: number[]) => {
  try {
    db.bulkAddFileTags(fileIds, tagIds)
  } catch (error) {
    console.error('Error bulk tagging:', error)
    throw error
  }
})

// Tag operations
ipcMain.handle('tags:getAll', async () => {
  try {
    return db.getAllTags()
  } catch (error) {
    console.error('Error getting tags:', error)
    throw error
  }
})

ipcMain.handle('tags:create', async (_, data: any) => {
  try {
    const id = db.createTag({
      name: data.name,
      category: data.category,
      color: data.color,
      created_at: Date.now(),
    })
    return { id, ...data }
  } catch (error) {
    console.error('Error creating tag:', error)
    throw error
  }
})

ipcMain.handle('tags:delete', async (_, id: number) => {
  try {
    db.deleteTag(id)
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
})

// Collection operations
ipcMain.handle('collections:getAll', async () => {
  try {
    return db.getAllCollections()
  } catch (error) {
    console.error('Error getting collections:', error)
    throw error
  }
})

ipcMain.handle('collections:create', async (_, data: any) => {
  try {
    const now = Date.now()
    const id = db.createCollection({
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      created_at: now,
      updated_at: now,
      is_smart: data.is_smart || false,
      smart_query: data.smart_query,
    })
    return { id, ...data, created_at: now, updated_at: now }
  } catch (error) {
    console.error('Error creating collection:', error)
    throw error
  }
})

ipcMain.handle('collections:addFiles', async (_, collectionId: number, fileIds: number[]) => {
  try {
    db.addFilesToCollection(collectionId, fileIds)
  } catch (error) {
    console.error('Error adding files to collection:', error)
    throw error
  }
})

ipcMain.handle('collections:removeFiles', async (_, collectionId: number, fileIds: number[]) => {
  try {
    db.removeFilesFromCollection(collectionId, fileIds)
  } catch (error) {
    console.error('Error removing files from collection:', error)
    throw error
  }
})

ipcMain.handle('collections:getFiles', async (_, collectionId: number) => {
  try {
    return db.getCollectionFiles(collectionId)
  } catch (error) {
    console.error('Error getting collection files:', error)
    throw error
  }
})

// Statistics
ipcMain.handle('stats:get', async () => {
  try {
    return db.getDatabaseStats()
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
        // Send progress updates to renderer
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
