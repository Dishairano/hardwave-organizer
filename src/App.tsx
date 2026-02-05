import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { FileCard } from './components/FileCard'
import { ImportModal } from './components/ImportModal'
import { Button } from './components/Button'
import { LoginScreen } from './components/LoginScreen'
import { SubscriptionRequired } from './components/SubscriptionRequired'
import { UpdatePopup } from './components/UpdatePopup'
import { HubView } from './views/HubView'
import { KickforgeView } from './views/KickforgeView'
import { SettingsView } from './views/SettingsView'
import { TagManagementModal } from './components/TagManagementModal'
import { CreateCollectionModal } from './components/CreateCollectionModal'
import { AddTagsModal } from './components/AddTagsModal'
import { AddToCollectionModal } from './components/AddToCollectionModal'
import { FilterPanel, type FilterState } from './components/FilterPanel'
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal'
import { FileDetailsPanel } from './components/FileDetailsPanel'
import { ContextMenu, createFileContextMenuItems } from './components/ContextMenu'
import type { File, Tag as TagType, Collection } from './types'

type AppView = 'hub' | 'organizer' | 'kickforge' | 'settings'

interface AuthState {
  isAuthenticated: boolean
  hasSubscription: boolean
  isLoading: boolean
  user: {
    email: string
    displayName: string | null
  } | null
  error?: string
}

interface UpdateState {
  available: boolean
  downloading: boolean
  downloaded: boolean
  info: {
    version: string
    releaseDate?: string
    releaseNotes?: string
  } | null
  progress: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  } | null
  error?: string
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  fileId: number | null
}

const defaultFilters: FilterState = {
  bpmMin: null,
  bpmMax: null,
  keys: [],
  fileTypes: [],
  tagIds: [],
  isFavorite: null,
  minRating: null,
}

