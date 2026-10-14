import { app, BrowserWindow, WebContentsView, ipcMain, shell, dialog } from "electron";
import path from "node:path";
import { normalizeWebUrl } from "./url";
import { createBackup, initializeDatabase, listRecords, replaceRecords, restoreBackup } from "./storage/database";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let downloadsConfigured = false;
const browserViews = new Map<string, WebContentsView>();
const viewBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 940, minWidth: 1080, minHeight: 700,
    backgroundColor: "#10131a",
    title: "NEXUS Business Browser",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (isDev) void mainWindow.loadURL("http://127.0.0.1:5173");
  else void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  mainWindow.on("resize", syncActiveBounds);
  mainWindow.on("closed", () => { mainWindow = null; });
}

function syncActiveBounds() {
  if (!mainWindow) return;
  for (const [id, view] of browserViews) {
    const bounds = viewBounds.get(id);
    if (bounds) view.setBounds(bounds);
  }
}


ipcMain.handle("browser:create", async (_event, id: string, initialUrl?: string) => {
  if (!mainWindow || browserViews.has(id)) return;
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      partition: "persist:nexus-browser"
    }
  });
  browserViews.set(id, view);
  if (!downloadsConfigured) {
    downloadsConfigured = true;
    view.webContents.session.on("will-download", (_event, item, contents) => {
      const owner = BrowserWindow.fromWebContents(contents) ?? mainWindow;
      if (!owner) { item.cancel(); return; }
      void dialog.showSaveDialog(owner, { defaultPath: item.getFilename() }).then(result => {
        if (result.canceled || !result.filePath) item.cancel();
        else item.setSavePath(result.filePath);
      }).catch(() => item.cancel());
    });
  }
  mainWindow.contentView.addChildView(view);
  view.setBounds(viewBounds.get(id) ?? { x: 0, y: 150, width: 900, height: 600 });
  view.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (["http:", "https:"].includes(parsed.protocol)) void shell.openExternal(parsed.toString());
    } catch { /* Ignore malformed external URLs. */ }
    return { action: "deny" };
  });
  view.webContents.on("will-navigate", (event, url) => {
    try {
      const protocol = new URL(url).protocol;
      if (!["http:", "https:"].includes(protocol)) event.preventDefault();
    } catch { event.preventDefault(); }
  });
  view.webContents.on("page-title-updated", (_e, title) => mainWindow?.webContents.send("browser:title", { id, title }));
  view.webContents.on("did-navigate", (_e, url) => mainWindow?.webContents.send("browser:navigate", { id, url }));
  view.webContents.on("did-navigate-in-page", (_e, url) => mainWindow?.webContents.send("browser:navigate", { id, url }));
  view.webContents.on("did-fail-load", (_e, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) mainWindow?.webContents.send("browser:error", { id, code, description, url });
  });
  await view.webContents.loadURL(normalizeWebUrl(initialUrl ?? "https://www.google.com"));
});

ipcMain.handle("browser:navigate", async (_event, id: string, url: string) => {
  const view = browserViews.get(id);
  if (view) await view.webContents.loadURL(normalizeWebUrl(url));
});
ipcMain.handle("browser:back", (_event, id: string) => {
  const view = browserViews.get(id);
  if (view?.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack();
});
ipcMain.handle("browser:forward", (_event, id: string) => {
  const view = browserViews.get(id);
  if (view?.webContents.navigationHistory.canGoForward()) view.webContents.navigationHistory.goForward();
});
ipcMain.handle("browser:reload", (_event, id: string) => browserViews.get(id)?.webContents.reload());
ipcMain.handle("browser:bounds", (_event, id: string, bounds: { x: number; y: number; width: number; height: number } | null) => {
  if (!bounds) {
    viewBounds.delete(id);
    const view = browserViews.get(id);
    if (view && mainWindow) mainWindow.contentView.removeChildView(view);
    return;
  }
  viewBounds.set(id, bounds);
  const view = browserViews.get(id);
  if (view && mainWindow) {
    if (!mainWindow.contentView.children.includes(view)) mainWindow.contentView.addChildView(view);
    view.setBounds(bounds);
  }
});
ipcMain.handle("browser:close", (_event, id: string) => {
  const view = browserViews.get(id);
  if (view) {
    if (mainWindow) mainWindow.contentView.removeChildView(view);
    view.webContents.close();
    browserViews.delete(id);
    viewBounds.delete(id);
  }
});
ipcMain.handle("browser:state", (_event, id: string) => {
  const view = browserViews.get(id);
  if (!view) return null;
  return { url: view.webContents.getURL(), title: view.webContents.getTitle(), loading: view.webContents.isLoading() };
});
ipcMain.handle("browser:extract", async (_event, id: string) => {
  const view = browserViews.get(id);
  if (!view) throw new Error("Вкладка не найдена");
  const page = await view.webContents.executeJavaScript("({ title: document.title || \"\", description: document.querySelector(\"meta[name='description']\")?.content || \"\", text: (document.body?.innerText || \"\").slice(0, 100000) })");
  return { url: view.webContents.getURL(), ...page };
});
ipcMain.handle("prospects:list", () => listRecords("prospects"));
ipcMain.handle("bookmarks:list", () => listRecords("bookmarks"));
ipcMain.handle("bookmarks:save", (_event, records: unknown) => replaceRecords("bookmarks", records));
ipcMain.handle("history:list", () => listRecords("history"));
ipcMain.handle("history:save", (_event, records: unknown) => replaceRecords("history", records));
ipcMain.handle("estimates:list", () => listRecords("estimates"));
ipcMain.handle("estimates:save", (_event, records: unknown) => replaceRecords("estimates", records));
ipcMain.handle("documents:list", () => listRecords("documents"));
ipcMain.handle("documents:save", (_event, records: unknown) => replaceRecords("documents", records));
ipcMain.handle("prospects:save", (_event, records: unknown) => replaceRecords("prospects", records));
ipcMain.handle("storage:backup", async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const result = await dialog.showSaveDialog({
    title: "Создать резервную копию NEXUS",
    defaultPath: path.join(app.getPath("userData"), "backups", `nexus-backup-${stamp}.sqlite`),
    filters: [{ name: "SQLite backup", extensions: ["sqlite"] }]
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  return { cancelled: false, ...(await createBackup(result.filePath)) };
});
ipcMain.handle("storage:restore", async () => {
  const result = await dialog.showOpenDialog({
    title: "Выберите резервную копию NEXUS",
    properties: ["openFile"],
    filters: [{ name: "SQLite backup", extensions: ["sqlite", "db"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { cancelled: true };
  return { cancelled: false, ...(await restoreBackup(result.filePaths[0])) };
});
ipcMain.handle("app:version", () => app.getVersion());
app.whenReady().then(async () => {
  try {
    await initializeDatabase(app.getPath("userData"), path.join(app.getAppPath(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"));
    createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось открыть локальную базу";
    dialog.showErrorBox("NEXUS — ошибка локальных данных", message + "\n\nИсходные JSON-файлы не удалены. Не переустанавливайте приложение поверх пользовательских данных; сохраните резервную копию и обратитесь в поддержку.");
    app.quit();
  }
});
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });