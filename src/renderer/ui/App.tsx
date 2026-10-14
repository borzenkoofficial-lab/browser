import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { parseProspectsCsv } from "../lib/csv";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Bookmark,
  Building2, CalendarClock, Calculator, Check, ChevronDown, CircleHelp, Command, Compass, Download, ExternalLink,
  FileSpreadsheet, FileText, Filter, Globe2, History as HistoryIcon, LayoutDashboard, ListFilter, Menu, Printer, ClipboardList,
  MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles, Star, Target,
  Trash2, Users, WandSparkles, X, Zap
} from "lucide-react";

type ActivityEntry = { id: string; date: string; type: string; note: string };
type Prospect = {
  id: string; company: string; website: string; contact: string; email: string;
  phone: string; location: string; nextAction: string; followUpDate: string; industry: string; status: "Новый" | "В работе" | "Приоритет" | "Не подходит";
  source: string; notes: string; createdAt: string; tags?: string[]; activity?: ActivityEntry[];
};
type Tab = { id: string; title: string; url: string };
type BookmarkItem = { id: string; title: string; url: string; createdAt: string };
type HistoryItem = { id: string; title: string; url: string; visitedAt: string };
type EstimateLine = { id: string; name: string; unit: string; quantity: number; price: number; cost: number };
type Estimate = { id: string; title: string; customer: string; object: string; status: "Черновик" | "КП подготовлено" | "Согласовано"; notes: string; items: EstimateLine[]; createdAt: string; updatedAt: string };
type BusinessDocument = { id: string; number: string; title: string; template: "premium" | "classic" | "minimal"; customer: string; supplier: string; object: string; date: string; validUntil: string; terms: string; notes: string; status: "Черновик" | "Подготовлен" | "Отправлен" | "Согласован"; items: EstimateLine[]; estimateId: string; createdAt: string; updatedAt: string };
type ShiftReport = { id: string; date: string; workers: number; hours: number; quantity: number; revenue: number; cost: number; notes: string };
type ProjectObject = { id: string; name: string; customer: string; address: string; status: "Подготовка" | "В работе" | "Приостановлен" | "Завершён"; startDate: string; endDate: string; estimateId: string; plannedRevenue: number; notes: string; shifts: ShiftReport[]; createdAt: string; updatedAt: string };
type FinanceEntry = { id: string; type: "Доход" | "Расход"; title: string; category: string; amount: number; date: string; status: "План" | "Оплачено"; counterparty: string; objectId: string; notes: string; createdAt: string; updatedAt: string };
type Supplier = { id: string; name: string; category: string; contact: string; phone: string; email: string; website: string; region: string; paymentTerms: string; deliveryDays: number; rating: number; status: "Активен" | "На паузе"; notes: string; createdAt: string; updatedAt: string };
type Section = "home" | "prospects" | "research" | "saved" | "history" | "settings" | "estimates" | "documents" | "objects" | "finance" | "suppliers";

const starterProspects: Prospect[] = [];
const makeId = () => crypto.randomUUID();
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url || "Новая вкладка"; } };

