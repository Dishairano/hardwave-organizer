# 🚀 FL Studio Organizer - Quick Start Guide

## Get Running in 3 Steps

### **Step 1: Install Dependencies**
```bash
cd fl-studio-organizer
npm install
```

Wait for all packages to install (~2-3 minutes).

---

### **Step 2: Launch the App**
```bash
npm run electron:dev
```

The app will:
- ✅ Open automatically
- ✅ Initialize database
- ✅ Show DevTools (for debugging)

---

### **Step 3: Add Your First Folder**

1. Click **"Add Folder"** button in sidebar
2. Select a folder with audio files (WAV, MP3, FLAC, etc.)
3. Watch the progress bar as files are scanned
4. See your files appear in the grid!

---

## 🎯 What You Can Do

- **Browse Files**: Scroll through the grid view
- **Search**: Type in the search bar to filter by filename
- **Select Files**: Click files to select them (bottom action bar appears)
- **View Metadata**: See BPM, key, duration, tags on each file card
- **Check Stats**: View file/tag counts in sidebar footer

---

## 🎨 What You'll See

### **Empty State** (First Launch)
Beautiful onboarding screen explaining the app features.

### **After Import**
Grid of file cards showing:
- Waveform preview (placeholder)
- File name and type icon
- BPM and key badges
- Tags (auto-tagged!)
- Duration and file size

### **Sidebar**
- Add Folder button
- Quick navigation (Library, Favorites, Recent)
- Collections list
- Tags list
- Statistics footer

---

## 🧪 Test Commands (Optional)

Open DevTools Console (`Ctrl+Shift+I`) and try:

```javascript
// Check stats
await window.electron.stats.get()

// Get all tags
await window.electron.tags.getAll()

// Get files
await window.electron.files.getAll(10, 0)
```

---

## 📂 Example Folder Structure

For best auto-tagging results, organize like this:

```
My Samples/
├── Hardstyle/
│   ├── Kicks/
│   │   ├── Raw Kick 150 BPM.wav
│   │   └── Euphoric Kick 155 BPM.wav
│   ├── Leads/
│   └── Screeches/
├── Rawstyle/
└── Hardcore/
```

The app will auto-tag based on folder names and filenames!

---

## 🐛 Troubleshooting

**App won't launch?**
- Ensure Node.js 18+ is installed
- Run `npm install` again
- Delete `node_modules` and reinstall

**Scan fails?**
- Check folder permissions
- Try a smaller folder first
- Look for errors in console

**Database issues?**
- Location: `%APPDATA%\fl-studio-organizer\fl-organizer.db`
- Delete file to reset
- Restart app

---

## ✅ You're Ready!

**Now go organize your sample library!** 🎉

For more details, see `FINAL-BUILD-REPORT.md`
