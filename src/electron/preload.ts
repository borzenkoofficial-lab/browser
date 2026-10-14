import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexus", {
  createTab: (id: string, url?: string) => ipcRenderer.invoke("browser:create", id, url),
  navigate: (id: string, url: string) => ipcRenderer.invoke("browser:navigate", id, url),
  back: (id: string) => ipcRenderer.invoke("browser:back", id),
  forward: (id: string) => ipcRenderer.invoke("browser:forward", id),
  reload: (id: string) => ipcRenderer.invoke("browser:reload", id),
  setBounds: (id: string, bounds: { x: number; y: number; width: number; height: number } | null) => ipcRenderer.invoke("browser:bounds", id, bounds),
  closeTab: (id: string) => ipcRenderer.invoke("browser:close", id),
  getTabState: (id: string) => ipcRenderer.invoke("browser:state", id),
  listProspects: () => ipcRenderer.invoke("prospects:list"),
  saveProspects: (records: unknown[]) => ipcRenderer.invoke("prospects:save", records),
  listBookmarks: () => ipcRenderer.invoke("bookmarks:list"),
  saveBookmarks: (records: unknown[]) => ipcRenderer.invoke("bookmarks:save", records),
  listHistory: () => ipcRenderer.invoke("history:list"),
  saveHistory: (records: unknown[]) => ipcRenderer.invoke("history:save", records),
  getVersion: () => ipcRenderer.invoke("app:version"),
  onTitle: (callback: (data: { id: string; title: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { id: string; title: string }) => callback(data);
    ipcRenderer.on("browser:title", listener);
    return () => ipcRenderer.removeListener("browser:title", listener);
  },
  onNavigate: (callback: (data: { id: string; url: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { id: string; url: string }) => callback(data);
    ipcRenderer.on("browser:navigate", listener);
    return () => ipcRenderer.removeListener("browser:navigate", listener);
  },
  onError: (callback: (data: { id: string; code: number; description: string; url: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { id: string; code: number; description: string; url: string }) => callback(data);
    ipcRenderer.on("browser:error", listener);
    return () => ipcRenderer.removeListener("browser:error", listener);
  }
});