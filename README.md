# 🎵 Hardwave Studios Suite

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

**All-in-One Production Suite for Hardstyle Producers**

*KickForge • Melody Generator • File Organizer*

[Features](#features) • [Installation](#installation) • [Build](#building) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## ✨ Features

### 🔥 KickForge
Professional kick designer with layer-based synthesis
- Multiple oscillator types (sine, triangle, square)
- ADSR envelope controls per layer
- Built-in distortion effects
- Real-time playback
- WAV export

### 🎹 Melody Generator
AI-powered melody creation for harder styles
- All 12 keys supported
- Multiple scales (minor, major, harmonic minor, phrygian)
- BPM control (120-180)
- Customizable bar length
- MIDI export
- Piano roll visualization

### 📁 File Organizer
Intelligent sample library management
- Automatic BPM detection
- Key detection
- Smart tagging system
- Search and filtering
- Favorites system
- Metadata management

### 🔐 Authentication & Subscription
- Secure login with website credentials
- JWT token authentication
- Real-time subscription validation
- Session persistence
- License key management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Active Hardwave Studios subscription

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/hardwave-studios-suite.git
cd hardwave-studios-suite

# Install dependencies
npm install

# Configure API URL
cp .env.example .env
# Edit .env and set VITE_API_URL=https://hardwavestudios.com
```

### Development

```bash
# Run in development mode
npm run electron:dev
```

The app will open with hot-reload enabled.

---

## 🔨 Building

### Windows
```bash
npm run build:win
```
Output: `release/[version]/Hardwave Studios Suite-[version]-Setup.exe`

### Linux
```bash
npm run build
```
Output: `release/[version]/Hardwave Studios Suite-[version].AppImage`

### macOS
```bash
npm run build
```
Output: `release/[version]/Hardwave Studios Suite-[version].dmg`

---

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get started in minutes
- **[Build Instructions](BUILD-INSTRUCTIONS.md)** - Detailed build guide
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to production
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[GitHub Setup](GITHUB_SETUP.md)** - GitHub integration
- **[Changelog](CHANGELOG.md)** - Version history

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 28
- **UI Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Build Tool**: Vite
- **Audio**: Web Audio API
- **HTTP Client**: Axios

---

## 📦 Project Structure

```
├── src/
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   ├── SubscriptionRequired.tsx
│   │   ├── MainLayout.tsx
│   │   └── apps/
│   │       ├── KickForge.tsx
│   │       ├── MelodyGenerator.tsx
│   │       └── FileOrganizer.tsx
│   ├── store/
│   │   └── authStore.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── auth.ts
│   └── App.tsx
├── electron/
│   ├── main.ts
│   └── preload.ts
├── .github/
│   └── workflows/
│       ├── build.yml
│       └── test.yml
└── docs/
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📋 Requirements

### For Users
- Windows 10/11, Linux (Ubuntu 20.04+), or macOS 11+
- Active Hardwave Studios subscription
- Internet connection for authentication

### For Developers
- Node.js 18+
- npm 9+
- Git
- Code editor (VS Code recommended)

---

## 🔒 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🎯 Roadmap

### v1.1.0 (Planned)
- [ ] Full MIDI export implementation
- [ ] WAV export with offline rendering
- [ ] File scanner for organizer
- [ ] Preset library system
- [ ] Cloud sync for presets

### v1.2.0 (Planned)
- [ ] Auto-update functionality
- [ ] Advanced effects for KickForge
- [ ] More music scales
- [ ] Sample pack manager
- [ ] VST plugin integration

### v2.0.0 (Future)
- [ ] Built-in DAW
- [ ] Real-time collaboration
- [ ] Cloud storage
- [ ] Mobile companion app

---

## 📧 Support

- **Documentation**: Check the [docs](./docs) folder
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/hardwave-studios-suite/issues)
- **Website**: [hardwavestudios.com](https://hardwavestudios.com)
- **Email**: info@hardwavestudios.com

---

## 🙏 Acknowledgments

- Electron team for the desktop framework
- React community for the UI framework
- All contributors and testers

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/hardwave-studios-suite?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/hardwave-studios-suite?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/hardwave-studios-suite)
![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/hardwave-studios-suite)

---

<div align="center">

**Made with ❤️ by Hardwave Studios**

[Website](https://hardwavestudios.com) • [Discord](https://discord.gg/hardwave) • [Twitter](https://twitter.com/hardwavestudios)

</div>
