import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'

let mainWindow: BrowserWindow | null = null

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export function initUpdater(window: BrowserWindow) {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Set update feed URL to your server
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://hardwavestudios.com/downloads/updates',
  })

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
    sendToRenderer('update:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version)
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
    sendToRenderer('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`)
    sendToRenderer('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version)
    sendToRenderer('update:downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (error) => {
    console.error('Update error:', error)
    sendToRenderer('update:error', { message: error.message })
  })
}

function sendToRenderer(channel: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((error) => {
    console.error('Failed to check for updates:', error)
  })
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate().catch((error) => {
    console.error('Failed to download update:', error)
  })
}

export function installUpdate() {
  autoUpdater.quitAndInstall(false, true)
}

// Manual update check with dialog
export async function checkForUpdatesManual() {
  try {
    const result = await autoUpdater.checkForUpdates()

    if (result && result.updateInfo) {
      const response = await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${result.updateInfo.version}) is available!`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
      })

      if (response.response === 0) {
        downloadUpdate()
      }
    } else {
      await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version!',
        buttons: ['OK'],
      })
    }
  } catch (error) {
    console.error('Manual update check failed:', error)
  }
}
