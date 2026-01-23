# Hardwave Organizer

**Part of the Hardwave Studios production suite - Ultimate sample organization for harder-styles producers**

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Version](https://img.shields.io/badge/version-0.2.0-purple)
![Studio](https://img.shields.io/badge/Hardwave-Studios-ff00ff)

---

## 🎯 Features

- **Smart Organization**: Tag-based system with BPM, key, genre, energy levels
- **Lightning Fast Search**: Find any sample in <100ms from 10k+ library
- **FL Studio Integration**: Drag-and-drop samples directly into FL Studio
- **Collections**: Organize samples into custom collections
- **Auto-Tagging**: Intelligent auto-tagging based on folder structure
- **Waveform Preview**: Visual waveform display and audio playback
- **Harder-Styles Aesthetic**: Dark mode with neon accents

---

## 🚀 Quick Start

### Prerequisites

- **Windows 10/11** (x64)
- **Node.js 18+** ([download](https://nodejs.org/))
- **FL Studio 20/21** (for integration testing)

### Installation

```bash
# Clone or navigate to project directory
cd fl-studio-organizer

# Install dependencies
npm install

# Run development server
npm run electron:dev
```

The app will launch in development mode with hot reload enabled.

---

## 📦 Project Structure

```
fl-studio-organizer/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry
│   ├── preload.ts        # IPC bridge
│   ├── database/         # SQLite database layer
│   └── services/         # File indexing, audio analysis, etc.
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── stores/           # Zustand state management
│   ├── types/            # TypeScript types
│   ├── lib/              # Utilities
│   ├── App.tsx           # Main app component
│   └── main.tsx          # React entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js    # Design system config
└── vite.config.ts
```

---

## 🎨 Design System

### Colors

**Dark Mode Foundation:**
- Primary: `#0A0A0F`
- Secondary: `#121218`
- Tertiary: `#1A1A24`

**Neon Accents:**
- Primary (Magenta): `#FF00FF`
- Secondary (Cyan): `#00FFFF`
- Tertiary (Pink): `#FF3366`

### Typography

- **Font**: Inter, SF Pro
- **Base Size**: 14px
- **Line Height**: 1.5

---

## 🛠️ Development

### Available Scripts

```bash
# Development mode with hot reload
npm run electron:dev

# Build for production (Windows)
npm run build:win

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

### Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Desktop**: Electron 28
- **Database**: SQLite (better-sqlite3)
- **State**: Zustand
- **Build**: Vite + electron-builder
- **Audio Analysis**: music-metadata
- **File Watching**: chokidar

---

## 📝 Development Roadmap

### ✅ Phase 1: Design & Architecture (COMPLETE)
- [x] Technical specification
- [x] Database schema
- [x] UI/UX design system
- [x] Interface layouts

### ✅ Phase 2: Project Setup (COMPLETE)
- [x] Electron + React + TypeScript scaffold
- [x] Tailwind CSS configuration
- [x] IPC bridge setup

### 🔄 Phase 3: Backend Core (IN PROGRESS)
- [ ] SQLite database implementation
- [ ] File indexing system
- [ ] Audio analysis (BPM/key detection)
- [ ] Tag engine

### 📋 Phase 4: UI Implementation (UPCOMING)
- [ ] Component library
- [ ] Library view (grid/list)
- [ ] Search & filters
- [ ] Detail panel
- [ ] Collections management

### 📋 Phase 5: FL Studio Integration (UPCOMING)
- [ ] Drag-and-drop bridge
- [ ] Kickchain export
- [ ] Usage tracking

### 📋 Phase 6-10: Advanced Features
- Motion design
- Performance optimization
- QA testing
- Beta launch

---

## 🐛 Known Issues

None yet - project just started!

---

## 📄 License

MIT

---

## 🤝 Contributing

This is a personal project currently in active development.
Beta testing opportunities coming soon!

---

---

## 🌐 Hardwave Studios Suite

**Hardwave Organizer** is the first product in the Hardwave Studios ecosystem:

- **Hardwave Organizer** (Current) - Sample & project organization
- **Hardwave Kickforge** (Coming Soon) - Harder-styles kick generator
- **Hardwave Splice** (Coming Soon) - Splice integration
- **Hardwave Intro Maker** (Coming Soon) - Extended intro generator

Visit **[hardwavestudios.com](https://hardwavestudios.com)** for more info

---

**Built for the harder-styles community by Hardwave Studios** 🔥⚡
