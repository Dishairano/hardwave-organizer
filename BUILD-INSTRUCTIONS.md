# Building FL Studio Organizer for Windows

## The Issue

The current portable ZIP was built on Linux and has native module issues. The app gets stuck at "0 / 1676 files" because the SQLite database can't initialize.

## Solution: Build on Windows

### Requirements
- Windows 10/11
- Node.js 18+ 
- Git

### Steps

1. **Clone the repository on Windows:**
```bash
git clone https://github.com/Dishairano/fl-studio-organizer.git
cd fl-studio-organizer
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the Windows installer:**
```bash
npm run build:win
```

This creates:
- `release/0.1.0/FL Studio Organizer Setup 0.1.0.exe` - NSIS installer
- `release/0.1.0/win-unpacked/` - Portable folder

### What Gets Fixed

Building on Windows ensures:
- ✅ better-sqlite3 compiled for Windows x64
- ✅ Native modules properly bundled
- ✅ Database initialization works
- ✅ File scanning completes
- ✅ Audio analysis functions
- ✅ All features operational

### Testing

After building, test the installer:
1. Run the .exe installer
2. Or run `FL Studio Organizer.exe` from win-unpacked folder
3. Click "Import Folder"
4. Select a folder with audio files
5. Verify scanning completes and files appear

## Alternative: Docker Build (Advanced)

You can also try building with Wine on Linux, but results may vary:

```bash
# Install Wine with proper 32-bit support
sudo dpkg --add-architecture i386
sudo apt-get install wine32 wine64

# Then build
npm run build:win
```

## Current Build Status

The v0.1.0 release ZIP works for:
- ✅ Launching the app
- ✅ UI displays correctly
- ❌ Database operations (stuck scanner)
- ❌ File importing

A proper Windows build will fix all issues.
