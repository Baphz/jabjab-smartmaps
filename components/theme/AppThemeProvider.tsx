"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { App as AntdApp, ConfigProvider } from "antd";
import { getAntdThemeConfig, type AppThemeMode } from "@/lib/theme-config";

const STORAGE_KEY = "smartmaps-theme-mode";

type AppThemeContextValue = {
  mode: AppThemeMode;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function getInitialThemeMode(): AppThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>(() => getInitialThemeMode());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", mode === "dark");
    root.classList.toggle("theme-light", mode === "light");
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  const themeConfig = useMemo(() => getAntdThemeConfig(mode), [mode]);

  return (
    <AppThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig} componentSize="small">
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
}
