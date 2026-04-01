"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface AddItem {
  label: string;
  icon: LucideIcon;
}

export interface AddConfig {
  items: AddItem[];
  onAdd: (label: string) => void;
}

export interface SaveConfig {
  onSave: () => void;
  saving?: boolean;
}

export interface DocPropertyItem {
  label: string;
  icon: LucideIcon;
  onAction: () => void;
}

export interface DocConfig {
  items: DocPropertyItem[];
}

export interface ConnectConfig {
  onConnect: () => void;
}

interface SideMenuAddContextValue {
  addConfig: AddConfig | null;
  setAddConfig: (config: AddConfig | null) => void;
  saveConfig: SaveConfig | null;
  setSaveConfig: (config: SaveConfig | null) => void;
  docConfig: DocConfig | null;
  setDocConfig: (config: DocConfig | null) => void;
  connectConfig: ConnectConfig | null;
  setConnectConfig: (config: ConnectConfig | null) => void;
}

const SideMenuAddContext = createContext<SideMenuAddContextValue>({
  addConfig: null,
  setAddConfig: () => {},
  saveConfig: null,
  setSaveConfig: () => {},
  docConfig: null,
  setDocConfig: () => {},
  connectConfig: null,
  setConnectConfig: () => {},
});

export function SideMenuAddProvider({ children }: { children: ReactNode }) {
  const [addConfig, setAddConfig] = useState<AddConfig | null>(null);
  const [saveConfig, setSaveConfig] = useState<SaveConfig | null>(null);
  const [docConfig, setDocConfig] = useState<DocConfig | null>(null);
  const [connectConfig, setConnectConfig] = useState<ConnectConfig | null>(null);
  return (
    <SideMenuAddContext.Provider value={{ addConfig, setAddConfig, saveConfig, setSaveConfig, docConfig, setDocConfig, connectConfig, setConnectConfig }}>
      {children}
    </SideMenuAddContext.Provider>
  );
}

export function useSideMenuAdd() {
  return useContext(SideMenuAddContext);
}
