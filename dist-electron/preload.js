"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // App info
  getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => electron.ipcRenderer.invoke("app:getPlatform"),
  ping: () => electron.ipcRenderer.invoke("ping"),
  // File operations
  files: {
    getAll: (limit, offset) => electron.ipcRenderer.invoke("files:getAll", limit, offset),
    search: (query, filters) => electron.ipcRenderer.invoke("files:search", query, filters),
    getById: (id) => electron.ipcRenderer.invoke("files:getById", id),
    update: (id, data) => electron.ipcRenderer.invoke("files:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("files:delete", id),
    bulkTag: (fileIds, tagIds) => electron.ipcRenderer.invoke("files:bulkTag", fileIds, tagIds)
  },
  // Tag operations (to be implemented)
  tags: {
    getAll: () => electron.ipcRenderer.invoke("tags:getAll"),
    create: (data) => electron.ipcRenderer.invoke("tags:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("tags:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("tags:delete", id)
  },
  // Collection operations
  collections: {
    getAll: () => electron.ipcRenderer.invoke("collections:getAll"),
    create: (data) => electron.ipcRenderer.invoke("collections:create", data),
    getFiles: (collectionId) => electron.ipcRenderer.invoke("collections:getFiles", collectionId),
    addFiles: (collectionId, fileIds) => electron.ipcRenderer.invoke("collections:addFiles", collectionId, fileIds),
    removeFiles: (collectionId, fileIds) => electron.ipcRenderer.invoke("collections:removeFiles", collectionId, fileIds)
  },
  // Statistics
  stats: {
    get: () => electron.ipcRenderer.invoke("stats:get")
  },
  // Folder operations
  folders: {
    selectFolder: () => electron.ipcRenderer.invoke("folders:selectFolder"),
    scan: (folderPath, options) => electron.ipcRenderer.invoke("folders:scan", folderPath, options),
    scanMultiple: (folderPaths, options) => electron.ipcRenderer.invoke("folders:scanMultiple", folderPaths, options),
    onScanProgress: (callback) => {
      const subscription = (_, progress) => callback(progress);
      electron.ipcRenderer.on("scan:progress", subscription);
      return () => electron.ipcRenderer.removeListener("scan:progress", subscription);
    }
  },
  // Audio analysis
  audio: {
    analyze: (fileId, filePath) => electron.ipcRenderer.invoke("audio:analyze", fileId, filePath),
    batchAnalyze: (files) => electron.ipcRenderer.invoke("audio:batchAnalyze", files),
    onProgress: (callback) => {
      const subscription = (_, progress) => callback(progress);
      electron.ipcRenderer.on("audio:progress", subscription);
      return () => electron.ipcRenderer.removeListener("audio:progress", subscription);
    }
  },
  // FL Studio integration (to be implemented)
  fl: {
    dragFile: (fileId) => electron.ipcRenderer.invoke("fl:dragFile", fileId)
  }
});
