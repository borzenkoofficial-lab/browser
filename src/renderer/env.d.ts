export {};
declare global {
  interface Window {
    nexus: {
      createTab(id: string, url?: string): Promise<void>;
      navigate(id: string, url: string): Promise<void>;
      back(id: string): Promise<void>;
      forward(id: string): Promise<void>;
      reload(id: string): Promise<void>;
      setBounds(id: string, bounds: { x: number; y: number; width: number; height: number } | null): Promise<void>;
      closeTab(id: string): Promise<void>;
      getTabState(id: string): Promise<{ url: string; title: string; loading: boolean } | null>;
      extractPage(id: string): Promise<{ url: string; title: string; description: string; text: string; headings: string[]; formFields: Array<{ label: string; value: string; type: string }>; links: Array<{ text: string; url: string }>; tables: string[] }>;
      listProspects(): Promise<unknown[]>;
      saveProspects(records: unknown[]): Promise<boolean>;
      listBookmarks(): Promise<unknown[]>;
      saveBookmarks(records: unknown[]): Promise<boolean>;
      listHistory(): Promise<unknown[]>;
      saveHistory(records: unknown[]): Promise<boolean>;
      listEstimates(): Promise<unknown[]>;
      saveEstimates(records: unknown[]): Promise<boolean>;
      listDocuments(): Promise<unknown[]>;
      saveDocuments(records: unknown[]): Promise<boolean>;
      listObjects(): Promise<unknown[]>;
      saveObjects(records: unknown[]): Promise<boolean>;
      listFinance(): Promise<unknown[]>;
      saveFinance(records: unknown[]): Promise<boolean>;
      listSuppliers(): Promise<unknown[]>;
      saveSuppliers(records: unknown[]): Promise<boolean>;
      createBackup(): Promise<{ cancelled: boolean; path?: string; integrity?: string }>;
      restoreBackup(): Promise<{ cancelled: boolean; restored?: boolean; safetyBackupPath?: string }>;
      getVersion(): Promise<string>;
      onTitle(callback: (data: { id: string; title: string }) => void): () => void;
      onNavigate(callback: (data: { id: string; url: string }) => void): () => void;
      onError(callback: (data: { id: string; code: number; description: string; url: string }) => void): () => void;
    };
  }
}