function App() {
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    hasSubscription: false,
    isLoading: true,
    user: null,
  })

  // Update state
  const [updateState, setUpdateState] = useState<UpdateState>({
    available: false,
    downloading: false,
    downloaded: false,
    info: null,
    progress: null,
  })
  const [showUpdatePopup, setShowUpdatePopup] = useState(false)

  // Navigation state
  const [currentView, setCurrentView] = useState<AppView>('hub')

  // App state
  const [files, setFiles] = useState<File[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [stats, setStats] = useState({ totalFiles: 0, totalTags: 0, totalCollections: 0, totalFavorites: 0 })
  const [organizerView, setOrganizerView] = useState<'all' | 'samples' | 'projects' | 'favorites' | 'recent'>('all')
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [recentFiles, setRecentFiles] = useState<File[]>([])

  // Filter state
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false)
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false)
  const [isAddTagsModalOpen, setIsAddTagsModalOpen] = useState(false)
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [detailsPanelFile, setDetailsPanelFile] = useState<File | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    fileId: null,
  })

  // Verify session on mount
  useEffect(() => {
    verifyAuth()
  }, [])

  // Setup update listeners
  useEffect(() => {
    const unsubChecking = window.electron.updates.onChecking(() => {
      console.log('Checking for updates...')
    })

    const unsubAvailable = window.electron.updates.onAvailable((info) => {
      console.log('Update available:', info)
      setUpdateState((prev) => ({
        ...prev,
        available: true,
        info: {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes,
        },
      }))
      setShowUpdatePopup(true)
    })

    const unsubNotAvailable = window.electron.updates.onNotAvailable(() => {
      console.log('No updates available')
    })

    const unsubProgress = window.electron.updates.onProgress((progress) => {
      setUpdateState((prev) => ({
        ...prev,
        downloading: true,
        progress: {
          percent: progress.percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        },
      }))
    })

    const unsubDownloaded = window.electron.updates.onDownloaded((info) => {
      console.log('Update downloaded:', info)
      setUpdateState((prev) => ({
        ...prev,
        downloading: false,
        downloaded: true,
      }))
    })

    const unsubError = window.electron.updates.onError((error) => {
      console.error('Update error:', error)
      setUpdateState((prev) => ({
        ...prev,
        downloading: false,
        error: error.message,
      }))
    })

    return () => {
      unsubChecking()
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const verifyAuth = async () => {
    try {
      const result = await window.electron.auth.verify()
      if (result.valid && result.data) {
        setAuthState({
          isAuthenticated: true,
          hasSubscription: result.hasSubscription,
          isLoading: false,
          user: {
            email: result.data.user.email,
            displayName: result.data.user.displayName,
          },
        })

        if (result.hasSubscription) {
          loadData()
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          hasSubscription: false,
          isLoading: false,
          user: null,
        })
      }
    } catch (error) {
      console.error('Auth verification error:', error)
      setAuthState({
        isAuthenticated: false,
        hasSubscription: false,
        isLoading: false,
        user: null,
      })
    }
  }

  const handleLogin = async (email: string, password: string) => {
    const result = await window.electron.auth.login(email, password)

    if (result.success && result.data) {
      setAuthState({
        isAuthenticated: true,
        hasSubscription:
          result.data.subscription?.status === 'active' ||
          result.data.subscription?.status === 'trialing' ||
          result.data.user.isAdmin,
        isLoading: false,
        user: {
          email: result.data.user.email,
          displayName: result.data.user.displayName,
        },
      })

      if (
        result.data.subscription?.status === 'active' ||
        result.data.subscription?.status === 'trialing' ||
        result.data.user.isAdmin
      ) {
        loadData()
      }
    } else {
      setAuthState((prev) => ({
        ...prev,
        error: result.error || 'Login failed',
      }))
      throw new Error(result.error || 'Login failed')
    }
  }

  const handleLogout = async () => {
    await window.electron.auth.logout()
    setAuthState({
      isAuthenticated: false,
      hasSubscription: false,
      isLoading: false,
      user: null,
    })
    setFiles([])
    setTags([])
    setCollections([])
    setRecentFiles([])
  }

  const loadData = async () => {
    try {
      const loadedFiles = await window.electron.files.getAll(100, 0)
      setFiles(loadedFiles)

      const loadedTags = await window.electron.tags.getAll()
      setTags(loadedTags)

      const loadedCollections = await window.electron.collections.getAll()
      setCollections(loadedCollections)

      const loadedStats = await window.electron.stats.get()
      setStats(loadedStats)

      // Build recent files: sort by last_accessed (descending), take 6
      const sorted = [...loadedFiles]
        .sort((a, b) => (b.last_accessed || b.modified_at) - (a.last_accessed || a.modified_at))
        .slice(0, 6)
      setRecentFiles(sorted)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleImport = async () => {
    try {
      const folderPath = await window.electron.folders.selectFolder()
      if (!folderPath) return

      await window.electron.folders.scan(folderPath, {
        recursive: true,
        autoTag: true,
      })

      await loadData()
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  }

  const handleFileClick = (fileId: number) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter((id) => id !== fileId))
    } else {
      setSelectedFiles([...selectedFiles, fileId])
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      const allFiles = await window.electron.files.getAll(100, 0)
      setFiles(allFiles)
    } else {
      const results = await window.electron.files.search(query, {})
      setFiles(results.files)
    }
  }

  // Update handlers
  const handleDownloadUpdate = () => {
    window.electron.updates.download()
    setUpdateState((prev) => ({ ...prev, downloading: true }))
  }

  const handleInstallUpdate = () => {
    window.electron.updates.install()
  }

  const handleDismissUpdate = () => {
    setShowUpdatePopup(false)
  }

  // Audio playback
  const handlePlayFile = (file: File) => {
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
    }

    if (currentlyPlaying === file.id) {
      setCurrentlyPlaying(null)
      setAudioElement(null)
      return
    }

    // Convert Windows path to file:// URL format
    // C:\Users\... -> file:///C:/Users/...
    const filePath = file.file_path.replace(/\\/g, '/')
    const fileUrl = filePath.startsWith('/') ? `file://${filePath}` : `file:///${filePath}`
    const audio = new Audio(fileUrl)
    audio.addEventListener('ended', () => {
      setCurrentlyPlaying(null)
      setAudioElement(null)
    })
    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e)
      setCurrentlyPlaying(null)
      setAudioElement(null)
    })
    audio.play().catch((err) => {
      console.error('Failed to play audio:', err)
    })
    setAudioElement(audio)
    setCurrentlyPlaying(file.id)
  }

  // Toggle favorite
  const handleToggleFavorite = async (fileId: number) => {
    const file = files.find((f) => f.id === fileId)
    if (!file) return

    try {
      await window.electron.files.update(fileId, { is_favorite: !file.is_favorite ? 1 : 0 })
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, is_favorite: !f.is_favorite } : f))
      )
      // Update stats
      const loadedStats = await window.electron.stats.get()
      setStats(loadedStats)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Tag management
  const handleCreateTag = async (name: string, category: string, color: string) => {
    try {
      await window.electron.tags.create({ name, category, color })
      const loadedTags = await window.electron.tags.getAll()
      setTags(loadedTags)
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  const handleDeleteTag = async (id: number) => {
    try {
      await window.electron.tags.delete(id)
      const loadedTags = await window.electron.tags.getAll()
      setTags(loadedTags)
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  // Collection management
  const handleCreateCollection = async (name: string, color: string, description: string) => {
    try {
      await window.electron.collections.create({ name, color, description })
      const loadedCollections = await window.electron.collections.getAll()
      setCollections(loadedCollections)
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  // Bulk add tags to selected files
  const handleAddTagsToSelected = async (tagIds: number[]) => {
    try {
      await window.electron.files.bulkTag(selectedFiles, tagIds)
      await loadData()
      setSelectedFiles([])
    } catch (error) {
      console.error('Error adding tags:', error)
    }
  }

  // Add selected files to collection
  const handleAddToCollection = async (collectionId: number) => {
    try {
      await window.electron.collections.addFiles(collectionId, selectedFiles)
      const loadedCollections = await window.electron.collections.getAll()
      setCollections(loadedCollections)
      setSelectedFiles([])
    } catch (error) {
      console.error('Error adding to collection:', error)
    }
  }

  // Delete selected files
  const handleDeleteSelected = async () => {
    try {
      for (const fileId of selectedFiles) {
        await window.electron.files.delete(fileId)
      }
      await loadData()
      setSelectedFiles([])
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }

  // Collection click handler - filter files by collection
  const handleCollectionClick = async (collectionId: number) => {
    if (selectedCollectionId === collectionId) {
      // Deselect
      setSelectedCollectionId(null)
      const loadedFiles = await window.electron.files.getAll(100, 0)
      setFiles(loadedFiles)
    } else {
      setSelectedCollectionId(collectionId)
      setSelectedTagId(null)
      setOrganizerView('all')
      try {
        const collection = await window.electron.collections.getById(collectionId)
        if (collection.files) {
          setFiles(collection.files)
        }
      } catch (error) {
        console.error('Error loading collection files:', error)
      }
    }
  }

  // Tag click handler - filter files by tag
  const handleTagClick = async (tagId: number) => {
    if (selectedTagId === tagId) {
      // Deselect
      setSelectedTagId(null)
      const loadedFiles = await window.electron.files.getAll(100, 0)
      setFiles(loadedFiles)
    } else {
      setSelectedTagId(tagId)
      setSelectedCollectionId(null)
      setOrganizerView('all')
      try {
        const results = await window.electron.files.search('', { tagIds: [tagId] })
        setFiles(results.files)
      } catch (error) {
        console.error('Error filtering by tag:', error)
      }
    }
  }

  // Apply filters
  const handleApplyFilters = async (newFilters: FilterState) => {
    setFilters(newFilters)
    try {
      const filterParams: any = {}
      if (newFilters.bpmMin) filterParams.bpmMin = newFilters.bpmMin
      if (newFilters.bpmMax) filterParams.bpmMax = newFilters.bpmMax
      if (newFilters.keys.length) filterParams.keys = newFilters.keys
      if (newFilters.fileTypes.length) filterParams.fileTypes = newFilters.fileTypes
      if (newFilters.tagIds.length) filterParams.tagIds = newFilters.tagIds
      if (newFilters.isFavorite) filterParams.isFavorite = true
      if (newFilters.minRating) filterParams.minRating = newFilters.minRating

      const results = await window.electron.files.search(searchQuery, filterParams)
      setFiles(results.files)
    } catch (error) {
      console.error('Error applying filters:', error)
    }
  }

  const handleResetFilters = () => {
    setFilters(defaultFilters)
    loadData()
  }

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, fileId: number) => {
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      fileId,
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, fileId: null })
  }

  // File details panel handlers
  const handleUpdateRating = async (rating: number) => {
    if (!detailsPanelFile) return
    try {
      await window.electron.files.update(detailsPanelFile.id, { rating })
      setFiles((prev) =>
        prev.map((f) => (f.id === detailsPanelFile.id ? { ...f, rating } : f))
      )
      setDetailsPanelFile((prev) => prev ? { ...prev, rating } : null)
    } catch (error) {
      console.error('Error updating rating:', error)
    }
  }

  const handleRemoveTagFromFile = async (tagId: number) => {
    if (!detailsPanelFile) return
    try {
      const currentTagIds = detailsPanelFile.tags?.map((t) => t.id) || []
      const newTagIds = currentTagIds.filter((id) => id !== tagId)
      await window.electron.files.update(detailsPanelFile.id, { tagIds: newTagIds })
      await loadData()
      // Refresh details panel file
      const updatedFile = files.find((f) => f.id === detailsPanelFile.id)
      if (updatedFile) setDetailsPanelFile(updatedFile)
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  // Navigation helpers
  const navigateToHub = () => setCurrentView('hub')
  const navigateToOrganizer = () => setCurrentView('organizer')
  const navigateToKickforge = () => setCurrentView('kickforge')
  const navigateToSettings = () => setCurrentView('settings')

  // Define sample and project file types
  const sampleTypes = ['sample', 'one_shot', 'loop']
  const projectTypes = ['project', 'flp', 'midi']

  // Filter files based on current organizer view
  const filteredFiles = files.filter((file) => {
    if (organizerView === 'samples' && !sampleTypes.includes(file.file_type)) return false
    if (organizerView === 'projects' && !projectTypes.includes(file.file_type)) return false
    if (organizerView === 'favorites' && !file.is_favorite) return false
    if (!searchQuery.trim()) return true
    return file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Loading state
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-accent-primary to-accent-tertiary flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authState.isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} error={authState.error} />
  }

  if (!authState.hasSubscription) {
    return <SubscriptionRequired email={authState.user?.email || ''} onLogout={handleLogout} />
  }

  const handleCheckUpdates = () => {
    window.electron.updates.checkManual()
  }

  const viewLabel: Record<AppView, string> = {
    hub: 'Hub',
    organizer: 'Organizer',
    kickforge: 'Kickforge',
    settings: 'Settings',
  }

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return (
          <HubView
            user={authState.user}
            stats={stats}
            recentFiles={recentFiles}
            onNavigateOrganizer={navigateToOrganizer}
            onNavigateKickforge={navigateToKickforge}
            onNavigateSettings={navigateToSettings}
            onImportFolder={() => setIsImportModalOpen(true)}
            onCreateTag={() => setIsTagManagementOpen(true)}
            onCreateCollection={() => setIsCreateCollectionOpen(true)}
          />
        )
      case 'kickforge':
        return <KickforgeView onBackToHub={navigateToHub} />
      case 'settings':
        return (
          <SettingsView
            user={authState.user}
            onLogout={handleLogout}
            onCheckUpdates={handleCheckUpdates}
            onBackToHub={navigateToHub}
          />
        )
      case 'organizer':
      default:
        return (
          <>
            {/* Sidebar */}
            <Sidebar
              collections={collections}
              tags={tags}
              currentView={organizerView}
              selectedCollectionId={selectedCollectionId}
              selectedTagId={selectedTagId}
              onViewChange={(view) => {
                setOrganizerView(view)
                setSelectedCollectionId(null)
                setSelectedTagId(null)
                loadData()
              }}
              onAddFolder={() => setIsImportModalOpen(true)}
              onCollectionClick={handleCollectionClick}
              onTagClick={handleTagClick}
              onCreateCollection={() => setIsCreateCollectionOpen(true)}
              onManageTags={() => setIsTagManagementOpen(true)}
              onBackToHub={navigateToHub}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-6 border-b border-bg-hover">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearch}
                  onFilterClick={() => setIsFilterPanelOpen(true)}
                  placeholder="Search by name, BPM, key, tags..."
                />
              </div>

              {/* Library View */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredFiles.length === 0 ? (
                  <EmptyState onAddFolder={() => setIsImportModalOpen(true)} currentView={organizerView} />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                    {filteredFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        selected={selectedFiles.includes(file.id)}
                        isPlaying={currentlyPlaying === file.id}
                        onClick={() => handleFileClick(file.id)}
                        onDoubleClick={() => handlePlayFile(file)}
                        onFavoriteToggle={() => handleToggleFavorite(file.id)}
                        onContextMenu={(e) => handleContextMenu(e, file.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions (if files selected) */}
              {selectedFiles.length > 0 && (
                <div className="p-4 bg-bg-secondary border-t border-bg-hover flex items-center gap-3">
                  <span className="text-sm text-text-secondary">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => setIsAddTagsModalOpen(true)}>
                    Add Tags
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setIsAddToCollectionOpen(true)}>
                    Add to Collection
                  </Button>
                  <Button size="sm" variant="danger" className="ml-auto" onClick={() => setIsConfirmDeleteOpen(true)}>
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* File Details Panel */}
            <FileDetailsPanel
              isOpen={detailsPanelFile !== null}
              onClose={() => setDetailsPanelFile(null)}
              file={detailsPanelFile}
              isPlaying={detailsPanelFile ? currentlyPlaying === detailsPanelFile.id : false}
              onPlay={() => detailsPanelFile && handlePlayFile(detailsPanelFile)}
              onToggleFavorite={async () => {
                if (detailsPanelFile) {
                  await handleToggleFavorite(detailsPanelFile.id)
                  setDetailsPanelFile((prev) => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
                }
              }}
              onUpdateRating={handleUpdateRating}
              onRemoveTag={handleRemoveTagFromFile}
            />

            {/* Import Modal */}
            <ImportModal
              isOpen={isImportModalOpen}
              onClose={() => setIsImportModalOpen(false)}
              onImport={handleImport}
            />

            {/* Tag Management Modal */}
            <TagManagementModal
              isOpen={isTagManagementOpen}
              onClose={() => setIsTagManagementOpen(false)}
              tags={tags}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
            />

            {/* Create Collection Modal */}
            <CreateCollectionModal
              isOpen={isCreateCollectionOpen}
              onClose={() => setIsCreateCollectionOpen(false)}
              onCreate={handleCreateCollection}
            />

            {/* Add Tags Modal */}
            <AddTagsModal
              isOpen={isAddTagsModalOpen}
              onClose={() => setIsAddTagsModalOpen(false)}
              tags={tags}
              selectedFileCount={selectedFiles.length}
              onAddTags={handleAddTagsToSelected}
            />

            {/* Add to Collection Modal */}
            <AddToCollectionModal
              isOpen={isAddToCollectionOpen}
              onClose={() => setIsAddToCollectionOpen(false)}
              collections={collections}
              selectedFileCount={selectedFiles.length}
              onAddToCollection={handleAddToCollection}
            />

            {/* Filter Panel */}
            <FilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              tags={tags}
              filters={filters}
              onApplyFilters={handleApplyFilters}
              onResetFilters={handleResetFilters}
            />

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
              isOpen={isConfirmDeleteOpen}
              onClose={() => setIsConfirmDeleteOpen(false)}
              fileCount={selectedFiles.length}
              onConfirm={handleDeleteSelected}
            />

            {/* Context Menu */}
            {contextMenu.isOpen && contextMenu.fileId && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeContextMenu}
                items={createFileContextMenuItems({
                  onPlay: () => {
                    const file = files.find((f) => f.id === contextMenu.fileId)
                    if (file) handlePlayFile(file)
                  },
                  onToggleFavorite: () => {
                    if (contextMenu.fileId) handleToggleFavorite(contextMenu.fileId)
                  },
                  isFavorite: files.find((f) => f.id === contextMenu.fileId)?.is_favorite || false,
                  onAddTags: () => {
                    if (contextMenu.fileId) {
                      setSelectedFiles([contextMenu.fileId])
                      setIsAddTagsModalOpen(true)
                    }
                  },
                  onAddToCollection: () => {
                    if (contextMenu.fileId) {
                      setSelectedFiles([contextMenu.fileId])
                      setIsAddToCollectionOpen(true)
                    }
                  },
                  onShowDetails: () => {
                    const file = files.find((f) => f.id === contextMenu.fileId)
                    if (file) setDetailsPanelFile(file)
                  },
                  onCopyPath: () => {
                    const file = files.find((f) => f.id === contextMenu.fileId)
                    if (file) navigator.clipboard.writeText(file.file_path)
                  },
                  onDelete: () => {
                    if (contextMenu.fileId) {
                      setSelectedFiles([contextMenu.fileId])
                      setIsConfirmDeleteOpen(true)
                    }
                  },
                })}
              />
            )}
          </>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      {/* Titlebar — only shown for tool views (organizer/kickforge/settings), not Hub */}
      {currentView !== 'hub' && (
        <div className="h-14 bg-bg-secondary border-b border-bg-hover flex items-center px-4 gap-4 drag">
          <button
            onClick={navigateToHub}
            className="no-drag flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Hub
          </button>
          <span className="text-sm font-semibold text-text-primary">{viewLabel[currentView]}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-xs text-text-tertiary no-drag">
            {currentView === 'organizer' && (
              <span>{stats.totalFiles} files &bull; {stats.totalTags} tags</span>
            )}
            <span className="text-text-secondary">{authState.user?.email}</span>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {renderView()}
      </div>

      {/* Modals that should work from Hub too */}
      {currentView === 'hub' && (
        <>
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImport}
          />
          <TagManagementModal
            isOpen={isTagManagementOpen}
            onClose={() => setIsTagManagementOpen(false)}
            tags={tags}
            onCreateTag={handleCreateTag}
            onDeleteTag={handleDeleteTag}
          />
          <CreateCollectionModal
            isOpen={isCreateCollectionOpen}
            onClose={() => setIsCreateCollectionOpen(false)}
            onCreate={handleCreateCollection}
          />
        </>
      )}

      {/* Update Popup */}
      {showUpdatePopup && (
        <UpdatePopup
          updateInfo={updateState.info}
          isDownloading={updateState.downloading}
          downloadProgress={updateState.progress}
          isDownloaded={updateState.downloaded}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
    </div>
  )
}

function EmptyState({ onAddFolder, currentView }: { onAddFolder: () => void; currentView: string }) {
  const getContent = () => {
    switch (currentView) {
      case 'samples':
        return {
          title: 'No Samples Yet',
          description: 'Add folders containing your audio samples. We\'ll organize kicks, snares, loops, and one-shots with smart tagging.',
          buttonText: 'Add Sample Folder',
          features: [
            { title: 'Smart Tagging', description: 'Auto-tag based on folder names and filenames' },
            { title: 'BPM Detection', description: 'Extract tempo and key from audio files' },
            { title: 'Instant Preview', description: 'Click to preview any sample' },
          ],
        }
      case 'projects':
        return {
          title: 'No Projects Yet',
          description: 'Add folders containing your DAW projects. We\'ll help you organize FLPs, MIDI files, and project stems.',
          buttonText: 'Add Project Folder',
          features: [
            { title: 'Project Files', description: 'Organize FLP, ALS, and other DAW files' },
            { title: 'MIDI Files', description: 'Keep track of your MIDI compositions' },
            { title: 'Version Control', description: 'Track different versions of your projects' },
          ],
        }
      case 'favorites':
        return {
          title: 'No Favorites Yet',
          description: 'Star your most-used samples and projects to quickly access them here.',
          buttonText: 'Browse Your Library',
          features: [
            { title: 'Quick Access', description: 'Your favorite files at your fingertips' },
            { title: 'Star Anything', description: 'Samples, loops, or entire projects' },
            { title: 'Stay Organized', description: 'Keep your go-to sounds ready' },
          ],
        }
      case 'recent':
        return {
          title: 'No Recent Files',
          description: 'Files you\'ve recently accessed will appear here for quick access.',
          buttonText: 'Browse Your Library',
          features: [
            { title: 'Recently Used', description: 'Jump back to files you were working with' },
            { title: 'Quick Access', description: 'No searching needed' },
            { title: 'Auto Updates', description: 'Always shows your latest activity' },
          ],
        }
      default:
        return {
          title: 'No Files Yet',
          description: 'Get started by adding your sample and project folders. We\'ll scan and organize your entire library.',
          buttonText: 'Add Your First Folder',
          features: [
            { title: 'Smart Tagging', description: 'Auto-tag based on folder structure and filename' },
            { title: 'BPM Detection', description: 'Extract BPM and musical key from audio files' },
            { title: 'Fast Search', description: 'Find any file instantly with advanced filters' },
          ],
        }
    }
  }

  const content = getContent()

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent-primary to-accent-tertiary opacity-20 mb-6" />

      <h2 className="text-2xl font-bold text-text-primary mb-2">{content.title}</h2>
      <p className="text-text-secondary mb-6 max-w-md">{content.description}</p>

      <Button variant="primary" onClick={onAddFolder}>
        {content.buttonText}
      </Button>

      <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl">
        {content.features.map((feature, i) => (
          <Feature key={i} title={feature.title} description={feature.description} />
        ))}
      </div>
    </div>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-tertiary">{description}</p>
    </div>
  )
}

export default App