function App() {
  const [section, setSection] = useState<Section>("home");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [pageError, setPageError] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>(starterProspects);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [objects, setObjects] = useState<ProjectObject[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prospectQuery, setProspectQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все статусы");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [version, setVersion] = useState("0.1.0");
  const [toast, setToast] = useState("");
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [storageBusy, setStorageBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [form, setForm] = useState({ company: "", website: "", contact: "", email: "", phone: "", location: "Москва и Московская область", nextAction: "", followUpDate: "", industry: "Строительство", status: "Новый" as Prospect["status"], source: "Сайт компании", notes: "", tags: "", activityType: "Звонок", activityNote: "" });
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<string | null>(activeTab);
  const historyRef = useRef<HistoryItem[]>(history);
  const historySaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  activeTabRef.current = activeTab;
  const active = tabs.find(tab => tab.id === activeTab) ?? null;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    void window.nexus.listProspects().then((items) => {
      if (Array.isArray(items)) setProspects(items as Prospect[]);
    }).catch(() => notify("Не удалось загрузить локальную базу"));
    void window.nexus.listBookmarks().then(items => { if (Array.isArray(items)) setBookmarks(items as BookmarkItem[]); }).catch(() => undefined);
    void window.nexus.listHistory().then(items => {
      if (Array.isArray(items)) {
        historyRef.current = items as HistoryItem[];
        setHistory(items as HistoryItem[]);
      }
    }).catch(() => notify("Не удалось загрузить историю посещений"));
    void window.nexus.listEstimates().then(items => { if (Array.isArray(items)) setEstimates(items as Estimate[]); }).catch(() => notify("Не удалось загрузить сметы"));
    void window.nexus.listDocuments().then(items => { if (Array.isArray(items)) setDocuments(items as BusinessDocument[]); }).catch(() => notify("Не удалось загрузить документы"));
    void window.nexus.listObjects().then(items => { if (Array.isArray(items)) setObjects(items as ProjectObject[]); }).catch(() => notify("Не удалось загрузить объекты"));
    void window.nexus.listFinance().then(items => { if (Array.isArray(items)) setFinance(items as FinanceEntry[]); }).catch(() => notify("Не удалось загрузить финансовые операции"));
    void window.nexus.listSuppliers().then(items => { if (Array.isArray(items)) setSuppliers(items as Supplier[]); }).catch(() => notify("Не удалось загрузить поставщиков"));
    void window.nexus.getVersion().then(setVersion).catch(() => undefined);
    const offTitle = window.nexus.onTitle(({ id, title }) => setTabs(prev => prev.map(t => t.id === id ? { ...t, title: title || shortHost(t.url) } : t)));
    const offNavigate = window.nexus.onNavigate(({ id, url }) => {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, url, title: shortHost(url) } : t));
      historySaveQueueRef.current = historySaveQueueRef.current.then(async () => {
        const previous = historyRef.current;
        const next: HistoryItem[] = [{ id: makeId(), title: shortHost(url), url, visitedAt: new Date().toISOString() }, ...previous.filter(item => item.url !== url)].slice(0, 500);
        try {
          await window.nexus.saveHistory(next);
          historyRef.current = next;
          setHistory(next);
        } catch {
          notify("Не удалось сохранить историю посещений");
        }
      }).catch(() => {
        notify("Не удалось сохранить историю посещений");
      });
    });
    const offError = window.nexus.onError(({ id, description }) => {
      if (id === activeTabRef.current) setPageError(description || "Не удалось загрузить страницу");
    });
    return () => { offTitle(); offNavigate(); offError(); };
  }, []);

  useEffect(() => {
    const sessionKey = "nexus.businessBrowser.session.v1";
    try {
      const raw = window.localStorage.getItem(sessionKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "tabs" in parsed && Array.isArray((parsed as { tabs: unknown }).tabs)) {
          const saved = (parsed as { tabs: unknown[]; activeIndex?: unknown }).tabs
            .filter((item): item is { title?: string; url: string } => {
              if (!item || typeof item !== "object" || !("url" in item) || typeof (item as { url: unknown }).url !== "string") return false;
              try {
                const url = new URL((item as { url: string }).url);
                return url.protocol === "http:" || url.protocol === "https:";
              } catch { return false; }
            })
            .slice(0, 12);
          const restored = saved.map(item => ({ id: makeId(), title: typeof item.title === "string" ? item.title : shortHost(item.url), url: item.url }));
          if (restored.length) {
            const rawIndex = (parsed as { activeIndex?: unknown }).activeIndex;
            const activeIndex = typeof rawIndex === "number" && Number.isInteger(rawIndex) ? Math.min(Math.max(rawIndex, 0), restored.length - 1) : restored.length - 1;
            setTabs(restored);
            setActiveTab(restored[activeIndex].id);
            setAddress(restored[activeIndex].url);
            void Promise.all(restored.map(async tab => {
              try {
                await window.nexus.createTab(tab.id, tab.url);
              } catch {
                setTabs(previous => previous.filter(item => item.id !== tab.id));
                notify("Не удалось восстановить одну из вкладок");
              }
            }));
          }
        }
      }
    } catch {
      notify("Не удалось прочитать сохранённый сеанс браузера");
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    try {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
      window.localStorage.setItem("nexus.businessBrowser.session.v1", JSON.stringify({
        tabs: tabs.map(({ title, url }) => ({ title, url })),
        activeIndex: activeIndex >= 0 ? activeIndex : Math.max(0, tabs.length - 1)
      }));
    } catch {
      notify("Не удалось сохранить сеанс браузера");
    }
  }, [tabs, activeTab, sessionReady]);

  const syncBounds = useCallback(() => {
    const node = viewportRef.current;
    if (!node || !activeTab) return;
    if (showAdd) { void window.nexus.setBounds(activeTab, null); return; }
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      void window.nexus.setBounds(activeTab, null);
      return;
    }
    void window.nexus.setBounds(activeTab, {
      x: Math.round(rect.left), y: Math.round(rect.top),
      width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height))
    });
  }, [activeTab, showAdd]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(syncBounds);
    observer.observe(node);
    window.addEventListener("resize", syncBounds);
    const frame = requestAnimationFrame(syncBounds);
    return () => { observer.disconnect(); window.removeEventListener("resize", syncBounds); cancelAnimationFrame(frame); };
  }, [syncBounds, section, tabs.length]);

  useEffect(() => {
    for (const tab of tabs) {
      if (tab.id !== activeTab) void window.nexus.setBounds(tab.id, null);
    }
    if (activeTab) requestAnimationFrame(syncBounds);
  }, [activeTab, tabs, syncBounds]);

  const createBackup = async () => {
    setStorageBusy(true);
    try {
      const result = await window.nexus.createBackup();
      if (result.cancelled) return;
      notify(result.integrity === "ok" ? "Резервная копия создана и проверена" : "Резервная копия создана");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось создать резервную копию");
    } finally {
      setStorageBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!confirm("Восстановление заменит текущие компании, закладки, историю, сметы, документы, объекты, финансы и поставщиков данными из выбранной копии. Перед заменой будет создана страховочная копия. Продолжить?")) return;
    setStorageBusy(true);
    let restoreApplied = false;
    try {
      const result = await window.nexus.restoreBackup();
      if (result.cancelled) return;
      restoreApplied = true;
      const [nextProspects, nextBookmarks, nextHistory, nextEstimates, nextDocuments, nextObjects, nextFinance, nextSuppliers] = await Promise.all([
        window.nexus.listProspects(), window.nexus.listBookmarks(), window.nexus.listHistory(), window.nexus.listEstimates(), window.nexus.listDocuments(), window.nexus.listObjects(), window.nexus.listFinance(), window.nexus.listSuppliers()
      ]);
      setProspects(nextProspects as Prospect[]);
      setBookmarks(nextBookmarks as BookmarkItem[]);
      historyRef.current = nextHistory as HistoryItem[];
      setHistory(nextHistory as HistoryItem[]);
      setEstimates(nextEstimates as Estimate[]);
      setDocuments(nextDocuments as BusinessDocument[]);
      setObjects(nextObjects as ProjectObject[]);
      setFinance(nextFinance as FinanceEntry[]);
      setSuppliers(nextSuppliers as Supplier[]);
      notify("Данные восстановлены; страховочная копия создана");
    } catch (error) {
      if (restoreApplied) {
        notify("Резервная копия восстановлена, но интерфейс не смог перечитать данные. Перезапустите NEXUS.");
      } else {
        notify(error instanceof Error ? error.message : "Не удалось восстановить резервную копию");
      }
    } finally {
      setStorageBusy(false);
    }
  };

  const persistProspects = async (next: Prospect[]): Promise<boolean> => {
    const previous = prospects;
    setProspects(next);
    try {
      await window.nexus.saveProspects(next);
      return true;
    } catch {
      setProspects(previous);
      notify("Не удалось сохранить базу. Изменения отменены.");
      return false;
    }
  };

  const persistEstimates = async (next: Estimate[]): Promise<boolean> => {
    const previous = estimates;
    setEstimates(next);
    try {
      await window.nexus.saveEstimates(next);
      return true;
    } catch {
      setEstimates(previous);
      notify("Не удалось сохранить сметы. Изменения отменены.");
      return false;
    }
  };

  const persistDocuments = async (next: BusinessDocument[]): Promise<boolean> => {
    const previous = documents;
    setDocuments(next);
    try {
      await window.nexus.saveDocuments(next);
      return true;
    } catch {
      setDocuments(previous);
      notify("Не удалось сохранить документы. Изменения отменены.");
      return false;
    }
  };

  const persistObjects = async (next: ProjectObject[]): Promise<boolean> => {
    const previous = objects;
    setObjects(next);
    try {
      await window.nexus.saveObjects(next);
      return true;
    } catch {
      setObjects(previous);
      notify("Не удалось сохранить объекты. Изменения отменены.");
      return false;
    }
  };

  const persistFinance = async (next: FinanceEntry[]): Promise<boolean> => {
    const previous = finance;
    setFinance(next);
    try {
      await window.nexus.saveFinance(next);
      return true;
    } catch {
      setFinance(previous);
      notify("Не удалось сохранить финансовые операции. Изменения отменены.");
      return false;
    }
  };

  const persistSuppliers = async (next: Supplier[]) => {
    const previous = suppliers;
    setSuppliers(next);
    try {
      await window.nexus.saveSuppliers(next);
      notify("Изменения поставщиков сохранены");
    } catch {
      setSuppliers(previous);
      notify("Не удалось сохранить поставщиков. Изменения отменены.");
    }
  };

  const openTab = async (url = "https://www.google.com") => {
    const id = makeId();
    const tab: Tab = { id, title: shortHost(url), url };
    setTabs(prev => [...prev, tab]);
    setActiveTab(id);
    setSection("home");
    setAddress(url);
    setPageError("");
    try {
      await window.nexus.createTab(id, url);
      requestAnimationFrame(() => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (rect) void window.nexus.setBounds(id, { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) });
      });
    } catch (error) {
      setTabs(prev => prev.filter(item => item.id !== id));
      setActiveTab(null);
      notify(error instanceof Error ? error.message : "Не удалось открыть страницу");
    }
  };

  const closeTab = async (id: string) => {
    await window.nexus.closeTab(id);
    const remaining = tabs.filter(tab => tab.id !== id);
    setTabs(remaining);
    if (activeTab === id) {
      const next = remaining[remaining.length - 1];
      setActiveTab(next?.id ?? null);
      setAddress(next?.url ?? "");
    }
  };

  const navigate = async (value = address) => {
    if (!value.trim()) return;
    try {
      let id = activeTab;
      if (!id) {
        id = makeId();
        setTabs(prev => [...prev, { id: id!, title: "Поиск", url: value }]);
        setActiveTab(id);
        await window.nexus.createTab(id, value);
      } else {
        await window.nexus.navigate(id, value);
      }
      setSection("home");
      setPageError("");
      setAddress(value);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось открыть адрес");
    }
  };

  const saveCurrentSite = async () => {
    if (!active) { notify("Сначала открой сайт компании"); return; }
    const current = active;
    const host = shortHost(current.url);
    try {
      const details = await window.nexus.extractPage(current.id);
      const emails = [...new Set(details.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
      const phones = [...new Set(details.text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [])];
      setForm(prev => ({
        ...prev,
        company: prev.company || details.title || host,
        website: current.url,
        email: prev.email || emails[0] || "",
        phone: prev.phone || phones[0] || "",
        notes: prev.notes || details.description || "",
        source: "Открытая вкладка"
      }));
    } catch {
      setForm(prev => ({ ...prev, company: prev.company || host, website: current.url, source: "Открытая вкладка" }));
      notify("Не удалось прочитать страницу — заполните карточку вручную");
    }
    setEditing(null);
    setShowAdd(true);
  };

  const bookmarkCurrentSite = async () => {
    if (!active) { notify("Откройте сайт, чтобы добавить его в закладки"); return; }
    if (bookmarks.some(item => item.url === active.url)) { notify("Этот сайт уже в закладках"); return; }
    const next = [{ id: makeId(), title: active.title || shortHost(active.url), url: active.url, createdAt: new Date().toISOString() }, ...bookmarks];
    try {
      await window.nexus.saveBookmarks(next);
      setBookmarks(next);
      notify("Сайт добавлен в закладки");
    } catch {
      notify("Не удалось сохранить закладку. Изменения не применены.");
    }
  };

  const removeBookmark = async (id: string) => {
    const next = bookmarks.filter(item => item.id !== id);
    try {
      await window.nexus.saveBookmarks(next);
      setBookmarks(next);
      notify("Закладка удалена");
    } catch {
      notify("Не удалось удалить закладку. Изменения не применены.");
    }
  };

  const clearHistory = async () => {
    if (!confirm("Очистить историю посещений?")) return;
    historySaveQueueRef.current = historySaveQueueRef.current.then(async () => {
      try {
        await window.nexus.saveHistory([]);
        historyRef.current = [];
        setHistory([]);
        notify("История очищена");
      } catch {
        notify("Не удалось очистить историю. Данные не изменены.");
      }
    }).catch(() => {
      notify("Не удалось очистить историю. Данные не изменены.");
    });
    await historySaveQueueRef.current;
  };

  const resetForm = () => setForm({ company: "", website: "", contact: "", email: "", phone: "", location: "Москва и Московская область", nextAction: "", followUpDate: "", industry: "Строительство", status: "Новый", source: "Сайт компании", notes: "", tags: "", activityType: "Звонок", activityNote: "" });

  const saveForm = async () => {
    if (!form.company.trim()) { notify("Укажите название компании"); return; }
    const { tags, activityType, activityNote, ...fields } = form;
    const nextActivity = activityNote.trim()
      ? [{ id: makeId(), date: new Date().toISOString(), type: activityType, note: activityNote.trim() }, ...(editing?.activity ?? [])]
      : (editing?.activity ?? []);
    const item: Prospect = {
      ...fields, id: editing?.id ?? makeId(), company: form.company.trim(),
      website: form.website.trim(),
      tags: [...new Set(tags.split(/[;,]/).map(tag => tag.trim()).filter(Boolean))].slice(0, 20),
      activity: nextActivity.slice(0, 100),
      createdAt: editing?.createdAt ?? new Date().toISOString()
    };
    const next = editing ? prospects.map(p => p.id === editing.id ? item : p) : [item, ...prospects];
    const saved = await persistProspects(next);
    if (!saved) return;
    setShowAdd(false); setEditing(null); resetForm();
    notify(editing ? "Карточка обновлена" : "Компания добавлена в базу");
  };

  const editProspect = (item: Prospect) => {
    setEditing(item);
    setForm({ company: item.company, website: item.website, contact: item.contact, email: item.email, phone: item.phone, location: item.location || "", nextAction: item.nextAction || "", followUpDate: item.followUpDate || "", industry: item.industry, status: item.status, source: item.source, notes: item.notes, tags: (item.tags ?? []).join(", "), activityType: "Звонок", activityNote: "" });
    setShowAdd(true);
  };

  const exportCsv = (records: Prospect[] = filtered) => {
    const headers = ["Компания", "Сайт", "Контакт", "Email", "Телефон", "Регион", "Следующий шаг", "Дата контакта", "Отрасль", "Статус", "Источник", "Заметки", "Метки", "Дата добавления"];
    const quote = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const lines = [headers, ...records.map(p => [p.company, p.website, p.contact, p.email, p.phone, p.location, p.nextAction, p.followUpDate, p.industry, p.status, p.source, p.notes, (p.tags ?? []).join(", "), p.createdAt])].map(row => row.map(quote).join(";"));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nexus-prospects.csv"; a.click(); URL.revokeObjectURL(url);
    notify("CSV-файл подготовлен");
  };

  const importCsv = async (file: File) => {
    try {
      const parsed = parseProspectsCsv(await file.text());
      const existing = new Set(prospects.map(p => (p.company.trim().toLowerCase() + "|" + p.website.trim().toLowerCase())));
      const added: Prospect[] = [];
      for (const item of parsed) {
        const key = item.company.trim().toLowerCase() + "|" + item.website.trim().toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        added.push({ ...item, id: makeId(), tags: item.tags ?? [], activity: [] });
      }
      await persistProspects([...added, ...prospects]);
      notify(`Импортировано компаний: ${added.length}; пропущено дублей: ${parsed.length - added.length}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось прочитать CSV-файл");
    }
  };

  const filtered = useMemo(() => prospects.filter(p => {
    const q = prospectQuery.toLowerCase().trim();
    const matches = !q || [p.company, p.website, p.contact, p.email, p.phone, p.location, p.nextAction, p.industry, p.notes, ...(p.tags ?? [])].some(v => (v || "").toLowerCase().includes(q));
    const today = localDateKey();
    const dateMatches = statusFilter === "Просрочен контакт"
      ? Boolean(p.followUpDate && p.followUpDate < today && p.status !== "Не подходит")
      : statusFilter === "Контакт сегодня"
        ? p.followUpDate === today && p.status !== "Не подходит"
        : statusFilter === "Контакт в ближайшие 7 дней"
          ? Boolean(p.followUpDate && p.followUpDate >= today && p.followUpDate <= localDateKey(new Date(Date.now() + 7 * 86400000)) && p.status !== "Не подходит")
          : statusFilter === "Все статусы" || p.status === statusFilter;
    return matches && dateMatches;
  }), [prospects, prospectQuery, statusFilter]);

  const goSection = (next: Section) => {
    if (activeTab) void window.nexus.setBounds(activeTab, null);
    setSection(next);
  };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarCompact ? "sidebar-compact" : ""}`}>
      <div className="brand-row">
        <div className="brand-mark"><Compass size={21} strokeWidth={2.4}/></div>
        {!sidebarCompact && <div className="brand-copy"><strong>NEXUS</strong><span>BUSINESS BROWSER</span></div>}
        <button className="icon-button sidebar-toggle" title="Свернуть меню" onClick={() => setSidebarCompact(v => !v)}><Menu size={17}/></button>
      </div>
      <button className="workspace-switch" onClick={() => goSection("home")}>
        <div className="workspace-icon">B</div>
        {!sidebarCompact && <><span><b>Рабочее пространство</b><small>Личный профиль</small></span><ChevronDown size={15}/></>}
      </button>
      <div className="nav-label">{!sidebarCompact && "РАБОЧАЯ ОБЛАСТЬ"}</div>
      <nav className="main-nav">
        <NavItem icon={<LayoutDashboard size={18}/>} label="Обзор" active={section === "home" && !activeTab} compact={sidebarCompact} onClick={() => goSection("home")} />
        <NavItem icon={<Target size={18}/>} label="Поиск клиентов" active={section === "research"} compact={sidebarCompact} onClick={() => goSection("research")} />
        <NavItem icon={<Building2 size={18}/>} label="База компаний" active={section === "prospects"} count={prospects.length || undefined} compact={sidebarCompact} onClick={() => goSection("prospects")} />
        <NavItem icon={<Calculator size={18}/>} label="Сметы и прибыль" active={section === "estimates"} count={estimates.length || undefined} compact={sidebarCompact} onClick={() => goSection("estimates")} />
        <NavItem icon={<FileText size={18}/>} label="Документы и КП" active={section === "documents"} count={documents.length || undefined} compact={sidebarCompact} onClick={() => goSection("documents")} />
        <NavItem icon={<ClipboardList size={18}/>} label="Объекты и смены" active={section === "objects"} count={objects.length || undefined} compact={sidebarCompact} onClick={() => goSection("objects")} />
        <NavItem icon={<Activity size={18}/>} label="Финансы" active={section === "finance"} count={finance.length || undefined} compact={sidebarCompact} onClick={() => goSection("finance")} />
        <NavItem icon={<Users size={18}/>} label="Поставщики" active={section === "suppliers"} count={suppliers.length || undefined} compact={sidebarCompact} onClick={() => goSection("suppliers")} />
        <NavItem icon={<Bookmark size={18}/>} label="Закладки и сайты" active={section === "saved"} compact={sidebarCompact} onClick={() => goSection("saved")} />
        <NavItem icon={<HistoryIcon size={18}/>} label="История" active={section === "history"} compact={sidebarCompact} onClick={() => goSection("history")} />
      </nav>
      <div className="nav-label nav-label-spaced">{!sidebarCompact && "ИНСТРУМЕНТЫ"}</div>
      <nav className="main-nav">
        <NavItem icon={<Globe2 size={18}/>} label="Браузер" active={!!activeTab} compact={sidebarCompact} onClick={() => activeTab ? goSection("home") : void openTab()} />
        <NavItem icon={<FileSpreadsheet size={18}/>} label="Импорт и экспорт" compact={sidebarCompact} onClick={exportCsv}/>
      </nav>
      <div className="sidebar-spacer"/>
      {!sidebarCompact && <div className="upgrade-card">
        <div className="upgrade-icon"><Sparkles size={16}/></div>
        <b>Работайте быстрее</b>
        <p>Исследование компаний и клиентская база — в одном окне.</p>
        <span className="soon-label">ИИ-инструменты — в планах</span>
      </div>}
      <nav className="main-nav bottom-nav">
        <NavItem icon={<Settings2 size={18}/>} label="Настройки" active={section === "settings"} compact={sidebarCompact} onClick={() => goSection("settings")} />
        <NavItem icon={<CircleHelp size={18}/>} label="Помощь" compact={sidebarCompact} onClick={() => notify("Справочный центр будет добавлен позже")} />
      </nav>
      <div className="profile-row">
        <div className="avatar">N</div>
        {!sidebarCompact && <div className="profile-copy"><b>Личный аккаунт</b><small>Локальный режим</small></div>}
        {!sidebarCompact && <MoreHorizontal size={18} className="muted-icon"/>}
      </div>
    </aside>

    <main className="main-shell">
      <header className="tab-strip">
        <div className="tab-list">
          <button className={`home-tab ${!activeTab ? "active" : ""}`} onClick={() => { setActiveTab(null); setSection("home"); }} title="Главная"><Compass size={15}/></button>
          {tabs.map(tab => <div key={tab.id} className={`browser-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setAddress(tab.url); setSection("home"); }}>
            <Globe2 size={14}/><span>{tab.title || shortHost(tab.url)}</span>
            <button title="Закрыть вкладку" onClick={e => { e.stopPropagation(); void closeTab(tab.id); }}><X size={13}/></button>
          </div>)}
          <button className="add-tab" onClick={() => void openTab()} title="Новая вкладка"><Plus size={16}/></button>
        </div>
        <div className="window-actions"><span className="secure-dot"/><span>Локальные данные</span><button className="icon-button" title="Уведомления" onClick={() => notify("Новых уведомлений нет")}><Bell size={16}/></button></div>
      </header>

      <div className="browser-toolbar">
        <div className="history-controls">
          <button className="icon-button" disabled={!activeTab} title="Назад" onClick={() => activeTab && void window.nexus.back(activeTab)}><ArrowLeft size={17}/></button>
          <button className="icon-button" disabled={!activeTab} title="Вперёд" onClick={() => activeTab && void window.nexus.forward(activeTab)}><ArrowRight size={17}/></button>
          <button className="icon-button" title="Обновить" onClick={() => activeTab ? void window.nexus.reload(activeTab) : goSection("home")}><Activity size={16}/></button>
        </div>
        <form className="address-form" onSubmit={e => { e.preventDefault(); void navigate(); }}>
          <ShieldCheck size={15} className="address-shield"/>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Введите адрес сайта или поисковый запрос…" aria-label="Адрес или поисковый запрос"/>
          <button type="submit" title="Перейти"><ArrowRight size={16}/></button>
        </form>
        <button className={`toolbar-action ${activeTab ? "" : "toolbar-action-primary"}`} onClick={saveCurrentSite}><Bookmark size={15}/><span>Сохранить компанию</span></button>
        <button className="icon-button" title="Добавить сайт в закладки" onClick={() => void bookmarkCurrentSite()}><Star size={17}/></button>
      </div>

      <div className="content-region">
        {activeTab && section === "home" ? <div className="web-viewport" ref={viewportRef} /> : <div className="page-scroll">
          {section === "home" && <Dashboard prospects={prospects} onSearch={q => { setAddress(q); void openTab("https://www.google.com/search?q=" + encodeURIComponent(q)); }} onSection={goSection} onAdd={() => { resetForm(); setEditing(null); setShowAdd(true); }} onExport={exportCsv} onFollowUpFilter={filter => setStatusFilter(filter)}/>}
          {section === "research" && <Research onSearch={(q, source = "Веб-поиск") => { const base = source === "Яндекс" ? "https://yandex.ru/search/?text=" : source === "Bing" ? "https://www.bing.com/search?q=" : "https://www.google.com/search?q="; setAddress(base + encodeURIComponent(q)); void openTab(base + encodeURIComponent(q)); }} onSave={() => { resetForm(); setForm(p => ({ ...p, source: "Поиск клиентов" })); setShowAdd(true); }}/>}
          {section === "prospects" && <ProspectsPage prospects={filtered} query={prospectQuery} setQuery={setProspectQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={() => { resetForm(); setEditing(null); setShowAdd(true); }} onEdit={editProspect} onDelete={id => { if (confirm("Удалить компанию из локальной базы?")) void persistProspects(prospects.filter(p => p.id !== id)); }} onStatusChange={(item, status) => { void persistProspects(prospects.map(p => p.id === item.id ? { ...p, status } : p)); }} onExport={exportCsv} onOpen={url => void openTab(url)} onImport={importCsv} onBulkStatus={(ids, status) => { void persistProspects(prospects.map(p => ids.includes(p.id) ? { ...p, status } : p)); }} onBulkDelete={ids => { if (confirm(`Удалить выбранные компании: ${ids.length}?`)) void persistProspects(prospects.filter(p => !ids.includes(p.id))); }} onExportSelected={ids => exportCsv(prospects.filter(p => ids.includes(p.id)))}/>}
          {section === "saved" && <SavedPage bookmarks={bookmarks} prospects={prospects} onOpen={url => void openTab(url)} onSection={goSection} onRemoveBookmark={id => void removeBookmark(id)}/>}
          {section === "history" && <HistoryPage history={history} onOpen={url => void openTab(url)} onClear={clearHistory}/>}
          {section === "settings" && <SettingsPage version={version} storageBusy={storageBusy} onBackup={() => void createBackup()} onRestore={() => void restoreBackup()}/>}
          {section === "estimates" && <EstimatesPage estimates={estimates} onSave={async item => { const exists = estimates.some(e => e.id === item.id); const saved = await persistEstimates(exists ? estimates.map(e => e.id === item.id ? item : e) : [item, ...estimates]); if (saved) notify("Смета сохранена"); }} onDelete={id => { if (confirm("Удалить эту смету?")) void persistEstimates(estimates.filter(item => item.id !== id)); }}/>}
          {section === "documents" && <DocumentsPage estimates={estimates} documents={documents} onSave={async item => { const exists = documents.some(d => d.id === item.id); const saved = await persistDocuments(exists ? documents.map(d => d.id === item.id ? item : d) : [item, ...documents]); if (saved) notify("Документ сохранён"); }} onDelete={id => { if (confirm("Удалить документ?")) void persistDocuments(documents.filter(item => item.id !== id)); }}/>}
          {section === "objects" && <ObjectsPage objects={objects} estimates={estimates} onSave={async item => { const exists = objects.some(o => o.id === item.id); const saved = await persistObjects(exists ? objects.map(o => o.id === item.id ? item : o) : [item, ...objects]); if (saved) notify("Объект сохранён"); }} onDelete={id => { if (confirm("Удалить объект вместе с его сменными отчётами?")) void persistObjects(objects.filter(item => item.id !== id)); }}/>}
          {section === "finance" && <FinancePage entries={finance} objects={objects} onSave={async item => { const exists = finance.some(entry => entry.id === item.id); const saved = await persistFinance(exists ? finance.map(entry => entry.id === item.id ? item : entry) : [item, ...finance]); if (saved) notify("Финансовая операция сохранена"); }} onDelete={id => { if (confirm("Удалить финансовую операцию?")) void persistFinance(finance.filter(item => item.id !== id)); }}/>} 
          {section === "suppliers" && <SuppliersPage suppliers={suppliers} onSave={item => { const exists = suppliers.some(supplier => supplier.id === item.id); void persistSuppliers(exists ? suppliers.map(supplier => supplier.id === item.id ? item : supplier) : [item, ...suppliers]); }} onDelete={id => { if (confirm("Удалить карточку поставщика?")) void persistSuppliers(suppliers.filter(item => item.id !== id)); }}/>} 
        </div>}
      </div>
      <footer className="status-bar"><span><span className="status-light"/> NEXUS работает локально</span>{pageError && <span className="error-status">{pageError}</span>}<span>Версия {version} <span className="status-separator">·</span> Данные остаются на этом устройстве</span></footer>
    </main>

    {showAdd && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
      <div className="prospect-modal">
        <div className="modal-heading"><div><span className="eyebrow">КЛИЕНТСКАЯ БАЗА</span><h2>{editing ? "Редактировать компанию" : "Новая компания"}</h2><p>Сохраняйте только проверенные сведения и источник.</p></div><button className="icon-button" onClick={() => setShowAdd(false)}><X size={18}/></button></div>
        <div className="form-grid">
          <label className="field full"><span>Название компании *</span><input autoFocus value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Например, ООО Стройпроект"/></label>
          <label className="field full"><span>Сайт</span><input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://company.ru"/></label>
          <label className="field"><span>Контактное лицо</span><input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Имя и должность"/></label>
          <label className="field"><span>Отрасль</span><select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}><option>Строительство</option><option>Недвижимость</option><option>Управление объектами</option><option>Ремонт и отделка</option><option>Производство</option><option>Торговля</option><option>Услуги</option><option>Другое</option></select></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="name@company.ru"/></label>
          <label className="field"><span>Телефон</span><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+7…"/></label>
          <label className="field"><span>Регион / город</span><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Москва, Московская область"/></label>
          <label className="field"><span>Следующий шаг</span><input value={form.nextAction} onChange={e => setForm(p => ({ ...p, nextAction: e.target.value }))} placeholder="Позвонить, отправить КП…"/></label>
          <label className="field"><span>Дата следующего контакта</span><input type="date" value={form.followUpDate} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value }))}/></label>
          <label className="field"><span>Статус</span><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Prospect["status"] }))}><option>Новый</option><option>В работе</option><option>Приоритет</option><option>Не подходит</option></select></label>
          <label className="field full"><span>Метки</span><input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Например: генподрядчик, крупный объект, тендер (через запятую)"/></label>
          <label className="field full"><span>Источник информации</span><input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} placeholder="Сайт, каталог, рекомендация…"/></label>
          <label className="field full"><span>Заметки о компании</span><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Чем занимается компания, потенциальная потребность…"/></label>
          <div className="activity-editor full">
            <div className="activity-editor-heading"><b>История взаимодействия</b><span>{editing?.activity?.length ?? 0} записей</span></div>
            {(editing?.activity ?? []).length > 0 && <div className="activity-timeline">{(editing?.activity ?? []).slice(0, 8).map(entry => <div className="activity-entry" key={entry.id}><span className="activity-entry-dot"/><div><b>{entry.type}</b><time>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.date))}</time><p>{entry.note}</p></div></div>)}</div>}
            <div className="activity-entry-form">
              <label className="field"><span>Тип контакта</span><select value={form.activityType} onChange={e => setForm(p => ({ ...p, activityType: e.target.value }))}><option>Звонок</option><option>Письмо</option><option>Встреча</option><option>Сообщение</option><option>Другое</option></select></label>
              <label className="field"><span>Добавить запись (необязательно)</span><textarea value={form.activityNote} onChange={e => setForm(p => ({ ...p, activityNote: e.target.value }))} rows={2} placeholder="С кем говорили, о чём договорились, следующий результат…"/></label>
            </div>
          </div>
        </div>
        <div className="modal-footer"><span className="privacy-note"><ShieldCheck size={14}/> Сохраняется локально</span><div><button className="button button-ghost" onClick={() => setShowAdd(false)}>Отмена</button><button className="button button-primary" onClick={() => void saveForm()}><Check size={16}/> Сохранить компанию</button></div></div>
      </div>
    </div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function NavItem({ icon, label, active, count, compact, onClick }: { icon: ReactNode; label: string; active?: boolean; count?: number; compact: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} title={compact ? label : undefined}>{icon}{!compact && <><span>{label}</span>{count !== undefined && <small>{count}</small>}</>}</button>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Dashboard({ prospects, onSearch, onSection, onAdd, onExport, onFollowUpFilter }: { prospects: Prospect[]; onSearch: (q: string) => void; onSection: (s: Section) => void; onAdd: () => void; onExport: () => void; onFollowUpFilter: (filter: string) => void }) {
  const [query, setQuery] = useState("");
  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <div className="dashboard-page">
    <div className="welcome-line"><div><span className="eyebrow">{today.toUpperCase()}</span><h1>Рабочее пространство<span className="title-period">.</span></h1><p>Находите компании. Собирайте данные. Развивайте продажи.</p></div><div className="welcome-orb"><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/><div className="orb-core"><Compass size={32}/></div></div></div>
    <div className="hero-search-card"><div className="hero-search-copy"><span className="hero-search-icon"><Search size={18}/></span><div><b>Кого ищем сегодня?</b><p>Введите отрасль, тип компании или поисковый запрос.</p></div></div><form className="hero-search" onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query); }}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Например: генподрядчики Москвы"/><button className="button button-primary" type="submit">Начать поиск <ArrowRight size={16}/></button></form><div className="suggestions"><span>Попробуйте:</span>{["строительные компании", "управляющие компании", "ремонтные подрядчики"].map(x => <button key={x} onClick={() => { setQuery(x); onSearch(x); }}>{x}</button>)}</div></div>
    <div className="section-heading"><div><h2>Обзор активности</h2><p>Ваша работа с потенциальными клиентами</p></div><button className="text-button" onClick={() => onSection("prospects")}>Открыть базу <ArrowRight size={15}/></button></div>
    <div className="metric-grid">
      <Metric icon={<Building2 size={18}/>} label="Компаний в базе" value={prospects.length.toString()} detail="Все сохранённые записи" tone="blue"/>
      <Metric icon={<Target size={18}/>} label="Приоритетные" value={prospects.filter(p => p.status === "Приоритет").length.toString()} detail="Требуют внимания" tone="violet"/>
      <Metric icon={<Activity size={18}/>} label="В работе" value={prospects.filter(p => p.status === "В работе").length.toString()} detail="Активные контакты" tone="green"/>
      <Metric icon={<Zap size={18}/>} label="Новые" value={prospects.filter(p => p.status === "Новый").length.toString()} detail="Ещё не обработаны" tone="amber"/>
    </div>
    {(() => {
      const todayKey = localDateKey();
      const activeFollowUps = prospects.filter(p => p.followUpDate && p.status !== "Не подходит").sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
      const overdue = activeFollowUps.filter(p => p.followUpDate < todayKey);
      const dueToday = activeFollowUps.filter(p => p.followUpDate === todayKey);
      const upcoming = activeFollowUps.filter(p => p.followUpDate > todayKey && p.followUpDate <= localDateKey(new Date(Date.now() + 7 * 86400000)));
      const openFollowUps = (filter: string) => { onFollowUpFilter(filter); onSection("prospects"); };
      return <section className="panel follow-up-panel"><div className="panel-heading"><div><h3>Контроль контактов</h3><p>Следующие действия по клиентской базе</p></div><CalendarClock size={18}/></div><div className="follow-up-summary">
        <button className={overdue.length ? "follow-up-stat overdue-stat" : "follow-up-stat"} onClick={() => openFollowUps("Просрочен контакт")}><span>Просрочено</span><b>{overdue.length}</b><small>Нужно связаться</small></button>
        <button className="follow-up-stat today-stat" onClick={() => openFollowUps("Контакт сегодня")}><span>На сегодня</span><b>{dueToday.length}</b><small>Запланировано</small></button>
        <button className="follow-up-stat upcoming-stat" onClick={() => openFollowUps("Контакт в ближайшие 7 дней")}><span>7 дней</span><b>{upcoming.length}</b><small>Скоро связаться</small></button>
      </div>{activeFollowUps.length ? <div className="follow-up-list">{activeFollowUps.slice(0, 5).map(p => <button className="follow-up-row" key={p.id} onClick={() => { onFollowUpFilter("Все статусы"); onSection("prospects"); }}><span className="company-monogram">{p.company.slice(0, 1).toUpperCase()}</span><span className="follow-up-company"><b>{p.company}</b><small>{p.nextAction || "Связаться с компанией"}</small></span><span className={p.followUpDate < todayKey ? "follow-up overdue" : p.followUpDate === todayKey ? "follow-up due-today" : "follow-up"}>{p.followUpDate}</span><ArrowRight size={14}/></button>)}</div> : <div className="follow-up-empty">Добавьте дату контакта в карточке компании — здесь появится список следующих действий.</div>}</section>;
    })()}
    {(() => {
      const priorityProspects = prospects
        .filter(p => p.status === "Приоритет")
        .sort((a, b) => {
          const aDate = a.followUpDate || "9999-12-31";
          const bDate = b.followUpDate || "9999-12-31";
          return aDate.localeCompare(bDate) || a.company.localeCompare(b.company, "ru");
        });
      const todayKey = localDateKey();
      return <section className="panel priority-queue-panel">
        <div className="panel-heading">
          <div><h3>Приоритетные клиенты</h3><p>Компании, которым стоит уделить внимание в первую очередь</p></div>
          <span className="priority-queue-count">{priorityProspects.length}</span>
        </div>
        {priorityProspects.length ? <div className="priority-queue-list">
          {priorityProspects.slice(0, 5).map(p => {
            const overdue = Boolean(p.followUpDate && p.followUpDate < todayKey);
            const dueToday = p.followUpDate === todayKey;
            return <button className="priority-queue-row" key={p.id} onClick={() => { onFollowUpFilter("Приоритет"); onSection("prospects"); }}>
              <span className="company-monogram priority-monogram">{p.company.slice(0, 1).toUpperCase()}</span>
              <span className="priority-queue-company"><b>{p.company}</b><small>{[p.location, p.industry].filter(Boolean).join(" · ") || "Регион и отрасль не указаны"}</small><small>{p.nextAction || "Следующий шаг не запланирован"}</small></span>
              <span className={overdue ? "priority-queue-date overdue" : dueToday ? "priority-queue-date due-today" : "priority-queue-date"}>{p.followUpDate || "Нет даты"}</span>
              <ArrowRight size={14}/>
            </button>;
          })}
          {priorityProspects.length > 5 && <button className="text-button priority-queue-more" onClick={() => { onFollowUpFilter("Приоритет"); onSection("prospects"); }}>Все приоритетные ({priorityProspects.length}) <ArrowRight size={15}/></button>}
        </div> : <div className="priority-queue-empty">Отмечайте перспективные компании статусом «Приоритет» — они появятся здесь.</div>}
      </section>;
    })()}
    <div className="dashboard-bottom">
      <section className="panel quick-panel"><div className="panel-heading"><div><h3>Быстрые действия</h3><p>Основные инструменты под рукой</p></div><MoreHorizontal size={18}/></div>
        <button className="quick-action" onClick={() => onSection("research")}><span className="quick-icon violet"><Search size={17}/></span><span><b>Найти компании</b><small>Поиск через веб-источники</small></span><ArrowRight size={16}/></button>
        <button className="quick-action" onClick={onAdd}><span className="quick-icon blue"><Plus size={17}/></span><span><b>Добавить компанию</b><small>Создать карточку вручную</small></span><ArrowRight size={16}/></button>
        <button className="quick-action" onClick={() => onSection("estimates")}><span className="quick-icon blue"><Calculator size={17}/></span><span><b>Рассчитать смету</b><small>Цена, затраты и прибыль по работам</small></span><ArrowRight size={16}/></button>
        <button className="quick-action" onClick={onExport}><span className="quick-icon green"><ArrowDownToLine size={17}/></span><span><b>Экспортировать базу</b><small>Выгрузить компании в CSV</small></span><ArrowRight size={16}/></button>
      </section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>Недавно добавленные</h3><p>Последние записи вашей базы</p></div><button className="text-button" onClick={() => onSection("prospects")}>Все <ArrowRight size={14}/></button></div>
        {prospects.length === 0 ? <div className="empty-state compact-empty"><div className="empty-icon"><Building2 size={21}/></div><b>База пока пустая</b><p>Сохраните первую компанию, чтобы вести историю работы.</p><button className="button button-secondary" onClick={onAdd}><Plus size={15}/> Добавить компанию</button></div> : <div className="recent-list">{prospects.slice(0, 4).map(p => <div className="recent-item" key={p.id}><div className="company-monogram">{p.company.slice(0, 1).toUpperCase()}</div><div className="recent-company"><b>{p.company}</b><small>{p.website || p.industry}</small></div><StatusBadge status={p.status}/></div>)}</div>}
      </section>
    </div>
    <div className="insight-banner"><div className="insight-mark"><WandSparkles size={20}/></div><div><b>От поиска к системе продаж</b><p>Сохраняйте источник каждой компании и фиксируйте следующий шаг — так база превращается в рабочий инструмент.</p></div><button onClick={() => onSection("prospects")}>Открыть базу <ArrowRight size={15}/></button></div>
  </div>;
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}<span className="metric-spark"/></div><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Research({ onSearch, onSave }: { onSearch: (q: string, source?: string) => void; onSave: () => void }) {
  const [sector, setSector] = useState("Строительство и подрядчики");
  const [region, setRegion] = useState("Москва и Московская область");
  const [keywords, setKeywords] = useState("");
  const [source, setSource] = useState("Веб-поиск");
  const [intent, setIntent] = useState("Официальные сайты");
  const intentTerms: Record<string, string> = {
    "Официальные сайты": "официальный сайт компании",
    "Контакты": "контакты телефон email",
    "Тендеры и закупки": "тендеры закупки подряд",
    "Поиск заказчиков": "заказчик коммерческие объекты строительство",
    "Партнёры и подрядчики": "партнёр подрядчик генподрядчик"
  };
  const query = [sector, region, keywords.trim(), intentTerms[intent]].filter(Boolean).join(" ");
  const run = () => onSearch(query, source);
  return <div className="standard-page"><PageHeader eyebrow="ИССЛЕДОВАНИЕ РЫНКА" title="Поиск клиентов" description="Формируйте запросы к открытым веб-источникам и сохраняйте проверенные компании." action={<span className="local-pill"><ShieldCheck size={14}/> Без сервера</span>}/>
    <div className="research-layout"><section className="panel research-form-panel"><div className="panel-heading"><div><h3>Параметры поиска</h3><p>Уточните профиль потенциального клиента</p></div><div className="panel-heading-icon"><ListFilter size={18}/></div></div>
      <label className="field"><span>Отрасль / тип компании</span><select value={sector} onChange={e => setSector(e.target.value)}><option>Строительство и подрядчики</option><option>Генеральные подрядчики</option><option>Ремонтные компании</option><option>Управляющие компании недвижимости</option><option>Коммерческая недвижимость</option><option>Архитектурные бюро</option><option>Производственные компании</option><option>Другая отрасль</option></select></label>
      <label className="field"><span>Регион</span><select value={region} onChange={e => setRegion(e.target.value)}><option>Москва и Московская область</option><option>Санкт-Петербург и область</option><option>Вся Россия</option><option>Казань</option><option>Екатеринбург</option><option>Новосибирск</option></select></label>
      <label className="field"><span>Цель поиска</span><select value={intent} onChange={e => setIntent(e.target.value)}>{Object.keys(intentTerms).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Дополнительные ключевые слова</span><input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Например: коммерческие объекты, офисы"/></label>
      <label className="field"><span>Источник поиска</span><select value={source} onChange={e => setSource(e.target.value)}><option>Веб-поиск</option><option>Google</option><option>Bing</option><option>Яндекс</option></select></label>
      <div className="research-note"><ShieldCheck size={16}/><p>Запрос формируется под выбранную задачу. Результаты открываются в браузере; автоматический сбор и проверка контактов будут отдельным этапом.</p></div>
      <div className="panel" style={{padding: "12px 14px", marginBottom: 12}}><span style={{display:"block",fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6,opacity:.7}}>Предпросмотр запроса</span><p style={{fontSize:13,lineHeight:1.5,margin:0,overflowWrap:"anywhere"}}>{query}</p></div>
      <button className="button button-primary full-button" onClick={run}><Search size={16}/> Найти компании <ArrowRight size={16}/></button>
    </section>
    <section className="research-aside"><div className="research-visual"><div className="visual-grid"/><div className="visual-target"><div/><div/><div/><Target size={34}/></div><div className="floating-chip chip-top"><span className="chip-dot"/>{source}</div><div className="floating-chip chip-bottom"><Building2 size={15}/> B2B · Компании</div></div><div className="panel workflow-panel"><h3>Как устроен процесс</h3>{[{n:"01",title:"Найдите компании",desc:"Сформируйте точный поисковый запрос"},{n:"02",title:"Проверьте источник",desc:"Откройте сайт и подтвердите сведения"},{n:"03",title:"Сохраните в базу",desc:"Добавьте компанию и следующий шаг"}].map(s => <div className="workflow-step" key={s.n}><span>{s.n}</span><div><b>{s.title}</b><small>{s.desc}</small></div></div>)}<button className="text-button" onClick={onSave}>Добавить компанию вручную <Plus size={15}/></button></div></section></div>
  </div>;
}

function ProspectsPage({ prospects, query, setQuery, statusFilter, setStatusFilter, onAdd, onEdit, onDelete, onStatusChange, onExport, onOpen, onImport, onBulkStatus, onBulkDelete, onExportSelected }: { prospects: Prospect[]; query: string; setQuery: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; onAdd: () => void; onEdit: (p: Prospect) => void; onDelete: (id: string) => void; onStatusChange: (p: Prospect, status: Prospect["status"]) => void; onExport: () => void; onOpen: (url: string) => void; onImport: (file: File) => void; onBulkStatus: (ids: string[], status: Prospect["status"]) => void; onBulkDelete: (ids: string[]) => void; onExportSelected: (ids: string[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => setSelectedIds(previous => previous.filter(id => prospects.some(item => item.id === id))), [prospects]);
  const allVisibleSelected = prospects.length > 0 && prospects.every(item => selectedIds.includes(item.id));
  const toggleAll = () => setSelectedIds(allVisibleSelected ? [] : prospects.map(item => item.id));
  const toggleOne = (id: string) => setSelectedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  return <div className="standard-page"><PageHeader eyebrow="УПРАВЛЕНИЕ ПРОДАЖАМИ" title="База компаний" description="Единый список потенциальных клиентов, контактов и источников." action={<button className="button button-primary" onClick={onAdd}><Plus size={16}/> Добавить компанию</button>}/>
    <div className="table-toolbar"><div className="table-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по компании, сайту, контакту…"/></div><div className="table-filters"><Filter size={15}/><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Все статусы</option><option>Новый</option><option>В работе</option><option>Приоритет</option><option>Не подходит</option><option>Просрочен контакт</option><option>Контакт сегодня</option><option>Контакт в ближайшие 7 дней</option></select><label className="button button-secondary import-button"><ArrowDownToLine size={15}/> Импорт CSV<input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (file) onImport(file); e.currentTarget.value = ""; }}/></label><button className="button button-secondary" onClick={onExport}><Download size={15}/> Экспорт CSV</button></div></div>
    {selectedIds.length > 0 && <div className="bulk-toolbar"><div><b>Выбрано: {selectedIds.length}</b><span>Массовые действия для выделенных компаний</span></div><select aria-label="Изменить статус выбранных компаний" defaultValue="" onChange={e => { if (e.target.value) { onBulkStatus(selectedIds, e.target.value as Prospect["status"]); setSelectedIds([]); e.currentTarget.value = ""; } }}><option value="" disabled>Изменить статус…</option><option>Новый</option><option>В работе</option><option>Приоритет</option><option>Не подходит</option></select><button className="button button-secondary" onClick={() => onExportSelected(selectedIds)}><Download size={14}/> Экспорт выбранных</button><button className="button button-danger" onClick={() => { onBulkDelete(selectedIds); setSelectedIds([]); }}><Trash2 size={14}/> Удалить выбранные</button><button className="text-button" onClick={() => setSelectedIds([])}>Снять выделение</button></div>}
    <div className="panel table-panel"><div className="table-count"><span>Компании <b>{prospects.length}</b></span><span>Локальная база <span className="status-light"/></span></div>
      {prospects.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={24}/></div><h3>Пока нет компаний</h3><p>Добавьте первую компанию вручную или сохраните её с открытого сайта. Записи будут доступны после перезапуска.</p><button className="button button-primary" onClick={onAdd}><Plus size={16}/> Добавить первую компанию</button></div> : <div className="table-scroll"><table><thead><tr><th className="select-column"><input type="checkbox" aria-label="Выбрать все видимые компании" checked={allVisibleSelected} onChange={toggleAll}/></th><th>Компания</th><th>Метки</th><th>Регион</th><th>Отрасль</th><th>Контактные данные</th><th>Следующий шаг</th><th>Источник</th><th>Статус</th><th></th></tr></thead><tbody>{prospects.map(p => <tr key={p.id}><td className="select-column"><input type="checkbox" aria-label={`Выбрать компанию ${p.company}`} checked={selectedIds.includes(p.id)} onChange={() => toggleOne(p.id)}/></td><td><div className="table-company"><div className="company-monogram">{p.company.slice(0,1).toUpperCase()}</div><div><b>{p.company}</b>{p.website && <a href="#" onClick={e => { e.preventDefault(); onOpen(p.website); }}>{shortHost(p.website)}</a>}</div></div></td><td><div className="tag-list">{(p.tags ?? []).length ? (p.tags ?? []).map(tag => <span className="tag-chip" key={tag}>{tag}</span>) : "—"}</div></td><td>{p.location || "—"}</td><td>{p.industry || "—"}</td><td><div className="contact-cell">{p.contact && <span>{p.contact}</span>}{p.email && <span>{p.email}</span>}{p.phone && <span>{p.phone}</span>}{!p.contact && !p.email && !p.phone && "—"}</div></td><td><div className="contact-cell">{p.nextAction && <span>{p.nextAction}</span>}{p.followUpDate && <small className={p.followUpDate < new Date().toISOString().slice(0, 10) ? "follow-up overdue" : "follow-up"}>{p.followUpDate}</small>}{!p.nextAction && !p.followUpDate && "—"}</div></td><td>{p.source || "—"}</td><td><select className="status-select" aria-label={`Статус компании ${p.company}`} value={p.status} onChange={e => onStatusChange(p, e.target.value as Prospect["status"])}><option>Новый</option><option>В работе</option><option>Приоритет</option><option>Не подходит</option></select></td><td><div className="row-actions"><button className="icon-button" title="Редактировать" onClick={() => onEdit(p)}><Settings2 size={15}/></button><button className="icon-button danger-hover" title="Удалить" onClick={() => onDelete(p.id)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}





const createBlankSupplier = (): Supplier => {
  const now = new Date().toISOString();
  return { id: makeId(), name: "", category: "Материалы", contact: "", phone: "", email: "", website: "", region: "Москва и Московская область", paymentTerms: "", deliveryDays: 0, rating: 0, status: "Активен", notes: "", createdAt: now, updatedAt: now };
};

function SuppliersPage({ suppliers, onSave, onDelete }: { suppliers: Supplier[]; onSave: (item: Supplier) => void; onDelete: (id: string) => void }) {
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<Supplier>(() => createBlankSupplier());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  useEffect(() => {
    if (activeId === "new") return;
    const current = suppliers.find(item => item.id === activeId);
    if (current) setDraft({ ...current });
  }, [activeId, suppliers]);
  const visible = suppliers.filter(item => {
    const q = query.trim().toLowerCase();
    const matches = !q || [item.name,item.category,item.contact,item.phone,item.email,item.region,item.paymentTerms,item.notes].some(value => (value || "").toLowerCase().includes(q));
    return matches && (statusFilter === "Все" || item.status === statusFilter);
  }).sort((a,b) => a.name.localeCompare(b.name, "ru"));
  const activeCount = suppliers.filter(item => item.status === "Активен").length;
  const rated = suppliers.filter(item => item.rating > 0);
  const averageRating = rated.length ? rated.reduce((sum,item) => sum + item.rating, 0) / rated.length : 0;
  const newSupplier = () => { setDraft(createBlankSupplier()); setActiveId("new"); };
  const save = () => {
    if (!draft.name.trim()) { alert("Укажите название поставщика."); return; }
    if (!Number.isInteger(draft.deliveryDays) || draft.deliveryDays < 0 || draft.deliveryDays > 3650 || draft.rating < 0 || draft.rating > 5) { alert("Проверьте срок поставки и оценку."); return; }
    const item = { ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() };
    onSave(item);
    setActiveId(item.id);
  };
  return <div className="standard-page suppliers-page">
    <PageHeader eyebrow="ЗАКУПКИ И ПАРТНЁРЫ" title="Поставщики" description="Храните контакты поставщиков, условия оплаты, сроки поставки и внутреннюю оценку надёжности." action={<button className="button button-primary" onClick={newSupplier}><Plus size={16}/> Добавить поставщика</button>}/>
    <div className="supplier-summary">
      <div><span>Всего поставщиков</span><b>{suppliers.length}</b></div><div><span>Активные</span><b>{activeCount}</b></div><div><span>Средняя оценка</span><b>{averageRating ? averageRating.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " / 5" : "Нет оценок"}</b></div>
    </div>
    <div className="suppliers-layout">
      <section className="panel suppliers-list-panel"><div className="suppliers-list-toolbar"><div className="table-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по названию, категории, контакту…"/></div><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Все</option><option>Активен</option><option>На паузе</option></select></div>
        {visible.length ? <div className="supplier-list">{visible.map(item => <button key={item.id} className={activeId === item.id ? "supplier-list-item active" : "supplier-list-item"} onClick={() => setActiveId(item.id)}><span className="supplier-list-icon"><Building2 size={16}/></span><span className="supplier-list-copy"><b>{item.name}</b><small>{item.category} · {item.region || "Регион не указан"}</small><small>{item.contact || item.phone || item.email || "Контакты не заполнены"}</small></span><span className={item.status === "Активен" ? "supplier-status active" : "supplier-status paused"}>{item.status}</span></button>)}</div> : <div className="estimate-empty">Поставщики не найдены. Добавьте карточку или измените фильтры.</div>}
      </section>
      <section className="panel supplier-editor"><div className="panel-heading"><div><h3>{activeId === "new" ? "Новый поставщик" : "Карточка поставщика"}</h3><p>Контакты и условия сотрудничества</p></div><Users size={18}/></div>
        <div className="supplier-fields">
          <label className="field full"><span>Название компании *</span><input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} placeholder="ООО Поставщик"/></label>
          <label className="field"><span>Категория</span><select value={draft.category} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))}><option>Материалы</option><option>Вывоз и утилизация</option><option>Аренда оборудования</option><option>Инструмент</option><option>Транспорт и логистика</option><option>Рабочая сила</option><option>Прочее</option></select></label>
          <label className="field"><span>Статус</span><select value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as Supplier["status"] }))}><option>Активен</option><option>На паузе</option></select></label>
          <label className="field"><span>Контактное лицо</span><input value={draft.contact} onChange={e => setDraft(p => ({ ...p, contact: e.target.value }))} placeholder="Имя и должность"/></label>
          <label className="field"><span>Телефон</span><input value={draft.phone} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} placeholder="+7…"/></label>
          <label className="field"><span>Email</span><input type="email" value={draft.email} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} placeholder="sales@company.ru"/></label>
          <label className="field"><span>Сайт</span><input value={draft.website} onChange={e => setDraft(p => ({ ...p, website: e.target.value }))} placeholder="https://company.ru"/></label>
          <label className="field full"><span>Регион</span><input value={draft.region} onChange={e => setDraft(p => ({ ...p, region: e.target.value }))} placeholder="Москва и Московская область"/></label>
          <label className="field"><span>Условия оплаты</span><input value={draft.paymentTerms} onChange={e => setDraft(p => ({ ...p, paymentTerms: e.target.value }))} placeholder="Предоплата 50%, отсрочка…"/></label>
          <label className="field"><span>Срок поставки, дней</span><input type="number" min="0" max="3650" step="1" value={draft.deliveryDays} onChange={e => setDraft(p => ({ ...p, deliveryDays: Number(e.target.value) }))}/></label>
          <label className="field"><span>Оценка надёжности (0–5)</span><select value={draft.rating} onChange={e => setDraft(p => ({ ...p, rating: Number(e.target.value) }))}><option value={0}>Не оценён</option><option value={1}>1 — низкая</option><option value={2}>2</option><option value={3}>3 — средняя</option><option value={4}>4</option><option value={5}>5 — высокая</option></select></label>
          <label className="field full"><span>Внутренние заметки</span><textarea rows={3} value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Цены, качество, надёжность, особенности работы…"/></label>
        </div>
        <div className="supplier-editor-actions">{activeId !== "new" && <button className="button button-danger" onClick={() => { onDelete(draft.id); newSupplier(); }}><Trash2 size={14}/> Удалить</button>}<button className="button button-primary" onClick={save}><Check size={15}/> Сохранить поставщика</button></div>
      </section>
    </div>
  </div>;
}

const createBlankFinanceEntry = (): FinanceEntry => {
  const now = new Date().toISOString();
  return { id: makeId(), type: "Доход", title: "", category: "Оплата заказчика", amount: 0, date: localDateKey(), status: "План", counterparty: "", objectId: "", notes: "", createdAt: now, updatedAt: now };
};

function FinancePage({ entries, objects, onSave, onDelete }: { entries: FinanceEntry[]; objects: ProjectObject[]; onSave: (item: FinanceEntry) => void; onDelete: (id: string) => void }) {
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<FinanceEntry>(() => createBlankFinanceEntry());
  const [period, setPeriod] = useState(localDateKey().slice(0, 7));
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
  useEffect(() => {
    if (activeId === "new") return;
    const current = entries.find(item => item.id === activeId);
    if (current) setDraft({ ...current });
  }, [activeId, entries]);
  const visible = entries.filter(item => period === "all" || item.date.startsWith(period)).sort((a,b) => b.date.localeCompare(a.date));
  const paidIncome = visible.filter(item => item.type === "Доход" && item.status === "Оплачено").reduce((sum,item) => sum + item.amount, 0);
  const paidExpense = visible.filter(item => item.type === "Расход" && item.status === "Оплачено").reduce((sum,item) => sum + item.amount, 0);
  const plannedIncome = visible.filter(item => item.type === "Доход" && item.status === "План").reduce((sum,item) => sum + item.amount, 0);
  const plannedExpense = visible.filter(item => item.type === "Расход" && item.status === "План").reduce((sum,item) => sum + item.amount, 0);
  const newEntry = () => { setDraft(createBlankFinanceEntry()); setActiveId("new"); };
  const save = () => {
    if (!draft.title.trim()) { alert("Укажите назначение операции."); return; }
    if (!draft.date || !Number.isFinite(draft.amount) || draft.amount <= 0) { alert("Укажите дату и положительную сумму операции."); return; }
    onSave({ ...draft, title: draft.title.trim(), amount: Math.round(draft.amount * 100) / 100, updatedAt: new Date().toISOString() });
    setActiveId(draft.id);
  };
  return <div className="standard-page finance-page">
    <PageHeader eyebrow="ДЕНЕЖНЫЕ ПОТОКИ" title="Финансы" description="Учитывайте поступления и расходы, отделяйте плановые операции от оплаченных и смотрите движение денег по периоду." action={<button className="button button-primary" onClick={newEntry}><Plus size={16}/> Новая операция</button>}/>
    <div className="finance-period-toolbar"><div><b>Период отчёта</b><small>Суммы считаются по дате операции и её статусу</small></div><select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">За всё время</option>{Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index); const value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; return <option key={value} value={value}>{new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date)}</option>; })}</select></div>
    <div className="finance-summary-grid">
      <div className="finance-summary-card income"><span>Поступило</span><strong>{money(paidIncome)}</strong><small>Доходы со статусом «Оплачено»</small></div>
      <div className="finance-summary-card expense"><span>Оплачено расходов</span><strong>{money(paidExpense)}</strong><small>Подтверждённые денежные затраты</small></div>
      <div className={paidIncome-paidExpense < 0 ? "finance-summary-card negative" : "finance-summary-card net"}><span>Денежный поток</span><strong>{money(paidIncome-paidExpense)}</strong><small>Поступления минус оплаченные расходы</small></div>
      <div className="finance-summary-card planned"><span>Ожидается</span><strong>{money(plannedIncome-plannedExpense)}</strong><small>Плановые доходы минус плановые расходы</small></div>
    </div>
    <div className="finance-plan-row"><div><span>Ожидаемые поступления</span><b>{money(plannedIncome)}</b></div><div><span>Плановые расходы</span><b>{money(plannedExpense)}</b></div><div><span>Операций в периоде</span><b>{visible.length}</b></div></div>
    <div className="finance-workspace">
      <section className="panel finance-editor"><div className="panel-heading"><div><h3>{activeId === "new" ? "Новая операция" : "Редактировать операцию"}</h3><p>Финансовая запись хранится локально</p></div><Activity size={18}/></div>
        <div className="finance-fields">
          <label className="field"><span>Тип операции</span><select value={draft.type} onChange={e => setDraft(p => ({ ...p, type: e.target.value as FinanceEntry["type"], category: e.target.value === "Доход" ? "Оплата заказчика" : "Оплата бригады" }))}><option>Доход</option><option>Расход</option></select></label>
          <label className="field"><span>Статус</span><select value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as FinanceEntry["status"] }))}><option>План</option><option>Оплачено</option></select></label>
          <label className="field full"><span>Назначение *</span><input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="Аванс по договору, оплата бригады…"/></label>
          <label className="field"><span>Сумма, ₽ *</span><input type="number" min="0.01" step="0.01" value={draft.amount} onChange={e => setDraft(p => ({ ...p, amount: Number(e.target.value) }))}/></label>
          <label className="field"><span>Дата</span><input type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}/></label>
          <label className="field"><span>Категория</span><select value={draft.category} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))}><option>Оплата заказчика</option><option>Аванс</option><option>Окончательный расчёт</option><option>Оплата бригады</option><option>Материалы</option><option>Аренда и логистика</option><option>Налог</option><option>Оборудование</option><option>Прочее</option></select></label>
          <label className="field"><span>Контрагент</span><input value={draft.counterparty} onChange={e => setDraft(p => ({ ...p, counterparty: e.target.value }))} placeholder="Заказчик или поставщик"/></label>
          <label className="field full"><span>Связанный объект</span><select value={draft.objectId} onChange={e => setDraft(p => ({ ...p, objectId: e.target.value }))}><option value="">Без привязки</option>{objects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field full"><span>Комментарий</span><textarea rows={2} value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Номер счёта, договор, пояснения"/></label>
        </div>
        <div className="finance-editor-actions">{activeId !== "new" && <button className="button button-danger" onClick={() => { onDelete(draft.id); newEntry(); }}><Trash2 size={14}/> Удалить</button>}<button className="button button-primary" onClick={save}><Check size={15}/> Сохранить операцию</button></div>
      </section>
      <section className="panel finance-register"><div className="panel-heading"><div><h3>Реестр операций</h3><p>{visible.length} записей за выбранный период</p></div><FileSpreadsheet size={18}/></div>
        {visible.length ? <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>Дата</th><th>Тип</th><th>Назначение</th><th>Контрагент / объект</th><th>Категория</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td>{item.date}</td><td><span className={item.type === "Доход" ? "finance-type income" : "finance-type expense"}>{item.type}</span></td><td><button className="finance-entry-title" onClick={() => setActiveId(item.id)}>{item.title}</button>{item.notes && <small className="finance-entry-note">{item.notes}</small>}</td><td>{item.counterparty || "—"}<small className="finance-entry-note">{objects.find(o => o.id === item.objectId)?.name || ""}</small></td><td>{item.category}</td><td className={item.type === "Доход" ? "finance-amount income" : "finance-amount expense"}>{item.type === "Расход" ? "−" : "+"}{money(item.amount)}</td><td><span className={item.status === "Оплачено" ? "finance-status paid" : "finance-status planned"}>{item.status}</span></td><td><button className="icon-button" title="Редактировать" onClick={() => setActiveId(item.id)}><Settings2 size={14}/></button></td></tr>)}</tbody></table></div> : <div className="estimate-empty">За выбранный период финансовых операций нет. Добавьте поступление или расход.</div>}
      </section>
    </div>
  </div>;
}

const createBlankObject = (): ProjectObject => {
  const now = new Date().toISOString();
  return { id: makeId(), name: "Новый объект", customer: "", address: "", status: "Подготовка", startDate: localDateKey(), endDate: "", estimateId: "", plannedRevenue: 0, notes: "", shifts: [], createdAt: now, updatedAt: now };
};

function ObjectsPage({ objects, estimates, onSave, onDelete }: { objects: ProjectObject[]; estimates: Estimate[]; onSave: (item: ProjectObject) => void; onDelete: (id: string) => void }) {
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<ProjectObject>(() => createBlankObject());
  const [shiftDraft, setShiftDraft] = useState({ date: localDateKey(), workers: 1, hours: 8, quantity: 0, revenue: 0, cost: 0, notes: "" });
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
  useEffect(() => {
    if (activeId === "new") return;
    const current = objects.find(item => item.id === activeId);
    if (current) {
      setDraft({ ...current, shifts: current.shifts.map(shift => ({ ...shift })) });
      setShiftDraft({ date: localDateKey(), workers: 1, hours: 8, quantity: 0, revenue: 0, cost: 0, notes: "" });
    }
  }, [activeId, objects]);
  const totalQuantity = draft.shifts.reduce((sum, shift) => sum + shift.quantity, 0);
  const totalHours = draft.shifts.reduce((sum, shift) => sum + shift.workers * shift.hours, 0);
  const actualRevenue = draft.shifts.reduce((sum, shift) => sum + shift.revenue, 0);
  const actualCost = draft.shifts.reduce((sum, shift) => sum + shift.cost, 0);
  const profit = actualRevenue - actualCost;
  const margin = actualRevenue > 0 ? profit / actualRevenue * 100 : 0;
  const productivity = totalHours > 0 ? totalQuantity / totalHours : 0;
  const save = () => {
    if (!draft.name.trim()) { alert("Укажите название объекта."); return; }
    if (!Number.isFinite(draft.plannedRevenue) || draft.plannedRevenue < 0) { alert("Проверьте бюджет объекта."); return; }
    onSave({ ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() });
    setActiveId(draft.id);
  };
  const addShift = () => {
    if (!shiftDraft.date || shiftDraft.workers <= 0 || shiftDraft.hours <= 0) { alert("Укажите дату смены, количество работников и часы."); return; }
    const shift: ShiftReport = { ...shiftDraft, id: makeId(), notes: shiftDraft.notes.trim() };
    setDraft(previous => ({ ...previous, shifts: [shift, ...previous.shifts].slice(0, 1000) }));
    setShiftDraft({ date: localDateKey(), workers: 1, hours: 8, quantity: 0, revenue: 0, cost: 0, notes: "" });
  };
  const formatDate = (value: string) => {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };
  const newObject = () => { setDraft(createBlankObject()); setActiveId("new"); setShiftDraft({ date: localDateKey(), workers: 1, hours: 8, quantity: 0, revenue: 0, cost: 0, notes: "" }); };
  return <div className="standard-page objects-page">
    <PageHeader eyebrow="ПРОИЗВОДСТВО И КОНТРОЛЬ" title="Объекты и смены" description="Ведите активные объекты, фиксируйте ежедневный выпуск и сравнивайте фактическую производительность, выручку и затраты." action={<button className="button button-primary" onClick={newObject}><Plus size={16}/> Новый объект</button>}/>
    <div className="objects-layout">
      <aside className="panel objects-list-panel"><div className="panel-heading"><div><h3>Объекты</h3><p>{objects.length} всего</p></div><ClipboardList size={18}/></div>
        {objects.length ? <div className="object-list">{objects.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => <button key={item.id} className={activeId === item.id ? "object-list-item active" : "object-list-item"} onClick={() => setActiveId(item.id)}><span className="object-list-mark"><Building2 size={15}/></span><span><b>{item.name}</b><small>{item.customer || item.address || "Заказчик не указан"}</small><small>{item.status} · {item.shifts.length} смен</small></span></button>)}</div> : <div className="estimate-empty">Активных объектов пока нет. Создайте объект или начните с сохранённой сметы.</div>}
      </aside>
      <section className="object-workspace">
        <div className="panel object-details-panel">
          <div className="estimate-editor-top"><div><span className="eyebrow">ПРОИЗВОДСТВЕННАЯ КАРТОЧКА</span><h2>{activeId === "new" ? "Новый объект" : draft.name}</h2></div><select aria-label="Статус объекта" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as ProjectObject["status"] }))}><option>Подготовка</option><option>В работе</option><option>Приостановлен</option><option>Завершён</option></select></div>
          <div className="object-fields">
            <label className="field"><span>Название объекта *</span><input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} placeholder="Демонтаж офисного этажа"/></label>
            <label className="field"><span>Заказчик</span><input value={draft.customer} onChange={e => setDraft(p => ({ ...p, customer: e.target.value }))} placeholder="Компания / контакт"/></label>
            <label className="field"><span>Адрес объекта</span><input value={draft.address} onChange={e => setDraft(p => ({ ...p, address: e.target.value }))} placeholder="Москва, улица, дом"/></label>
            <label className="field"><span>Смета-основание</span><select value={draft.estimateId} onChange={e => { const estimate = estimates.find(item => item.id === e.target.value); setDraft(p => ({ ...p, estimateId: e.target.value, customer: p.customer || estimate?.customer || "", name: p.name === "Новый объект" ? estimate?.title || p.name : p.name, plannedRevenue: estimate ? estimate.items.reduce((sum,line) => sum + line.quantity * line.price, 0) : p.plannedRevenue })); }}><option value="">Не привязана</option>{estimates.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="field"><span>Плановая выручка, ₽</span><input type="number" min="0" step="0.01" value={draft.plannedRevenue} onChange={e => setDraft(p => ({ ...p, plannedRevenue: Number(e.target.value) }))}/></label>
            <label className="field"><span>Дата начала</span><input type="date" value={draft.startDate} onChange={e => setDraft(p => ({ ...p, startDate: e.target.value }))}/></label>
            <label className="field"><span>Плановое завершение</span><input type="date" value={draft.endDate} onChange={e => setDraft(p => ({ ...p, endDate: e.target.value }))}/></label>
            <label className="field"><span>Примечания</span><input value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Доступ, лифт, вывоз, ограничения"/></label>
          </div>
        </div>
        <div className="object-metrics">
          <div className="object-metric"><span>Выполнено</span><strong>{totalQuantity.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</strong><small>единиц по сменным отчётам</small></div>
          <div className="object-metric"><span>Выработка</span><strong>{productivity.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</strong><small>ед. на человеко-час</small></div>
          <div className="object-metric"><span>Фактическая выручка</span><strong>{money(actualRevenue)}</strong><small>сумма по сменам</small></div>
          <div className={profit < 0 ? "object-metric negative" : "object-metric positive"}><span>Прибыль по отчётам</span><strong>{money(profit)}</strong><small>{actualRevenue > 0 ? `Маржа ${margin.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%` : "Введите выручку и затраты смен"}</small></div>
        </div>
        {draft.plannedRevenue > 0 && <div className="object-budget"><div><span>Плановая выручка</span><b>{money(draft.plannedRevenue)}</b></div><div><span>Выручка в отчётах</span><b>{money(actualRevenue)}</b></div><div><span>Отклонение от плана</span><b className={actualRevenue > draft.plannedRevenue ? "budget-over" : ""}>{money(draft.plannedRevenue - actualRevenue)}</b></div></div>}
        <div className="panel shift-entry-panel"><div className="panel-heading"><div><h3>Сменный отчёт</h3><p>Запишите людей, часы, объём, выручку и затраты за смену</p></div><CalendarClock size={18}/></div>
          <div className="shift-fields">
            <label className="field"><span>Дата смены</span><input type="date" value={shiftDraft.date} onChange={e => setShiftDraft(p => ({ ...p, date: e.target.value }))}/></label>
            <label className="field"><span>Работников</span><input type="number" min="1" max="10000" value={shiftDraft.workers} onChange={e => setShiftDraft(p => ({ ...p, workers: Number(e.target.value) }))}/></label>
            <label className="field"><span>Часов на человека</span><input type="number" min="0.1" max="744" step="0.5" value={shiftDraft.hours} onChange={e => setShiftDraft(p => ({ ...p, hours: Number(e.target.value) }))}/></label>
            <label className="field"><span>Объём за смену</span><input type="number" min="0" step="0.01" value={shiftDraft.quantity} onChange={e => setShiftDraft(p => ({ ...p, quantity: Number(e.target.value) }))}/></label>
            <label className="field"><span>Выручка, ₽</span><input type="number" min="0" step="0.01" value={shiftDraft.revenue} onChange={e => setShiftDraft(p => ({ ...p, revenue: Number(e.target.value) }))}/></label>
            <label className="field"><span>Затраты, ₽</span><input type="number" min="0" step="0.01" value={shiftDraft.cost} onChange={e => setShiftDraft(p => ({ ...p, cost: Number(e.target.value) }))}/></label>
            <label className="field shift-notes-field"><span>Комментарий к смене</span><input value={shiftDraft.notes} onChange={e => setShiftDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Условия, ручной вынос, армирование, простой…"/></label>
            <button className="button button-secondary shift-add-button" onClick={addShift}><Plus size={14}/> Добавить смену</button>
          </div>
          <div className="shift-table-heading"><b>История смен</b><span>{draft.shifts.length} отчётов · {totalHours.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} человеко-часов</span></div>
          {draft.shifts.length ? <div className="shift-table-scroll"><table className="shift-table"><thead><tr><th>Дата</th><th>Люди × часы</th><th>Объём</th><th>Выработка</th><th>Выручка</th><th>Затраты</th><th>Комментарий</th><th></th></tr></thead><tbody>{draft.shifts.map(shift => <tr key={shift.id}><td>{formatDate(shift.date)}</td><td>{shift.workers} × {shift.hours}</td><td>{shift.quantity.toLocaleString("ru-RU")}</td><td>{(shift.workers * shift.hours > 0 ? shift.quantity / (shift.workers * shift.hours) : 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</td><td>{money(shift.revenue)}</td><td>{money(shift.cost)}</td><td>{shift.notes || "—"}</td><td><button className="icon-button danger-hover" title="Удалить смену" onClick={() => setDraft(p => ({ ...p, shifts: p.shifts.filter(item => item.id !== shift.id) }))}><X size={14}/></button></td></tr>)}</tbody></table></div> : <div className="estimate-empty">После добавления смены здесь появится история и расчёт фактической выработки.</div>}
        </div>
        <div className="object-actions"><span><ShieldCheck size={14}/> Объект и сменные отчёты сохраняются локально</span><div>{activeId !== "new" && <button className="button button-danger" onClick={() => { onDelete(draft.id); newObject(); }}><Trash2 size={14}/> Удалить объект</button>}<button className="button button-primary" onClick={save}><Check size={15}/> Сохранить объект</button></div></div>
      </section>
    </div>
  </div>;
}

const createBlankDocument = (sequence: number): BusinessDocument => {
  const now = new Date();
  const date = localDateKey(now);
  const validUntil = localDateKey(new Date(now.getTime() + 7 * 86400000));
  return {
    id: makeId(), number: `КП-${now.getFullYear()}-${String(sequence).padStart(4, "0")}`,
    title: "Коммерческое предложение", template: "premium", customer: "", supplier: "Исполнитель",
    object: "", date, validUntil, terms: "Стоимость рассчитана по указанным объёмам. Окончательные сроки и условия оплаты согласуются сторонами.",
    notes: "", status: "Черновик", items: [], estimateId: "", createdAt: now.toISOString(), updatedAt: now.toISOString()
  };
};

function DocumentsPage({ estimates, documents, onSave, onDelete }: { estimates: Estimate[]; documents: BusinessDocument[]; onSave: (item: BusinessDocument) => void; onDelete: (id: string) => void }) {
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<BusinessDocument>(() => createBlankDocument(1));
  const [estimateChoice, setEstimateChoice] = useState("");
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
  const revenue = draft.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  useEffect(() => {
    if (activeId === "new") return;
    const current = documents.find(item => item.id === activeId);
    if (current) setDraft({ ...current, items: current.items.map(line => ({ ...line })) });
  }, [activeId, documents]);
  const newDocument = () => { setDraft(createBlankDocument(documents.length + 1)); setActiveId("new"); };
  const createFromEstimate = () => {
    const estimate = estimates.find(item => item.id === estimateChoice);
    if (!estimate) { alert("Сначала выберите сохранённую смету."); return; }
    const base = createBlankDocument(documents.length + 1);
    const document: BusinessDocument = {
      ...base, title: `Коммерческое предложение — ${estimate.title}`,
      customer: estimate.customer, object: estimate.object, notes: estimate.notes,
      items: estimate.items.map(line => ({ ...line, id: makeId() })), estimateId: estimate.id
    };
    setDraft(document);
    setActiveId("new");
  };
  const save = () => {
    if (!draft.title.trim() || !draft.number.trim()) { alert("Укажите название и номер документа."); return; }
    if (!draft.items.length) { alert("Добавьте смету или заполните документ позициями. Пустое КП сохранять нельзя."); return; }
    const item = { ...draft, title: draft.title.trim(), number: draft.number.trim(), updatedAt: new Date().toISOString() };
    onSave(item);
    setActiveId(item.id);
  };
  const formattedDate = (value: string) => {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
  };
  return <div className="standard-page documents-page">
    <PageHeader eyebrow="КОММЕРЧЕСКИЕ ДОКУМЕНТЫ" title="Документы и КП" description="Формируйте коммерческие предложения из сохранённых смет, выбирайте фирменный стиль и печатайте документ или сохраняйте его в PDF." action={<button className="button button-primary" onClick={newDocument}><Plus size={16}/> Новый документ</button>}/>
    <div className="documents-layout">
      <aside className="panel documents-list-panel"><div className="panel-heading"><div><h3>Мои документы</h3><p>{documents.length} сохранено локально</p></div><FileText size={18}/></div>
        {estimates.length > 0 && <div className="from-estimate"><label className="field"><span>Создать КП из сметы</span><select value={estimateChoice} onChange={e => setEstimateChoice(e.target.value)}><option value="">Выберите смету…</option>{estimates.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="button button-secondary full-button" onClick={createFromEstimate}><FileText size={14}/> Сформировать КП</button></div>}
        {documents.length ? <div className="document-list">{documents.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => <button key={item.id} className={activeId === item.id ? "document-list-item active" : "document-list-item"} onClick={() => setActiveId(item.id)}><span className="document-list-icon"><FileText size={15}/></span><span><b>{item.title}</b><small>{item.number} · {item.customer || "Без заказчика"}</small><small>{item.status}</small></span></button>)}</div> : <div className="estimate-empty">Документов пока нет. Выберите сохранённую смету или создайте документ вручную.</div>}
      </aside>
      <section className="document-workspace">
        <div className="panel document-editor">
          <div className="estimate-editor-top"><div><span className="eyebrow">НАСТРОЙКИ ДОКУМЕНТА</span><h2>{activeId === "new" ? "Новый документ" : draft.number}</h2></div><select aria-label="Статус документа" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as BusinessDocument["status"] }))}><option>Черновик</option><option>Подготовлен</option><option>Отправлен</option><option>Согласован</option></select></div>
          <div className="document-fields">
            <label className="field"><span>Название документа *</span><input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}/></label>
            <label className="field"><span>Номер КП *</span><input value={draft.number} onChange={e => setDraft(p => ({ ...p, number: e.target.value }))}/></label>
            <label className="field"><span>Заказчик</span><input value={draft.customer} onChange={e => setDraft(p => ({ ...p, customer: e.target.value }))} placeholder="Название компании"/></label>
            <label className="field"><span>Исполнитель</span><input value={draft.supplier} onChange={e => setDraft(p => ({ ...p, supplier: e.target.value }))} placeholder="Название / ИП"/></label>
            <label className="field"><span>Объект</span><input value={draft.object} onChange={e => setDraft(p => ({ ...p, object: e.target.value }))} placeholder="Адрес или название объекта"/></label>
            <label className="field"><span>Дата документа</span><input type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}/></label>
            <label className="field"><span>Предложение действительно до</span><input type="date" value={draft.validUntil} onChange={e => setDraft(p => ({ ...p, validUntil: e.target.value }))}/></label>
            <label className="field"><span>Дизайн шаблона</span><select value={draft.template} onChange={e => setDraft(p => ({ ...p, template: e.target.value as BusinessDocument["template"] }))}><option value="premium">NEXUS — премиальный</option><option value="classic">Классический деловой</option><option value="minimal">Минимализм</option></select></label>
            <label className="field full"><span>Условия и комментарии</span><textarea rows={2} value={draft.terms} onChange={e => setDraft(p => ({ ...p, terms: e.target.value }))}/></label>
          </div>
          <div className="document-editor-actions"><button className="button button-secondary" onClick={() => window.print()}><Printer size={15}/> Печать / сохранить PDF</button><div>{activeId !== "new" && <button className="button button-danger" onClick={() => { onDelete(draft.id); newDocument(); }}><Trash2 size={14}/> Удалить</button>}<button className="button button-primary" onClick={save}><Check size={15}/> Сохранить документ</button></div></div>
        </div>
        <div className={`print-document quote-template-${draft.template}`}>
          <div className="quote-document-brand"><div className="quote-brand-mark">N</div><div><b>{draft.supplier || "Исполнитель"}</b><small>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</small></div><span className="quote-doc-number">{draft.number}</span></div>
          <div className="quote-document-heading"><span>{draft.number} · {formattedDate(draft.date)}</span><h1>{draft.title}</h1><p>Подготовлено для: <b>{draft.customer || "Заказчик"}</b></p>{draft.object && <p>Объект: {draft.object}</p>}</div>
          <table className="quote-document-table"><thead><tr><th>№</th><th>Наименование работ</th><th>Ед.</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>{draft.items.map((line,index) => <tr key={line.id}><td>{index+1}</td><td>{line.name}</td><td>{line.unit}</td><td>{line.quantity.toLocaleString("ru-RU")}</td><td>{money(line.price)}</td><td>{money(line.quantity * line.price)}</td></tr>)}</tbody></table>
          <div className="quote-document-total"><span>Итого по предложению</span><strong>{money(revenue)}</strong></div>
          <div className="quote-document-terms"><h3>Условия предложения</h3><p>{draft.terms}</p>{draft.validUntil && <p>Предложение действительно до {formattedDate(draft.validUntil)}.</p>}</div>
          {draft.notes && <div className="quote-document-notes"><b>Примечание к расчёту</b><p>{draft.notes}</p></div>}
          <div className="quote-document-signatures"><div><span>Исполнитель</span><b>{draft.supplier || "________________"}</b><i>Подпись / печать</i></div><div><span>Заказчик</span><b>{draft.customer || "________________"}</b><i>Подпись</i></div></div>
          <footer>Документ подготовлен в NEXUS Business Browser · {draft.number}</footer>
        </div>
      </section>
    </div>
  </div>;
}

const createBlankEstimate = (): Estimate => {
  const now = new Date().toISOString();
  return {
    id: makeId(), title: "Новая смета", customer: "", object: "", status: "Черновик", notes: "",
    items: [{ id: makeId(), name: "Демонтаж стен", unit: "м²", quantity: 1, price: 0, cost: 0 }],
    createdAt: now, updatedAt: now
  };
};

function EstimatesPage({ estimates, onSave, onDelete }: { estimates: Estimate[]; onSave: (item: Estimate) => void; onDelete: (id: string) => void }) {
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<Estimate>(() => createBlankEstimate());
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
  useEffect(() => {
    if (activeId === "new") return;
    const current = estimates.find(item => item.id === activeId);
    if (current) setDraft({ ...current, items: current.items.map(line => ({ ...line })) });
  }, [activeId, estimates]);
  const revenue = draft.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const cost = draft.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? profit / revenue * 100 : 0;
  const updateLine = (id: string, patch: Partial<EstimateLine>) => setDraft(previous => ({ ...previous, items: previous.items.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const save = () => {
    if (!draft.title.trim()) { alert("Укажите название сметы"); return; }
    if (!draft.items.length) { alert("Добавьте хотя бы одну позицию"); return; }
    if (draft.items.some(item => !item.name.trim() || !Number.isFinite(item.quantity) || !Number.isFinite(item.price) || !Number.isFinite(item.cost) || item.quantity < 0 || item.price < 0 || item.cost < 0)) {
      alert("Проверьте названия позиций, объёмы, цены и себестоимость.");
      return;
    }
    const item = { ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() };
    onSave(item);
    setActiveId(item.id);
  };
  return <div className="standard-page estimates-page">
    <PageHeader eyebrow="РАСЧЁТЫ И ЭКОНОМИКА" title="Сметы и прибыль" description="Рассчитывайте цену заказчику, прямые затраты и маржинальность по каждой позиции. Все расчёты сохраняются локально." action={<button className="button button-primary" onClick={() => { setDraft(createBlankEstimate()); setActiveId("new"); }}><Plus size={16}/> Новая смета</button>}/>
    <div className="estimates-layout">
      <aside className="panel estimates-list-panel"><div className="panel-heading"><div><h3>Сохранённые сметы</h3><p>{estimates.length} документов</p></div><Calculator size={18}/></div>
        {estimates.length ? <div className="estimate-list">{estimates.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => <button key={item.id} className={activeId === item.id ? "estimate-list-item active" : "estimate-list-item"} onClick={() => setActiveId(item.id)}><span className="estimate-list-icon"><Calculator size={15}/></span><span className="estimate-list-copy"><b>{item.title}</b><small>{item.customer || item.object || "Без заказчика"}</small><small>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.updatedAt))}</small></span><strong>{money(item.items.reduce((sum,line) => sum + line.quantity * line.price, 0))}</strong></button>)}</div> : <div className="estimate-empty">Сохранённых смет пока нет. Создайте первую — она появится в этом списке.</div>}
      </aside>
      <section className="estimate-editor">
        <div className="panel estimate-details-panel">
          <div className="estimate-editor-top"><div><span className="eyebrow">РАБОЧИЙ ДОКУМЕНТ</span><h2>{activeId === "new" ? "Новая смета" : "Редактирование сметы"}</h2></div><select aria-label="Статус сметы" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as Estimate["status"] }))}><option>Черновик</option><option>КП подготовлено</option><option>Согласовано</option></select></div>
          <div className="estimate-meta-grid">
            <label className="field"><span>Название сметы *</span><input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="Демонтаж офиса — этап 1"/></label>
            <label className="field"><span>Заказчик</span><input value={draft.customer} onChange={e => setDraft(p => ({ ...p, customer: e.target.value }))} placeholder="Компания или контакт"/></label>
            <label className="field"><span>Объект</span><input value={draft.object} onChange={e => setDraft(p => ({ ...p, object: e.target.value }))} placeholder="Адрес / название объекта"/></label>
            <label className="field"><span>Комментарий</span><input value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Условия, вывоз, ограничения"/></label>
          </div>
        </div>
        <div className="panel estimate-lines-panel"><div className="panel-heading"><div><h3>Позиции расчёта</h3><p>Цена и себестоимость задаются за единицу измерения</p></div><button className="button button-secondary" onClick={() => setDraft(p => ({ ...p, items: [...p.items, { id: makeId(), name: "", unit: "м²", quantity: 0, price: 0, cost: 0 }] }))}><Plus size={14}/> Добавить позицию</button></div>
          <div className="estimate-lines-scroll"><table className="estimate-lines-table"><thead><tr><th>Работа / материал</th><th>Ед.</th><th>Объём</th><th>Цена за ед.</th><th>Затраты за ед.</th><th>Сумма</th><th></th></tr></thead><tbody>{draft.items.map(line => <tr key={line.id}><td><input aria-label="Название позиции" value={line.name} onChange={e => updateLine(line.id, { name: e.target.value })} placeholder="Например, снятие стяжки"/></td><td><input aria-label="Единица измерения" value={line.unit} onChange={e => updateLine(line.id, { unit: e.target.value })} placeholder="м²"/></td><td><input aria-label="Объём" type="number" min="0" step="0.01" value={line.quantity} onChange={e => updateLine(line.id, { quantity: Number(e.target.value) })}/></td><td><input aria-label="Цена за единицу" type="number" min="0" step="0.01" value={line.price} onChange={e => updateLine(line.id, { price: Number(e.target.value) })}/></td><td><input aria-label="Себестоимость за единицу" type="number" min="0" step="0.01" value={line.cost} onChange={e => updateLine(line.id, { cost: Number(e.target.value) })}/></td><td className="estimate-line-total">{money(line.quantity * line.price)}</td><td><button className="icon-button danger-hover" title="Удалить позицию" disabled={draft.items.length === 1} onClick={() => setDraft(p => ({ ...p, items: p.items.filter(item => item.id !== line.id) }))}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>
        </div>
        <div className="estimate-summary-grid">
          <div className="estimate-total-card"><span>Цена заказчику</span><strong>{money(revenue)}</strong><small>Сумма всех позиций</small></div>
          <div className="estimate-total-card"><span>Прямые затраты</span><strong>{money(cost)}</strong><small>Себестоимость работ</small></div>
          <div className={profit < 0 ? "estimate-total-card negative" : "estimate-total-card positive"}><span>Валовая прибыль</span><strong>{money(profit)}</strong><small>Без учёта налогов и накладных расходов</small></div>
          <div className={margin < 15 ? "estimate-total-card negative" : "estimate-total-card positive"}><span>Маржинальность</span><strong>{margin.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%</strong><small>{revenue === 0 ? "Введите цену для расчёта" : margin < 15 ? "Низкая маржа — проверьте цену и затраты" : "Расчётная маржа по прямым затратам"}</small></div>
        </div>
        <div className="estimate-editor-actions"><span><ShieldCheck size={14}/> Локальное сохранение · Без учёта налогов и накладных расходов</span><div>{activeId !== "new" && <button className="button button-danger" onClick={() => { onDelete(draft.id); setDraft(createBlankEstimate()); setActiveId("new"); }}><Trash2 size={14}/> Удалить</button>}<button className="button button-primary" onClick={save}><Check size={15}/> Сохранить смету</button></div></div>
      </section>
    </div>
  </div>;
}

function StatusBadge({ status }: { status: Prospect["status"] }) {
  const className = status === "Приоритет" ? "priority" : status === "В работе" ? "in-progress" : status === "Не подходит" ? "rejected" : "new";
  return <span className={`status-badge ${className}`}><span/>{status}</span>;
}

function SavedPage({ bookmarks, prospects, onOpen, onSection, onRemoveBookmark }: { bookmarks: BookmarkItem[]; prospects: Prospect[]; onOpen: (url: string) => void; onSection: (s: Section) => void; onRemoveBookmark: (id: string) => void }) {
  const savedCompanies = prospects.filter(p => p.website);
  return <div className="standard-page"><PageHeader eyebrow="БЫСТРЫЙ ДОСТУП" title="Закладки и сайты" description="Сохранённые страницы браузера и сайты компаний из вашей базы."/>
    <div className="subsection-heading"><div><h2>Закладки браузера</h2><p>Сайты, которые вы сохранили вручную</p></div></div>
    {bookmarks.length ? <div className="saved-grid">{bookmarks.map(item => <div className="saved-card" key={item.id}><button className="saved-card-open" onClick={() => onOpen(item.url)}><span className="saved-card-icon"><Bookmark size={20}/></span><b>{item.title || shortHost(item.url)}</b><span>{shortHost(item.url)}</span></button><button className="saved-remove" title="Удалить закладку" onClick={() => onRemoveBookmark(item.id)}><X size={14}/></button><ExternalLink size={15} className="saved-external"/></div>)}</div> : <div className="panel inline-empty"><Bookmark size={17}/><span>Пока нет закладок. Откройте сайт и нажмите на звёздочку в панели браузера.</span></div>}
    <div className="subsection-heading subsection-spaced"><div><h2>Сайты компаний</h2><p>Адреса из клиентской базы</p></div><button className="text-button" onClick={() => onSection("prospects")}>Открыть базу <ArrowRight size={14}/></button></div>
    {savedCompanies.length ? <div className="saved-grid">{savedCompanies.map(p => <button className="saved-card" key={p.id} onClick={() => onOpen(p.website)}><span className="saved-card-icon"><Globe2 size={20}/></span><b>{p.company}</b><span>{shortHost(p.website)}</span><ExternalLink size={15} className="saved-external"/></button>)}</div> : <div className="panel inline-empty"><Building2 size={17}/><span>Сохранённые сайты компаний появятся здесь после добавления адреса в карточку.</span></div>}
  </div>;
}

function HistoryPage({ history, onOpen, onClear }: { history: HistoryItem[]; onOpen: (url: string) => void; onClear: () => void }) {
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  };
  return <div className="standard-page"><PageHeader eyebrow="ВАШИ ПОСЕЩЕНИЯ" title="История браузера" description="Недавно открытые страницы хранятся локально на этом устройстве." action={<button className="button button-secondary" disabled={!history.length} onClick={onClear}><Trash2 size={15}/> Очистить историю</button>}/>
    <div className="panel history-panel">{history.length ? history.map(item => <div className="history-item" key={item.id}><div className="history-favicon"><Globe2 size={16}/></div><button className="history-link" onClick={() => onOpen(item.url)}><b>{item.title || shortHost(item.url)}</b><span>{item.url}</span></button><time>{formatDate(item.visitedAt)}</time><button className="icon-button" title="Открыть сайт" onClick={() => onOpen(item.url)}><ArrowRight size={15}/></button></div>) : <div className="empty-state"><div className="empty-icon"><HistoryIcon size={23}/></div><h3>История пока пуста</h3><p>Открытые страницы будут появляться здесь автоматически.</p></div>}</div>
  </div>;
}

function SettingsPage({ version, storageBusy, onBackup, onRestore }: {
  version: string; storageBusy: boolean; onBackup: () => void; onRestore: () => void;
}) {
  return <div className="standard-page"><PageHeader eyebrow="ПЕРСОНАЛИЗАЦИЯ" title="Настройки" description="Параметры приложения и хранения данных."/>
    <div className="settings-grid"><section className="panel settings-card"><div className="settings-card-icon"><ShieldCheck size={20}/></div><div><h3>Приватность и данные</h3><p>Компании, закладки и история хранятся локально в SQLite в профиле приложения. Передача данных в облако сейчас не используется.</p><span className="setting-status"><span className="status-light"/> Локальное хранение включено</span></div></section>
    <section className="panel settings-card"><div className="settings-card-icon"><Command size={20}/></div><div><h3>Версия приложения</h3><p>NEXUS Business Browser — ранняя разработка. Функции будут добавляться поэтапно.</p><span className="version-pill">Версия {version}</span></div></section>
    <section className="panel settings-card"><div className="settings-card-icon"><Sparkles size={20}/></div><div><h3>Провайдер ИИ</h3><p>Подключение ИИ для анализа страниц появится отдельным модулем. Ключи API не нужно вводить в этой версии.</p><span className="soon-label">Запланировано</span></div></section>
    <section className="panel settings-card"><div className="settings-card-icon"><Download size={20}/></div><div><h3>Резервное копирование</h3><p>Создавайте проверенную резервную копию базы SQLite или восстанавливайте данные из ранее созданной копии. Перед восстановлением приложение автоматически создаёт страховочную копию текущей базы.</p><div className="settings-actions"><button className="primary-button" disabled={storageBusy} onClick={onBackup}>{storageBusy ? "Выполняется…" : "Создать копию"}</button><button className="secondary-button" disabled={storageBusy} onClick={onRestore}>Восстановить из копии</button></div></div></section></div>
  </div>;
}

export default App;
