const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  messageSend: (callback) => ipcRenderer.on("message2", callback),
  messageReturn: (title) => ipcRenderer.send("message", title),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
});
