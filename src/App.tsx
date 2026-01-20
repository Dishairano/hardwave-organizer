import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { FileCard } from './components/FileCard'
import { ImportModal } from './components/ImportModal'
import { Button } from './components/Button'
import type { File, Tag as TagType, Collection } from './types'

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [stats, setStats] = useState({ totalFiles: 0, totalTags: 0, totalCollections: 0, totalFavorites: 0 })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load files
      const loadedFiles = await window.electron.files.getAll(100, 0)
      setFiles(loadedFiles)

      // Load tags
      const loadedTags = await window.electron.tags.getAll()
      setTags(loadedTags)

      // Load collections
      const loadedCollections = await window.electron.collections.getAll()
      setCollections(loadedCollections)

      // Load stats
      const loadedStats = await window.electron.stats.get()
      setStats(loadedStats)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleImport = async () => {
    try {
      // Select folder
      const folderPath = await window.electron.folders.selectFolder()
      if (!folderPath) return

      // Scan folder
      const result = await window.electron.folders.scan(folderPath, {
        recursive: true,
        autoTag: true,
      })

      console.log('Scan result:', result)

      // Reload data
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
      // Load all files
      const allFiles = await window.electron.files.getAll(100, 0)
      setFiles(allFiles)
    } else {
      // Search
      const results = await window.electron.files.search(query, {})
      setFiles(results.files)
    }
  }

  // Filter files by search query (client-side for now)
  const filteredFiles = files.filter((file) => {
    if (!searchQuery.trim()) return true
    return file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      {/* Titlebar */}
      <div className="h-8 bg-bg-secondary border-b border-bg-hover flex items-center px-4 drag">
        <span className="text-sm font-semibold">FL Studio Organizer</span>
        <span className="ml-auto text-xs text-text-tertiary">
          {stats.totalFiles} files • {stats.totalTags} tags
        </span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          collections={collections}
          tags={tags}
          onAddFolder={() => setIsImportModalOpen(true)}
          onCollectionClick={(id) => console.log('Collection clicked:', id)}
          onTagClick={(id) => console.log('Tag clicked:', id)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-6 border-b border-bg-hover">
            <SearchBar
              value={searchQuery}
              onChange={handleSearch}
              onFilterClick={() => console.log('Filters clicked')}
              placeholder="Search by name, BPM, key, tags..."
            />
          </div>

          {/* Library View */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredFiles.length === 0 ? (
              <EmptyState onAddFolder={() => setIsImportModalOpen(true)} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    selected={selectedFiles.includes(file.id)}
                    onClick={() => handleFileClick(file.id)}
                    onDoubleClick={() => console.log('Play file:', file.filename)}
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
              <Button size="sm" variant="secondary">
                Add Tags
              </Button>
              <Button size="sm" variant="secondary">
                Add to Collection
              </Button>
              <Button size="sm" variant="danger" className="ml-auto">
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  )
}

function EmptyState({ onAddFolder }: { onAddFolder: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent-primary to-accent-tertiary opacity-20 mb-6" />

      <h2 className="text-2xl font-bold text-text-primary mb-2">No Files Yet</h2>
      <p className="text-text-secondary mb-6 max-w-md">
        Get started by adding your sample folders. We'll scan and organize your entire library with
        smart tags and BPM detection.
      </p>

      <Button variant="primary" onClick={onAddFolder}>
        Add Your First Folder
      </Button>

      <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl">
        <Feature
          title="Smart Tagging"
          description="Automatically tag samples based on folder structure and filename"
        />
        <Feature
          title="BPM Detection"
          description="Extract BPM and musical key from audio files"
        />
        <Feature
          title="Fast Search"
          description="Find any sample instantly with advanced filters"
        />
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
