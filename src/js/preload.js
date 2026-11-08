const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  messageSend: (callback) => ipcRenderer.on("message2", callback),
  messageReturn: (title) => ipcRenderer.send("message", title),
  //外部コマンドによる音声合成（fork 独自。Issue #32）。汎用の send / on は公開しない
  ttsSpeakCustomCommand: (text) => ipcRenderer.send("tts:speak", { text: String(text ?? "") }),
  ttsTestCustomCommand: (params) => ipcRenderer.invoke("tts:test", {
    template: String(params?.template ?? ""),
    text: String(params?.text ?? ""),
    rate: Number(params?.rate),
    pitch: Number(params?.pitch),
    volume: Number(params?.volume),
  }),
});
