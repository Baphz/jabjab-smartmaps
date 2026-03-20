"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { App as AntdApp, ConfigProvider } from "antd";
import { getAntdThemeConfig, type AppThemeMode } from "@/lib/theme-config";

const STORAGE_KEY = "smartmaps-theme-mode";
const THEME_CHANGE_EVENT = "smartmaps-theme-change";

type AppThemeContextValue = {
  mode: AppThemeMode;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function getPreferredThemeMode(): AppThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerThemeMode(): AppThemeMode {
  return "light";
}

function subscribeThemeChange(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleThemeEvent = () => callback();
  const handleMediaChange = () => {
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
  mediaQuery.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribeThemeChange,
    getPreferredThemeMode,
    getServerThemeMode
  );

  const setMode = useCallback((nextMode: AppThemeMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", mode === "dark");
    root.classList.toggle("theme-light", mode === "light");
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode(mode === "dark" ? "light" : "dark"),
    }),
    [mode, setMode]
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
