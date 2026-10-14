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
      listProspects(): Promise<unknown[]>;
      saveProspects(records: unknown[]): Promise<boolean>;
      getVersion(): Promise<string>;
      onTitle(callback: (data: { id: string; title: string }) => void): () => void;
      onNavigate(callback: (data: { id: string; url: string }) => void): () => void;
      onError(callback: (data: { id: string; code: number; description: string; url: string }) => void): () => void;
    };
  }
}