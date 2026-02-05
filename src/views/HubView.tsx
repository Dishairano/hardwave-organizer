import { useState } from 'react'
import { Button } from '../components/Button'
import type { File } from '../types'

const proTips = [
  { title: 'Keyboard Shortcuts', text: 'Press Space to preview any selected sample instantly.' },
  { title: 'Smart Tagging', text: 'Drag a folder in and tags will be auto-generated from folder names.' },
  { title: 'Quick Filters', text: 'Use the filter panel to narrow down by BPM, key, or energy level.' },
  { title: 'Collections', text: 'Group related samples into collections for quick project access.' },
  { title: 'Kickforge Layers', text: 'Try layering a short punch with a long tail for massive hardstyle kicks.' },
  { title: 'BPM Detection', text: 'Import your loops and we\'ll auto-detect BPM for easy tempo matching.' },
]

interface HubViewProps {
  user: { email: string; displayName: string | null } | null
  stats: { totalFiles: number; totalTags: number; totalCollections: number; totalFavorites: number }
  recentFiles: File[]
  onNavigateOrganizer: () => void
  onNavigateKickforge: () => void
  onNavigateSettings: () => void
  onImportFolder: () => void
  onCreateTag: () => void
  onCreateCollection: () => void
}

export function HubView({
  user,
  stats,
  recentFiles,
  onNavigateOrganizer,
  onNavigateKickforge,
  onNavigateSettings,
  onImportFolder,
  onCreateTag,
  onCreateCollection,
}: HubViewProps) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * proTips.length))

  const greeting = getGreeting()
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Producer'
  const tip = proTips[tipIndex]
  const hasFiles = stats.totalFiles > 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="h-14 bg-bg-secondary border-b border-bg-hover flex items-center px-6 drag">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-tertiary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-text-primary">Hardwave Suite</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 no-drag">
          <span className="text-xs text-text-tertiary">{user?.email}</span>
          <button
            onClick={onNavigateSettings}
            className="w-8 h-8 rounded-lg bg-bg-hover hover:bg-bg-primary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-primary/10 to-accent-tertiary/10 border border-accent-primary/20 p-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary to-accent-tertiary" />
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              {greeting}, {displayName}
            </h1>
            <p className="text-text-secondary mb-4">Welcome to your production hub</p>

            <div className="flex gap-6">
              <StatBadge label="Files" value={stats.totalFiles} />
              <StatBadge label="Tags" value={stats.totalTags} />
              <StatBadge label="Collections" value={stats.totalCollections} />
              <StatBadge label="Favorites" value={stats.totalFavorites} />
            </div>
          </div>

          {/* Tool Cards */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Tools</h2>
            <div className="grid grid-cols-2 gap-4">
              <ToolCard
                name="Organizer"
                description="Browse, search, tag and organize your entire sample library with smart BPM detection and instant preview."
                icon={
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                }
                stat={`${stats.totalFiles} files`}
                onClick={onNavigateOrganizer}
              />
              <ToolCard
                name="Kickforge"
                description="Design powerful hardstyle, rawstyle and hardcore kicks with 3-layer synthesis, distortion and WAV export."
                icon={
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                }
                stat="Kick designer"
                onClick={onNavigateKickforge}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Quick Actions</h2>
            <div className="flex gap-3">
              <Button variant="primary" onClick={onImportFolder}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Folder
              </Button>
              <Button variant="secondary" onClick={onCreateTag}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7h.01M7 3h5a1.99 1.99 0 011.41.59l7 7a2 2 0 010 2.82l-7 7a2 2 0 01-2.82 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Create Tag
              </Button>
              <Button variant="secondary" onClick={onCreateCollection}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Create Collection
              </Button>
              <Button variant="secondary" onClick={onNavigateOrganizer}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Files
              </Button>
            </div>
          </div>

          {/* Recent Files or Getting Started */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              {hasFiles ? 'Recent Files' : 'Getting Started'}
            </h2>

            {hasFiles && recentFiles.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentFiles.map((file) => (
                  <RecentFileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <GettingStartedStep
                  step={1}
                  title="Import your samples"
                  description="Add folders containing your kicks, snares, loops and one-shots."
                />
                <GettingStartedStep
                  step={2}
                  title="Organize with tags"
                  description="Auto-tag from folder names or create custom tags and collections."
                />
                <GettingStartedStep
                  step={3}
                  title="Start producing"
                  description="Search, preview and drag files straight into your DAW."
                />
              </div>
            )}
          </div>

          {/* Pro Tip */}
          <div className="bg-bg-secondary rounded-xl p-5 border border-bg-hover flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-1">Pro Tip</div>
              <div className="text-sm font-medium text-text-primary">{tip.title}</div>
              <div className="text-sm text-text-secondary mt-0.5">{tip.text}</div>
            </div>
            <button
              onClick={() => setTipIndex((tipIndex + 1) % proTips.length)}
              className="text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
              title="Next tip"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-text-primary">{value.toLocaleString()}</span>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  )
}

function ToolCard({
  name,
  description,
  icon,
  stat,
  onClick,
}: {
  name: string
  description: string
  icon: React.ReactNode
  stat: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-5 bg-bg-secondary rounded-xl border border-bg-hover hover:border-accent-primary/40 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-tertiary flex items-center justify-center text-white group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div>
          <div className="text-base font-bold text-text-primary">{name}</div>
          <div className="text-xs text-text-tertiary">{stat}</div>
        </div>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </button>
  )
}

function RecentFileCard({ file }: { file: File }) {
  const ext = file.file_extension?.replace('.', '').toUpperCase() || '?'

  return (
    <div className="flex-shrink-0 w-36 bg-bg-secondary rounded-lg border border-bg-hover p-3 hover:border-accent-primary/30 transition-colors">
      <div className="w-full h-16 rounded bg-bg-hover flex items-center justify-center mb-2">
        <span className="text-xs font-bold text-text-tertiary">{ext}</span>
      </div>
      <div className="text-xs font-medium text-text-primary truncate" title={file.filename}>
        {file.filename}
      </div>
      {file.bpm && (
        <div className="text-[10px] text-text-tertiary mt-0.5">{file.bpm} BPM</div>
      )}
    </div>
  )
}

function GettingStartedStep({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="bg-bg-secondary rounded-xl p-5 border border-bg-hover text-center">
      <div className="w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary text-sm font-bold flex items-center justify-center mx-auto mb-3">
        {step}
      </div>
      <div className="text-sm font-semibold text-text-primary mb-1">{title}</div>
      <p className="text-xs text-text-tertiary leading-relaxed">{description}</p>
    </div>
  )
}
